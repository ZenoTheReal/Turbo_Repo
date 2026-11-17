import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EMAIL_EVENTS, ORDER_EVENTS } from '@repo/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @EventPattern(EMAIL_EVENTS.SEND_WELCOME)
  async handleSendWelcome(@Payload() data: { email: string; name?: string }) {
    console.log('📧 [Email Service] Event received: SEND_WELCOME', data);
    await this.appService.sendWelcomeEmail(data.email, data.name);
  }

  @EventPattern(EMAIL_EVENTS.SEND_SIGNUP_OTP)
  async handleSendSignupOtp(@Payload() data: { email: string; name?: string; otp: string }) {
    console.log('📧 [Email Service] Event received: SEND_SIGNUP_OTP for', data.email);
    await this.appService.sendSignupOtpEmail(data.email, data.name, data.otp);
  }

  @EventPattern(EMAIL_EVENTS.SEND_PASSWORD_RESET_OTP)
  async handleSendPasswordResetOtp(@Payload() data: { email: string; name?: string; otp: string }) {
    console.log('📧 [Email Service] Event received: SEND_PASSWORD_RESET_OTP for', data.email);
    await this.appService.sendPasswordResetOtpEmail(data.email, data.name, data.otp);
  }

  @EventPattern(EMAIL_EVENTS.PASSWORD_CHANGED_ALERT)
  async handlePasswordChangedAlert(@Payload() data: { email: string; name?: string }) {
    console.log('📧 [Email Service] Event received: PASSWORD_CHANGED_ALERT for', data.email);
    await this.appService.sendPasswordChangedAlert(data.email, data.name);
  }

  @EventPattern(EMAIL_EVENTS.SEND_ORDER_CONFIRMATION)
  async handleSendOrderConfirmation(@Payload() data: any) {
    console.log('📧 [Email Service] Event received: SEND_ORDER_CONFIRMATION', data);
    await this.appService.sendOrderConfirmationEmail(data);
  }

  @EventPattern(ORDER_EVENTS.CREATED)
  async handleOrderCreated(@Payload() orderData: any) {
    console.log('📧 [Email Service] Received order_created event:', orderData);
    await this.appService.sendOrderConfirmationEmail(orderData);
  }
}
