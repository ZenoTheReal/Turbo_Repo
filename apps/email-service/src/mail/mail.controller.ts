import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { EMAIL_EVENTS, ORDER_EVENTS } from '@repo/common';
import { MailService } from './mail.service.js';

@Controller()
export class MailController {
  constructor(private readonly mailService: MailService) { }

  /**
   * Helper that wraps message processing with manual RabbitMQ acknowledgment (ACK/NACK).
   * Ensures CloudAMQP only sends the next message after the current email is completed.
   */
  private async handleMessage(context: RmqContext, action: () => Promise<void>): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await action();
      channel.ack(originalMsg); // Acknowledge CloudAMQP message completed successfully
    } catch (error) {
      console.error('[Email Service] Error processing message, dropping without requeue:', error);
      // NACK with requeue=false so a bad email address doesn't cause an infinite retry loop
      channel.nack(originalMsg, false, false);
    }
  }

  @EventPattern(EMAIL_EVENTS.SEND_SIGNUP_OTP)
  async handleSendSignupOtp(
    @Payload() data: { email: string; name?: string; otp: string },
    @Ctx() context: any,
  ) {
    await this.handleMessage(context, async () => {
      console.log('[Email Service] Event received: SEND_SIGNUP_OTP for', data.email);
      await this.mailService.sendSignupOtpEmail(data.email, data.name, data.otp);
    });
  }

  @EventPattern(EMAIL_EVENTS.SEND_WELCOME)
  async handleSendWelcome(
    @Payload() data: { email: string; name?: string },
    @Ctx() context: any,
  ) {
    await this.handleMessage(context, async () => {
      console.log('[Email Service] Event received: SEND_WELCOME for', data.email);
      await this.mailService.sendWelcomeEmail(data.email, data.name);
    });
  }

  @EventPattern(EMAIL_EVENTS.SEND_PASSWORD_RESET_OTP)
  async handleSendPasswordResetOtp(
    @Payload() data: { email: string; name?: string; otp: string },
    @Ctx() context: any,
  ) {
    await this.handleMessage(context, async () => {
      console.log('[Email Service] Event received: SEND_PASSWORD_RESET_OTP for', data.email);
      await this.mailService.sendPasswordResetOtpEmail(data.email, data.name, data.otp);
    });
  }

  @EventPattern(EMAIL_EVENTS.PASSWORD_CHANGED_ALERT)
  async handlePasswordChangedAlert(
    @Payload() data: { email: string; name?: string },
    @Ctx() context: any,
  ) {
    await this.handleMessage(context, async () => {
      console.log('[Email Service] Event received: PASSWORD_CHANGED_ALERT for', data.email);
      await this.mailService.sendPasswordChangedAlert(data.email, data.name);
    });
  }

  @EventPattern(EMAIL_EVENTS.SEND_ORDER_CONFIRMATION)
  async handleSendOrderConfirmation(@Payload() data: any, @Ctx() context: any) {
    await this.handleMessage(context, async () => {
      console.log('[Email Service] Event received: SEND_ORDER_CONFIRMATION', data);
      await this.mailService.sendOrderConfirmationEmail(data);
    });
  }

  @EventPattern(ORDER_EVENTS.CREATED)
  async handleOrderCreated(@Payload() orderData: any, @Ctx() context: any) {
    await this.handleMessage(context, async () => {
      console.log('[Email Service] Received order_created event:', orderData);
      await this.mailService.sendOrderConfirmationEmail(orderData);
    });
  }

  @EventPattern(EMAIL_EVENTS.SEND_STORE_APPROVED)
  async handleSendStoreApproved(
    @Payload() data: { email: string; name?: string; storeName: string; subdomain: string },
    @Ctx() context: any,
  ) {
    await this.handleMessage(context, async () => {
      console.log('[Email Service] Event received: SEND_STORE_APPROVED for store', data.storeName);
      await this.mailService.sendStoreApprovedEmail(
        data.email,
        data.name,
        data.storeName,
        data.subdomain,
      );
    });
  }

  @EventPattern(EMAIL_EVENTS.SEND_STORE_REJECTED)
  async handleSendStoreRejected(
    @Payload() data: { email: string; name?: string; storeName: string; subdomain: string; reason?: string },
    @Ctx() context: any,
  ) {
    await this.handleMessage(context, async () => {
      console.log('[Email Service] Event received: SEND_STORE_REJECTED for store', data.storeName);
      await this.mailService.sendStoreRejectedEmail(
        data.email,
        data.name,
        data.storeName,
        data.subdomain,
        data.reason,
      );
    });
  }
}