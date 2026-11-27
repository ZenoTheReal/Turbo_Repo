import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Database } from '../database/database.js';
import { Store } from '../../stores/schema/store.entity.js';
import { PlatformSettings } from '../../settings/schema/platform-settings.entity.js';
import { CryptoUtil } from '../../common/utils/crypto.util.js';

// PostgreSQL unique lock identifier for distributed startup locking across instances
const STRIPE_INIT_ADVISORY_LOCK_NAME = 'omnistore_stripe_webhook_init';

@Injectable()
export class StripeService implements OnModuleInit {
  private readonly logger = new Logger(StripeService.name);
  public readonly client: Stripe;
  private webhookSecret: string = '';
  private readonly storeRepository: Repository<Store>;
  private readonly platformSettingsRepository: Repository<PlatformSettings>;

  constructor(
    private readonly configService: ConfigService,
    private readonly database: Database,
  ) {
    this.storeRepository = this.database.dataSource.getRepository(Store);
    this.platformSettingsRepository = this.database.dataSource.getRepository(PlatformSettings);

    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY is not defined in environment variables.');
    }

    this.client = new Stripe(secretKey, {
      apiVersion: '2025-01-27.acacia' as any,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.syncPlatformStripeDefaults();
    await this.initializeStripeWebhook();
  }

  /**
   * Populates unset Stripe platform metadata (account ID, publishable key, enabled flag)
   * into the PlatformSettings singleton row on startup without overwriting manual admin changes.
   */
  private async syncPlatformStripeDefaults(): Promise<void> {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) return;

    try {
      let settings = await this.platformSettingsRepository.findOne({ where: { id: 1 } });
      if (!settings) {
        settings = this.platformSettingsRepository.create({
          id: 1,
          platformName: 'OmniStore',
          currency: 'USD',
          commissionRate: 0.0,
          fixedFee: 0.0,
          isStripeEnabled: true,
        });
      }

      let dirty = false;

      const envPubKey = this.configService.get<string>('STRIPE_PUBLISHABLE_KEY');
      if (!settings.stripePublishableKey && envPubKey) {
        settings.stripePublishableKey = envPubKey;
        settings.isStripeEnabled = true;
        dirty = true;
      }

      if (!settings.stripeAccountId) {
        try {
          const platformAccount = await this.client.accounts.retrieveCurrent();
          if (platformAccount?.id) {
            settings.stripeAccountId = platformAccount.id;
            settings.isStripeEnabled = true;
            dirty = true;
          }
        } catch (acctErr: any) {
          this.logger.warn(`Could not auto-fetch platform Stripe account ID: ${acctErr.message}`);
        }
      }

      if (dirty || !settings.updatedAt) {
        await this.platformSettingsRepository.save(settings);
        this.logger.log('Synced platform Stripe metadata defaults to database.');
      }
    } catch (err: any) {
      this.logger.warn(`Failed to sync platform Stripe defaults: ${err.message}`);
    }
  }

  /**
   * Attempts to read and decrypt the Stripe webhook secret from the database.
   * Returns true if successfully loaded and cached in this.webhookSecret.
   */
  private async tryLoadSecretFromDatabase(encryptionKey: string): Promise<boolean> {
    const settings = await this.platformSettingsRepository.findOne({ where: { id: 1 } });
    if (
      settings &&
      settings.stripeWebhookSecretCiphertext &&
      settings.stripeWebhookSecretIv &&
      settings.stripeWebhookSecretTag
    ) {
      try {
        this.webhookSecret = CryptoUtil.decrypt(
          {
            ciphertext: settings.stripeWebhookSecretCiphertext,
            iv: settings.stripeWebhookSecretIv,
            tag: settings.stripeWebhookSecretTag,
          },
          encryptionKey,
        );
        this.logger.log('Stripe webhook secret securely loaded and decrypted from database.');
        return true;
      } catch (err: any) {
        this.logger.error(`Failed to decrypt database webhook secret: ${err.message}`);
      }
    }
    return false;
  }

  /**
   * Encrypts and persists the webhook secret to the PlatformSettings singleton row.
   */
  private async saveEncryptedSecretToDb(
    rawSecret: string,
    endpointId: string | undefined,
    encryptionKey: string,
  ): Promise<void> {
    let settings = await this.platformSettingsRepository.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.platformSettingsRepository.create({ id: 1 });
    }

    const encrypted = CryptoUtil.encrypt(rawSecret, encryptionKey);
    if (endpointId) {
      settings.stripeWebhookEndpointId = endpointId;
    }
    settings.stripeWebhookSecretCiphertext = encrypted.ciphertext;
    settings.stripeWebhookSecretIv = encrypted.iv;
    settings.stripeWebhookSecretTag = encrypted.tag;

