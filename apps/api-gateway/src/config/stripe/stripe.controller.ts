import {
  Controller,
  Post,
  Headers,
  Req,
  Inject,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import type { Request } from 'express';
import { firstValueFrom } from 'rxjs';
import { SERVICES, ORDER_PATTERNS } from '@repo/common';
import { StripeService } from './stripe.service.js';
import type Stripe from 'stripe';

@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly stripeService: StripeService,
    @Inject(SERVICES.ORDERS) private readonly ordersClient: ClientProxy,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook receiver for Connect and Payment events' })
  @ApiResponse({ status: 200, description: 'Event received and verified' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header.');
    }

    if (!req.rawBody) {
      throw new BadRequestException(
        'Raw body unavailable. Ensure { rawBody: true } is configured in NestFactory.create.',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructEvent(req.rawBody, signature);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook verification failed: ${err.message}`);
    }

    this.logger.log(`Received verified Stripe event: ${event.type} [${event.id}]`);

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await this.stripeService.handleAccountUpdated(account);
        break;
      }

      case 'account.application.deauthorized': {
        const application = event.data.object as Stripe.Application;
        this.logger.warn(`Stripe account application deauthorized: ${application.id}`);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        const paymentIntentId =
          typeof session.payment_intent === 'string' ? session.payment_intent : undefined;

        if (orderId) {
          try {
            await firstValueFrom(
              this.ordersClient.send(ORDER_PATTERNS.MARK_PAID, {
                orderId,
                stripePaymentIntentId: paymentIntentId,
              }),
            );
            this.logger.log(`Checkout session ${session.id} completed. Order ${orderId} marked PAID.`);
          } catch (err: any) {
            this.logger.error(`Failed to mark order ${orderId} as PAID: ${err.message}`);
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          try {
            await firstValueFrom(
              this.ordersClient.send(ORDER_PATTERNS.EXPIRE_ORDER, { orderId }),
            );
            this.logger.log(`Checkout session ${session.id} expired. Order ${orderId} expired and stock released.`);
          } catch (err: any) {
            this.logger.error(`Failed to expire order ${orderId}: ${err.message}`);
          }
        }
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        this.logger.log(`Async payment succeeded for session: ${session.id}`);
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        this.logger.warn(`Async payment failed for session: ${session.id}`);
        break;
      }

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }
}
