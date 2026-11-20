import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';

describe('Storefront & Stripe Connect Architecture (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Subdomain Availability & Blacklist Validation (GET /api/stores/check-subdomain)', () => {
    it('should confirm an available, valid subdomain slug is available', async () => {
      const uniqueSlug = `avail-${Date.now().toString().slice(-6)}`;
      const res = await request(app.getHttpServer())
        .get('/api/stores/check-subdomain')
        .query({ subdomain: uniqueSlug })
        .expect(200);

      expect(res.body).toHaveProperty('isAvailable', true);
      expect(res.body).toHaveProperty('subdomain', uniqueSlug);
    });

    it('should reject a reserved platform keyword (e.g. "admin")', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/stores/check-subdomain')
        .query({ subdomain: 'admin' })
        .expect(200);

      expect(res.body).toHaveProperty('isAvailable', false);
      expect(res.body.message).toContain('reserved');
    });

    it('should reject reserved system keyword "api"', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/stores/check-subdomain')
        .query({ subdomain: 'api' })
        .expect(200);

      expect(res.body).toHaveProperty('isAvailable', false);
      expect(res.body.message).toContain('reserved');
    });

    it('should reject invalid subdomain syntax (too short, < 3 chars) with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/stores/check-subdomain')
        .query({ subdomain: 'ab' })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should reject invalid subdomain syntax (contains forbidden characters or leading hyphen)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/stores/check-subdomain')
        .query({ subdomain: '-invalid-name' })
        .expect(200);

      expect(res.body).toHaveProperty('isAvailable', false);
      expect(res.body.message).toContain('hyphen');
    });
  });

  describe('2. Public Storefront Resolution for Next.js (GET /api/storefronts/:subdomain)', () => {
    it('should return 404 when querying an inactive or non-existent storefront', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/storefronts/non-existent-subdomain-99999')
        .expect(404);

      expect(res.body.message).toContain('not found or is currently not active');
    });
  });

  describe('3. Stripe Webhook Signature Verification (POST /api/stripe/webhook)', () => {
    it('should return 400 Bad Request when stripe-signature header is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/stripe/webhook')
        .send({ type: 'account.updated' })
        .expect(400);

      expect(res.body.message).toContain('Missing stripe-signature header');
    });

    it('should return 400 Bad Request when an invalid stripe-signature is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/stripe/webhook')
        .set('stripe-signature', 't=12345,v1=invalid_fake_signature_hash')
        .send({ type: 'account.updated' })
        .expect(400);

      expect(res.body.message).toContain('Webhook verification failed');
    });
  });

  describe('4. Platform Settings Public Access (GET /api/settings/public)', () => {
    it('should retrieve sanitized public platform settings including branding and currency', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/settings/public')
        .expect(200);

      expect(res.body).toHaveProperty('platformName');
      expect(res.body).toHaveProperty('currency');
      expect(res.body).toHaveProperty('contactEmail');
    });
  });

  describe('5. Security Guards on Seller Storefront & Stripe Endpoints', () => {
    it('should reject POST /api/stores/apply without JWT Bearer token (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/stores/apply')
        .send({ name: 'Sneaker World', subdomain: 'sneakers' })
        .expect(401);
    });

    it('should reject GET /api/stores/my-store without JWT Bearer token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/stores/my-store')
        .expect(401);
    });

    it('should reject PATCH /api/stores/my-store without JWT Bearer token (401)', async () => {
      await request(app.getHttpServer())
        .patch('/api/stores/my-store')
        .send({ name: 'Updated Store' })
        .expect(401);
    });

    it('should reject POST /api/stores/my-store/stripe/connect without JWT Bearer token (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/stores/my-store/stripe/connect')
        .expect(401);
    });

    it('should reject GET /api/stores/my-store/stripe/dashboard without JWT Bearer token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/stores/my-store/stripe/dashboard')
        .expect(401);
    });

    it('should reject GET /api/stores/my-store/stripe/status without JWT Bearer token (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/stores/my-store/stripe/status')
        .expect(401);
    });

    it('should reject GET /api/admin/stores without Admin authorization (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/stores')
        .expect(401);
    });

    it('should reject PATCH /api/admin/stores/:id/status without Admin authorization (401)', async () => {
      await request(app.getHttpServer())
        .patch('/api/admin/stores/123e4567-e89b-12d3-a456-426614174000/status')
        .send({ status: 'ACTIVE' })
        .expect(401);
    });
  });
});
