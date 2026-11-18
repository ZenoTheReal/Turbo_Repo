import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EMAIL_EVENTS, ORDER_EVENTS } from '@repo/common';
import { MailService } from './mail.service.js';

@Controller()
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @EventPattern(EMAIL_EVENTS.SEND_SIGNUP_OTP)
  async handleSendSignupOtp(@Payload() data: { email: string; name?: string; otp: string }) {
    console.log('📧 [Email Service] Event received: SEND_SIGNUP_OTP for', data.email);
    await this.mailService.sendSignupOtpEmail(data.email, data.name, data.otp);
  }

  @EventPattern(EMAIL_EVENTS.SEND_WELCOME)
  async handleSendWelcome(@Payload() data: { email: string; name?: string }) {
    console.log('📧 [Email Service] Event received: SEND_WELCOME for', data.email);
    await this.mailService.sendWelcomeEmail(data.email, data.name);
  }

  @EventPattern(EMAIL_EVENTS.SEND_PASSWORD_RESET_OTP)
  async handleSendPasswordResetOtp(@Payload() data: { email: string; name?: string; otp: string }) {
    console.log('📧 [Email Service] Event received: SEND_PASSWORD_RESET_OTP for', data.email);
    await this.mailService.sendPasswordResetOtpEmail(data.email, data.name, data.otp);
  }

  @EventPattern(EMAIL_EVENTS.PASSWORD_CHANGED_ALERT)
  async handlePasswordChangedAlert(@Payload() data: { email: string; name?: string }) {
    console.log('📧 [Email Service] Event received: PASSWORD_CHANGED_ALERT for', data.email);
    await this.mailService.sendPasswordChangedAlert(data.email, data.name);
  }

  @EventPattern(EMAIL_EVENTS.SEND_ORDER_CONFIRMATION)
  async handleSendOrderConfirmation(@Payload() data: any) {
    console.log('📧 [Email Service] Event received: SEND_ORDER_CONFIRMATION', data);
    await this.mailService.sendOrderConfirmationEmail(data);
  }

  @EventPattern(ORDER_EVENTS.CREATED)
  async handleOrderCreated(@Payload() orderData: any) {
    console.log('📧 [Email Service] Received order_created event:', orderData);
    await this.mailService.sendOrderConfirmationEmail(orderData);
  }
}
