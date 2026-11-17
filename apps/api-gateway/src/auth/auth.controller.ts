import {
    Controller,
    Post,
    Patch,
    Body,
    HttpCode,
    HttpStatus,
    Res,
    Req,
    UseGuards,
    UnauthorizedException,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto.js';
import { ResendOtpDto } from './dto/resend-otp.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser, type CurrentUserPayload } from '../common/decorators/current-user.decorator.js';

const COOKIE_NAME = 'refreshToken';

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // 📝 1. Register a new user (sends 6-digit OTP to email)
    @Post('register')
    @ApiOperation({ summary: 'Register a new user (sends verification OTP to email)' })
    @ApiResponse({ status: 201, description: 'User registered; verification code sent' })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    // ✅ 2. Verify Email OTP & receive tokens
    @Post('verify-email')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify 6-digit OTP to activate account and receive JWT tokens' })
    @ApiResponse({ status: 200, description: 'Email verified successfully; tokens issued' })
    async verifyEmail(
        @Body() dto: VerifyEmailOtpDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.verifyEmail(dto);
        // 🍪 Set HttpOnly cookie for Web
        res.cookie(COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

        return {
            message: result.message,
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        };
    }

    // 🔁 3. Resend OTP (Rate-limited with 60-second cooldown)
    @Post('resend-otp')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Resend verification or password reset OTP' })
    @ApiResponse({ status: 200, description: 'New verification OTP sent' })
    async resendOtp(@Body() dto: ResendOtpDto) {
        return this.authService.resendOtp(dto);
    }

    // 🔑 4. Log in (requires verified email)
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Log in with verified account' })
    @ApiResponse({ status: 200, description: 'User logged in successfully' })
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.login(dto);
        // 🍪 Set HttpOnly cookie for Web
        res.cookie(COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

        return {
            message: result.message,
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        };
    }

    // ❓ 5. Request Password Reset OTP
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request a 6-digit password reset code sent to email' })
    @ApiResponse({ status: 200, description: 'Reset code dispatched if account exists' })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto);
    }

    // 🔄 6. Reset Password with OTP
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password using the 6-digit code received via email' })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto);
    }

    // 🔒 7. Change Password (For authenticated Users & Admins)
    @Patch('change-password')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Change password for currently logged-in user or admin' })
    @ApiResponse({ status: 200, description: 'Password changed successfully' })
    async changePassword(
        @CurrentUser() currentUser: CurrentUserPayload,
        @Body() dto: ChangePasswordDto,
    ) {
        return this.authService.changePassword(currentUser.id, dto);
    }

    // 🔄 8. Exchange refresh token for fresh tokens
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Exchange refresh token for fresh tokens' })
    @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid or missing refresh token' })
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
        @Body() dto: RefreshTokenDto,
    ) {
        const token = req.cookies?.[COOKIE_NAME] || dto?.refreshToken;
        if (!token) {
            throw new UnauthorizedException('Refresh token is required');
        }

        const tokens = await this.authService.refreshTokens({ refreshToken: token });
        res.cookie(COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }

    // 🚪 9. Log out and clear refresh token cookie
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Log out and clear the refresh token cookie' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            path: '/api/auth',
        });
        return { message: 'Logged out successfully' };
    }
}
