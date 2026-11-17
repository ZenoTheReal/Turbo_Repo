import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private transporter: Transporter | null = null;
  private readonly fromDisplay: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const pass = this.configService.get<string>('SMTP_PASS')?.replace(/\s+/g, '');

    this.fromDisplay =
      this.configService.get<string>('EMAIL_FROM') ??
      `"${this.configService.get<string>('SITE_NAME', 'Turbo Store')}" <${user}>`;

    if (user && pass && pass !== 'your-16-digit-app-password') {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.logger.log(`SMTP Transporter initialized for ${user} (display: ${this.fromDisplay})`);
    } else {
      this.logger.warn(
        `SMTP credentials not set or using placeholder in .env. Running in simulation mode (emails will be logged to console).`,
      );
    }
  }

  async sendMail(options: { to: string; subject: string; html: string; text?: string }): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`\n================ SIMULATED EMAIL ================
From: ${this.fromDisplay}
To: ${options.to}
Subject: ${options.subject}
Body:
${options.text ?? options.html}
=================================================`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromDisplay,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`Email successfully sent to ${options.to}. MessageId: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
    }
  }

  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    const siteName = this.configService.get<string>('SITE_NAME', 'Turbo Store');
    await this.sendMail({
      to: email,
      subject: `Welcome to ${siteName}! 🎉`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2>Welcome to ${siteName}, ${name ?? 'there'}! 👋</h2>
          <p>Thank you for creating an account with us. Your account is now active and ready to go.</p>
          <p>If you have any questions, feel free to reply to this email.</p>
          <br />
          <p>Best regards,<br/><strong>The ${siteName} Team</strong></p>
        </div>
      `,
      text: `Welcome to ${siteName}, ${name ?? 'there'}! Your account is now active and ready to go.`,
    });
  }

  async sendSignupOtpEmail(email: string, name: string | undefined, otp: string): Promise<void> {
    const siteName = this.configService.get<string>('SITE_NAME', 'Turbo Store');
    await this.sendMail({
      to: email,
      subject: `Verify Your Email - ${siteName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1a202c; margin-top: 0;">Verify Your Email Address 👋</h2>
          <p style="color: #4a5568; line-height: 1.6;">Hello ${name ?? 'there'},</p>
          <p style="color: #4a5568; line-height: 1.6;">Thank you for registering with <strong>${siteName}</strong>. Please use the following 6-digit verification code to activate your account:</p>
          <div style="margin: 28px 0; text-align: center;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #2b6cb0; background: #ebf8ff; padding: 12px 24px; border-radius: 6px; border: 1px dashed #bee3f8; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p style="color: #718096; font-size: 14px; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>. If you did not create an account, please disregard this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #a0aec0; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
        </div>
      `,
      text: `Your ${siteName} verification code is: ${otp}. It will expire in 10 minutes.`,
    });
  }

  async sendPasswordResetOtpEmail(email: string, name: string | undefined, otp: string): Promise<void> {
    const siteName = this.configService.get<string>('SITE_NAME', 'Turbo Store');
    await this.sendMail({
      to: email,
      subject: `Password Reset Code - ${siteName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #e53e3e; margin-top: 0;">Password Reset Request 🔒</h2>
          <p style="color: #4a5568; line-height: 1.6;">Hello ${name ?? 'there'},</p>
          <p style="color: #4a5568; line-height: 1.6;">We received a request to reset your password for your <strong>${siteName}</strong> account. Use the code below to proceed:</p>
          <div style="margin: 28px 0; text-align: center;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #c53030; background: #fff5f5; padding: 12px 24px; border-radius: 6px; border: 1px dashed #feb2b2; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p style="color: #718096; font-size: 14px; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>. If you did not request a password reset, please contact support or secure your account immediately.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #a0aec0; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
        </div>
      `,
      text: `Your ${siteName} password reset code is: ${otp}. It will expire in 10 minutes.`,
    });
  }

  async sendPasswordChangedAlert(email: string, name: string | undefined): Promise<void> {
    const siteName = this.configService.get<string>('SITE_NAME', 'Turbo Store');
    await this.sendMail({
      to: email,
      subject: `Security Alert: Password Changed - ${siteName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2b6cb0; margin-top: 0;">Security Alert: Password Updated 🛡️</h2>
          <p style="color: #4a5568; line-height: 1.6;">Hello ${name ?? 'there'},</p>
          <p style="color: #4a5568; line-height: 1.6;">The password for your <strong>${siteName}</strong> account was successfully updated on <strong>${new Date().toUTCString()}</strong>.</p>
          <p style="color: #718096; font-size: 14px; line-height: 1.5;">If you made this change, you can safely ignore this email. If you did NOT change your password, please contact our support team immediately.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #a0aec0; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
        </div>
      `,
      text: `Your ${siteName} password was successfully changed. If this wasn't you, contact support immediately.`,
    });
  }

  async sendOrderConfirmationEmail(orderData: any): Promise<void> {
    const siteName = this.configService.get<string>('SITE_NAME', 'Turbo Store');
    const recipient = orderData.userEmail ?? orderData.email ?? 'customer@example.com';
    const orderId = orderData.id ?? orderData.orderId ?? 'N/A';
    const amount = orderData.amount ?? orderData.price ?? 'N/A';

    await this.sendMail({
      to: recipient,
      subject: `Order Confirmation #${orderId} - ${siteName}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
          <h2>Order Confirmed! 📦</h2>
          <p>Thank you for your purchase. We have received your order <strong>#${orderId}</strong>.</p>
          <p><strong>Total Amount:</strong> $${amount}</p>
          <p>We are currently preparing your items for shipment and will notify you once dispatched.</p>
          <br />
          <p>Best regards,<br/><strong>The ${siteName} Team</strong></p>
        </div>
      `,
      text: `Thank you for your order #${orderId} with ${siteName}. Total: $${amount}.`,
    });
  }
}
