import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import {
  getSignupOtpTemplate,
  getPasswordResetTemplate,
  getWelcomeTemplate,
  getOrderConfirmationTemplate,
  getSecurityAlertTemplate,
} from './templates/index.js';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly fromDisplay: string;
  private readonly siteName: string;

  constructor(private readonly configService: ConfigService) {
    this.siteName = this.configService.get<string>('SITE_NAME', 'Turbo Store');
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const pass = this.configService.get<string>('SMTP_PASS')?.replace(/\s+/g, '');

    this.fromDisplay =
      this.configService.get<string>('EMAIL_FROM') ??
      `"${this.siteName}" <${user}>`;

    if (user && pass && pass !== 'your-16-digit-app-password') {
      const rateLimit = Number(this.configService.get<number>('SMTP_RATE_LIMIT', 1));
      const rateDelta = Number(this.configService.get<number>('SMTP_RATE_DELTA', 1000)); // 1000ms = 1 sec

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        // 🛡️ SMTP Rate Limiting & Pooling
        pool: true,              // Reuses persistent TLS connection (avoids repeated SSL handshakes)
        maxConnections: 1,       // Strictly 1 connection: never triggers Google concurrent socket limit
        maxMessages: 100,        // Cycle socket every 100 emails to prevent stale connection timeouts
        rateLimit,               // Max emails per time delta (1 email)
        rateDelta,               // Time window in ms (1000ms = 1 second)
        auth: { user, pass },
      });
      this.logger.log(`SMTP Transporter initialized with Rate Limiting (${rateLimit} email / ${rateDelta}ms, pool=true) for ${user}`);
    } else {
      this.logger.warn(`SMTP credentials not configured. Running in simulation mode.`);
    }
  }

  // 📨 Core Low-Level Sender
  async sendMail(options: SendMailOptions): Promise<void> {
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
      this.logger.log(`Email successfully delivered to ${options.to}. MessageId: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error; // Rethrow so the controller catches and negative-acknowledges
    }
  }

  // 📝 1. Sign-Up OTP Email
  async sendSignupOtpEmail(email: string, name: string | undefined, otp: string): Promise<void> {
    const template = getSignupOtpTemplate({ siteName: this.siteName, name, otp });
    await this.sendMail({ to: email, ...template });
  }

  // 🔒 2. Password Reset OTP Email
  async sendPasswordResetOtpEmail(email: string, name: string | undefined, otp: string): Promise<void> {
    const template = getPasswordResetTemplate({ siteName: this.siteName, name, otp });
    await this.sendMail({ to: email, ...template });
  }

  // 🎉 3. Welcome Email
  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    const template = getWelcomeTemplate({ siteName: this.siteName, name });
    await this.sendMail({ to: email, ...template });
  }

  // 📦 4. Order Confirmation Email
  async sendOrderConfirmationEmail(orderData: any): Promise<void> {
    const recipient = orderData.userEmail ?? orderData.email ?? 'customer@example.com';
    const orderId = orderData.id ?? orderData.orderId ?? 'N/A';
    const amount = orderData.amount ?? orderData.price ?? 'N/A';

    const template = getOrderConfirmationTemplate({ siteName: this.siteName, orderId, amount });
    await this.sendMail({ to: recipient, ...template });
  }

  // 🛡️ 5. Password Changed Security Alert
  async sendPasswordChangedAlert(email: string, name: string | undefined): Promise<void> {
    const template = getSecurityAlertTemplate({ siteName: this.siteName, name });
    await this.sendMail({ to: email, ...template });
  }
}