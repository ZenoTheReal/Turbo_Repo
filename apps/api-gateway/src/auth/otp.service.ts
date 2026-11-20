import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Database } from '../config/database/database.js';
import { Otp } from './schema/otp.entity.js';
import { OtpType } from '@repo/common';

const OTP_EXPIRATION_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  private otpRepository: Repository<Otp>;

  constructor(private readonly database: Database) {
    this.otpRepository = this.database.dataSource.getRepository(Otp);
  }

  // 1. Generate 6-digit OTP with cooldown & invalidation of older codes
  async generateOtp(email: string, type: OtpType, userId?: string): Promise<string> {
    const normalizedEmail = email.toLowerCase().trim();

    // Cooldown check: prevent spamming resend requests
    const latestOtp = await this.otpRepository.findOne({
      where: { email: normalizedEmail, type, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (latestOtp) {
      const secondsSinceCreation = (Date.now() - latestOtp.createdAt.getTime()) / 1000;
      if (secondsSinceCreation < OTP_RESEND_COOLDOWN_SECONDS) {
        const remainingSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceCreation);
        throw new BadRequestException(
          `Please wait ${remainingSeconds} second(s) before requesting another code.`,
        );
      }

      // Mark older active OTP as used to prevent collisions
      latestOtp.isUsed = true;
      await this.otpRepository.save(latestOtp);
    }

    // Generate cryptographically secure 6-digit number
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000);

    const newOtp = this.otpRepository.create({
      email: normalizedEmail,
      userId,
      code,
      type,
      expiresAt,
      isUsed: false,
      attempts: 0,
    });

    await this.otpRepository.save(newOtp);
    return code;
  }

  // 2. Verify OTP with attempt-throttling & expiration check
  async verifyOtp(email: string, code: string, type: OtpType): Promise<Otp> {
    const normalizedEmail = email.toLowerCase().trim();

    const otp = await this.otpRepository.findOne({
      where: { email: normalizedEmail, type, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    // Check expiration
    if (new Date() > otp.expiresAt) {
      otp.isUsed = true;
      await this.otpRepository.save(otp);
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    // Check attempts limit (anti-brute-force)
    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      otp.isUsed = true;
      await this.otpRepository.save(otp);
      throw new BadRequestException(
        'Too many invalid attempts. This code is no longer valid. Please request a new code.',
      );
    }

    // Check code match
    if (otp.code !== code.trim()) {
      otp.attempts += 1;
      await this.otpRepository.save(otp);
      const remaining = MAX_OTP_ATTEMPTS - otp.attempts;
      throw new BadRequestException(
        `Invalid verification code. ${remaining} attempt(s) remaining.`,
      );
    }

    // Mark as used
    otp.isUsed = true;
    return this.otpRepository.save(otp);
  }
}
