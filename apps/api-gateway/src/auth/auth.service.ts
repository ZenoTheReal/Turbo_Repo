import {
    Injectable,
    Inject,
    ConflictException,
    UnauthorizedException,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { OtpService } from './otp.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { JwtHelperService } from '../config/jwt/jwt-helper.service.js';
import { UserRole, OtpType, SERVICES, EMAIL_EVENTS } from '@repo/common';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly otpService: OtpService,
        private readonly jwtHelper: JwtHelperService,
        @Inject(SERVICES.EMAIL) private readonly emailClient: ClientProxy,
    ) { }

    // 📝 1. Register: Creates unverified user, generates OTP, sends email
    async register(dto: RegisterDto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('A user with this email already exists');
        }

        const roleName = dto.role ?? UserRole.BUYER;
        const role = await this.usersService.findRoleByName(roleName);
        if (!role) {
            throw new BadRequestException(
                `Role '${roleName}' does not exist in the database.`,
            );
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(dto.password, salt);

        const user = await this.usersService.create({
            name: dto.name,
            email: dto.email,
            password: hashedPassword,
            role: role,
            isEmailVerified: false,
        });

        // Generate 6-digit verification OTP
        const otp = await this.otpService.generateOtp(user.email, OtpType.SIGNUP_VERIFICATION, user.id);

        // Dispatch email over TCP microservice
        this.emailClient.emit(EMAIL_EVENTS.SEND_SIGNUP_OTP, {
            email: user.email,
            name: user.name,
            otp,
        });

        return {
            message: 'Registration successful. A 6-digit verification code has been sent to your email.',
            email: user.email,
            requiresVerification: true,
        };
    }

    // ✅ 2. Verify Email OTP: Activates account & issues JWT tokens
    async verifyEmail(dto: VerifyEmailOtpDto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new NotFoundException('User with this email not found');
        }

        if (user.isEmailVerified) {
            throw new BadRequestException('Email is already verified. Please log in.');
        }

        // Validate code with attempt limit & expiration
        await this.otpService.verifyOtp(dto.email, dto.otp, OtpType.SIGNUP_VERIFICATION);

        // Mark account as verified
        user.isEmailVerified = true;
        await this.usersService.save(user);

        // Send welcome email
        this.emailClient.emit(EMAIL_EVENTS.SEND_WELCOME, {
            email: user.email,
            name: user.name,
        });

        const roleName = user.role?.name ?? UserRole.BUYER;

        // Generate JWT session tokens
        const tokens = this.jwtHelper.generateAuthTokens({
            sub: user.id,
            email: user.email,
            role: roleName,
        });

        return {
            message: 'Email verified successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: roleName,
                isEmailVerified: true,
            },
            ...tokens,
        };
    }

    // 🔁 3. Resend OTP: Rate-limited with 60s cooldown
    async resendOtp(dto: ResendOtpDto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new NotFoundException('User with this email not found');
        }

        if (dto.type === OtpType.SIGNUP_VERIFICATION && user.isEmailVerified) {
            throw new BadRequestException('Email is already verified. Please log in.');
        }

        const otp = await this.otpService.generateOtp(user.email, dto.type, user.id);

        if (dto.type === OtpType.SIGNUP_VERIFICATION) {
            this.emailClient.emit(EMAIL_EVENTS.SEND_SIGNUP_OTP, {
                email: user.email,
                name: user.name,
                otp,
            });
        } else if (dto.type === OtpType.PASSWORD_RESET) {
            this.emailClient.emit(EMAIL_EVENTS.SEND_PASSWORD_RESET_OTP, {
                email: user.email,
                name: user.name,
                otp,
            });
        }

        return {
            message: 'A new verification code has been sent to your email.',
        };
    }

    // 🔑 4. Login: Validates status, password, and email verification
    async login(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        if (user.isDeleted) {
            throw new UnauthorizedException('This account has been deleted');
        }

        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedException(`This account is ${user.status.toLowerCase()}. Please contact support.`);
        }

        if (!user.isEmailVerified) {
            throw new UnauthorizedException(
                'Your email is not verified. Please verify your email before logging in.',
            );
        }

        if (!user.password) {
            throw new UnauthorizedException(
                'This account uses social login. Please sign in with your provider.',
            );
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const roleName = user.role?.name ?? UserRole.BUYER;

        const tokens = this.jwtHelper.generateAuthTokens({
            sub: user.id,
            email: user.email,
            role: roleName,
        });

        return {
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: roleName,
                isEmailVerified: user.isEmailVerified,
            },
            ...tokens,
        };
    }

    // ❓ 5. Forgot Password: Sends 6-digit reset code
    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (user && !user.isDeleted && user.status === 'ACTIVE') {
            const otp = await this.otpService.generateOtp(user.email, OtpType.PASSWORD_RESET, user.id);
            this.emailClient.emit(EMAIL_EVENTS.SEND_PASSWORD_RESET_OTP, {
                email: user.email,
                name: user.name,
                otp,
            });
        }

        // Generic response prevents account enumeration
        return {
            message: 'If an active account with this email exists, a password reset code has been sent.',
        };
    }

    // 🔄 6. Reset Password: Uses OTP to reset password
    async resetPassword(dto: ResetPasswordDto) {
        const user = await this.usersService.findByEmail(dto.email, true);
        if (!user) {
            throw new BadRequestException('Invalid email or verification code');
        }

        await this.otpService.verifyOtp(dto.email, dto.otp, OtpType.PASSWORD_RESET);

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(dto.newPassword, salt);
        await this.usersService.save(user);

        // Security notification
        this.emailClient.emit(EMAIL_EVENTS.PASSWORD_CHANGED_ALERT, {
            email: user.email,
            name: user.name,
        });

        return {
            message: 'Password has been reset successfully. You can now log in with your new password.',
        };
    }

    // 🔒 7. Change Password: For logged-in users and admins
    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.usersService.findByIdWithPassword(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.password) {
            throw new BadRequestException(
                'This account does not have a local password configured (e.g. registered via social login)',
            );
        }

        const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
        if (!isMatch) {
            throw new BadRequestException('Current password does not match');
        }

        const isSame = await bcrypt.compare(dto.newPassword, user.password);
        if (isSame) {
            throw new BadRequestException('New password must be different from current password');
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(dto.newPassword, salt);
        await this.usersService.save(user);

        // Security notification
        this.emailClient.emit(EMAIL_EVENTS.PASSWORD_CHANGED_ALERT, {
            email: user.email,
            name: user.name,
        });

        return {
            message: 'Password changed successfully',
        };
    }

    // 🔄 8. Refresh Tokens
    async refreshTokens(dto: RefreshTokenDto) {
        try {
            const payload = this.jwtHelper.verifyRefreshToken(dto.refreshToken);

            const user = await this.usersService.findById(payload.sub);
            if (!user) {
                throw new UnauthorizedException('User no longer exists');
            }

            const roleName = user.role?.name ?? UserRole.BUYER;

            return this.jwtHelper.generateAuthTokens({
                sub: user.id,
                email: user.email,
                role: roleName,
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }
}