    await this.platformSettingsRepository.save(settings);
  }

  /**
   * Non-leader instances poll the database with backoff waiting for the leader instance
   * to complete Stripe webhook provisioning and persist the encrypted secret.
   */
  private async waitForSecretInDatabase(
    encryptionKey: string,
    timeoutMs = 15000,
    intervalMs = 500,
  ): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      const loaded = await this.tryLoadSecretFromDatabase(encryptionKey);
      if (loaded) {
        return true;
      }
    }
    return false;
  }

  /**
   * Initializes and maintains the Stripe Connect webhook across multi-instance clusters.
   *
   * 1. Fast Path: If DB already has the encrypted secret, all instances decrypt it immediately.
   * 2. Cold Start Distributed Lock: Uses PostgreSQL Advisory Locks (`pg_try_advisory_lock`)
   *    so exactly ONE gateway instance acts as the leader to register with Stripe.
   * 3. Follower Instances: Seeing the lock held, wait non-blockingly until the leader commits
   *    the encrypted secret to the DB, then decrypt it.
   */
  private async initializeStripeWebhook(): Promise<void> {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      return;
    }

    const encryptionKey =
      this.configService.get<string>('STRIPE_ENCRYPTION_KEY') ||
      this.configService.get<string>('JWT_SECRET') ||
      'omnistore-fallback-secure-encryption-key-256';

    // Step 1: Fast Path - Already in database?
    if (await this.tryLoadSecretFromDatabase(encryptionKey)) {
      return;
    }

    // Step 2: Check explicit environment variable override
    const envWebhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (envWebhookSecret) {
      this.webhookSecret = envWebhookSecret;
      await this.saveEncryptedSecretToDb(envWebhookSecret, undefined, encryptionKey);
      this.logger.log('Stripe webhook secret from environment encrypted into database.');
      return;
    }

    const backendUrl = this.configService.get<string>('BACKEND_PUBLIC_URL');
    if (!backendUrl || backendUrl.includes('localhost')) {
      this.logger.log(
        'Running in local development. For Stripe webhooks locally, run: stripe listen --forward-to localhost:3002/api/stripe/webhook',
      );
      return;
    }

    // Step 3: Multi-Instance Distributed Concurrency Control via PostgreSQL Advisory Lock
    let hasLock = false;
    try {
      const lockQueryResult = await this.platformSettingsRepository.query(
        'SELECT pg_try_advisory_lock(hashtext($1)) AS acquired',
        [STRIPE_INIT_ADVISORY_LOCK_NAME],
      );
      hasLock = Boolean(lockQueryResult?.[0]?.acquired);
    } catch (lockErr: any) {
      this.logger.warn(`Could not acquire PostgreSQL advisory lock: ${lockErr.message}`);
    }

    if (!hasLock) {
      this.logger.log(
        'Another gateway instance is currently provisioning the Stripe webhook. Waiting for completion...',
      );
      const acquiredFromLeader = await this.waitForSecretInDatabase(encryptionKey);
      if (acquiredFromLeader) {
        this.logger.log('Successfully acquired decrypted Stripe webhook secret from leader instance.');
      } else {
        this.logger.error('Timed out waiting for leader instance to provision Stripe webhook.');
      }
      return;
    }

    // Step 4: Leader Instance Provisions Endpoint
    try {
      // Double-checked locking: check DB again in case previous leader finished just before
      if (await this.tryLoadSecretFromDatabase(encryptionKey)) {
        return;
      }

      const targetUrl = `${backendUrl}/api/stripe/webhook`;
      this.logger.log(`[Leader Instance] Registering Stripe Connect webhook endpoint for ${targetUrl}...`);

      const endpoints = await this.client.webhookEndpoints.list({ limit: 20 });
      const existing = endpoints.data.find(
        (ep) => ep.url === targetUrl && ep.status === 'enabled',
      );

      // Stripe API does not expose secrets for existing endpoints; recreate if orphaned without secret in DB
      if (existing) {
        await this.client.webhookEndpoints.del(existing.id);
        this.logger.log(`Purged orphaned Stripe webhook endpoint without database secret: ${existing.id}`);
      }

      const created = await this.client.webhookEndpoints.create(
        {
          url: targetUrl,
          connect: true, // Listens to all connected seller storefront accounts
          enabled_events: [
            'account.updated',
            'account.application.deauthorized',
            'capability.updated',
            'checkout.session.completed',
            'checkout.session.expired',
            'checkout.session.async_payment_succeeded',
            'checkout.session.async_payment_failed',
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
          ],
          description: 'OmniStore Automated Connect Webhook Endpoint',
        },
        {
          idempotencyKey: `auto_webhook_${Buffer.from(targetUrl).toString('base64').substring(0, 40)}`,
        },
      );

      if (created.secret) {
        this.webhookSecret = created.secret;
        await this.saveEncryptedSecretToDb(created.secret, created.id, encryptionKey);
        this.logger.log(
          `[Leader Instance] Automated Stripe Connect webhook created [${created.id}] and secret encrypted in database.`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Automated Stripe webhook initialization failed: ${err.message}`);
    } finally {
      // Step 5: Always release the advisory lock so subsequent migrations/changes are unblocked
      try {
        await this.platformSettingsRepository.query(
          'SELECT pg_advisory_unlock(hashtext($1))',
          [STRIPE_INIT_ADVISORY_LOCK_NAME],
        );
      } catch (unlockErr: any) {
        this.logger.warn(`Failed to release PostgreSQL advisory lock: ${unlockErr.message}`);
      }
    }
  }

  /**
   * Dynamically resolves the full URL of a storefront, respecting custom domains and subdomains.
   * E.g. in development: http://nike.localhost:3000
   * E.g. in production: https://nike.omnistore.com or https://store.nike.com
   */
  resolveStoreUrl(store: Store): string {
    if (store.customDomain) {
      return store.customDomain.startsWith('http')
        ? store.customDomain
        : `https://${store.customDomain}`;
    }

    const frontendBaseUrl =
      this.configService.get<string>('FRONTEND_STORE_URL') || 'http://localhost:3000';

    try {
      const parsed = new URL(frontendBaseUrl);
      const hostWithSubdomain = `${store.subdomain}.${parsed.host}`;
      return `${parsed.protocol}//${hostWithSubdomain}`;
    } catch {
      return `https://${store.subdomain}.omnistore.com`;
    }
  }

  /**
   * 
   * Provisions a Stripe Express Connect account for a storefront and generates the onboarding link.
   * Utilizes idempotency keys to ensure multiple clicks do not create duplicate accounts.
   */
  async createConnectOnboardingLink(
    store: Store,
    returnUrl?: string,
    refreshUrl?: string,
  ): Promise<string> {
    const storeUrl = this.resolveStoreUrl(store);
    const finalReturnUrl = returnUrl || `${storeUrl}/seller/payouts?status=success`;
    const finalRefreshUrl = refreshUrl || `${storeUrl}/seller/payouts?status=refresh`;

    let accountId = store.stripeAccountId;

    // 1. Create Connect Express Account if not already created
    if (!accountId) {
      const idempotencyKey = `create_connect_acct_${store.id}`;
      try {
        const account = await this.client.accounts.create(
          {
            type: 'express',
            country: store.country || 'US',
            email: store.contactEmail || store.owner?.email,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_profile: {
              name: store.name,
              url: storeUrl,
            },
            metadata: {
              storeId: store.id,
              ownerId: store.ownerId,
            },
          },
          { idempotencyKey },
        );

        accountId = account.id;
        store.stripeAccountId = accountId;
        await this.storeRepository.save(store);
        this.logger.log(`Stripe Connect account created: ${accountId} for store: ${store.name}`);
      } catch (err: any) {
        this.logger.error(`Failed to create Stripe Connect account: ${err.message}`);
        throw new InternalServerErrorException(`Stripe account creation failed: ${err.message}`);
      }
    }

    // 2. Generate Account Link with idempotency key
    try {
      const linkIdempotencyKey = `acct_link_${store.id}_${Date.now()}`;
      const accountLink = await this.client.accountLinks.create(
        {
          account: accountId,
          refresh_url: finalRefreshUrl,
          return_url: finalReturnUrl,
          type: 'account_onboarding',
        },
        { idempotencyKey: linkIdempotencyKey },
      );

      return accountLink.url;
    } catch (err: any) {
      this.logger.error(`Failed to generate Stripe onboarding link: ${err.message}`);
      throw new InternalServerErrorException(`Could not generate onboarding link: ${err.message}`);
    }
  }

  /**
   * Generates a single-sign-on login link to the Stripe Express Dashboard for onboarded sellers.
   */
  async createExpressDashboardLink(stripeAccountId: string): Promise<string> {
    try {
      const loginLink = await this.client.accounts.createLoginLink(stripeAccountId);
      return loginLink.url;
    } catch (err: any) {
      this.logger.error(`Failed to create Stripe login link: ${err.message}`);
      throw new BadRequestException(
        `Could not generate Stripe Express dashboard link: ${err.message}`,
      );
    }
  }

  /**
   * Creates a Stripe Checkout Session for buyer checkout.
   */
  async createCheckoutSession(
    params: Stripe.Checkout.SessionCreateParams,
  ): Promise<Stripe.Checkout.Session> {
    return this.client.checkout.sessions.create(params);
  }

  getClient(): Stripe {
    return this.client;
  }

  /**
   * Validates and constructs raw webhook events from Stripe.
   */
  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret) {
      throw new BadRequestException('Stripe webhook signing secret is not configured or resolved.');
    }
    return this.client.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }

  /**
   * Synchronizes Stripe account capabilities to the Store entity upon account.updated webhook.
   */
  async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const storeId = account.metadata?.storeId;
    const store = storeId
      ? await this.storeRepository.findOne({ where: { id: storeId } })
      : await this.storeRepository.findOne({ where: { stripeAccountId: account.id } });

    if (!store) {
      this.logger.warn(`Stripe account.updated received for unknown store. Account: ${account.id}`);
      return;
    }

    const isFullyEnabled = Boolean(account.charges_enabled && account.payouts_enabled);
    store.isPayoutsEnabled = isFullyEnabled;

    if (!store.stripeAccountId) {
      store.stripeAccountId = account.id;
    }

    await this.storeRepository.save(store);
    this.logger.log(
      `Store "${store.name}" (${store.subdomain}) Stripe Connect status updated. Payouts enabled: ${isFullyEnabled}`,
    );
  }
}
