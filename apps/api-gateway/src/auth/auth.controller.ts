import {
    Controller, Post, Body, HttpCode,
    HttpStatus, Res, Req,
    UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';

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

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User successfully registered' })
    async register(
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.authService.register(dto);
        // 🍪 Set HttpOnly cookie for Web
        res.cookie(COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);

        return {
            message: result.message,
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken, // For Mobile apps
        };
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Log in and receive accessToken + HttpOnly cookie' })
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
            refreshToken: result.refreshToken, // For Mobile apps
        };
    }

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
        // 🍪 1. Read from HttpOnly cookie (Web), or fallback to request body (Mobile / Swagger)
        const token = req.cookies?.[COOKIE_NAME] || dto?.refreshToken;
        if (!token) {
            throw new UnauthorizedException('Refresh token is required');
        }

        // 2. Refresh tokens
        const tokens = await this.authService.refreshTokens({ refreshToken: token });

        // 🍪 3. Rotate the cookie
        res.cookie(COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }

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