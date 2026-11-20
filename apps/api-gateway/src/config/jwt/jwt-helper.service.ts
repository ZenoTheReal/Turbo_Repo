import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    storeId?: string | null;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

@Injectable()
export class JwtHelperService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Generates both Access Token (short-lived) and Refresh Token (long-lived)
     */
    generateAuthTokens(payload: JwtPayload): AuthTokens {
        // 1. Access Token (uses default secret and expiresIn from JwtModule)
        const accessToken = this.jwtService.sign(payload);

        // 2. Refresh Token (uses separate refresh secret and longer expiration)
        const refreshSecret = this.configService.get<string>(
            'JWT_REFRESH_SECRET',
            'default_refresh_secret',
        );
        const refreshExpiresIn = this.configService.get<string>(
            'JWT_REFRESH_EXPIRATION',
            '7d',
        );

        const refreshToken = this.jwtService.sign(
            { sub: payload.sub },
            {
                secret: refreshSecret,
                expiresIn: refreshExpiresIn as any,
            },
        );

        return {
            accessToken,
            refreshToken,
        };
    }

    /**
     * Verifies the Refresh Token signature and returns its payload
     */
    verifyRefreshToken(token: string): { sub: string } {
        const refreshSecret = this.configService.get<string>(
            'JWT_REFRESH_SECRET',
            'default_refresh_secret',
        );
        return this.jwtService.verify(token, { secret: refreshSecret });
    }

    /**
     * Generic token generator for any custom needs
     */
    generateToken<T extends object>(payload: T, options?: JwtSignOptions): string {
        return this.jwtService.sign(payload, options);
    }

    /**
     * Generic token verifier
     */
    verifyToken<T extends object>(token: string, options?: JwtVerifyOptions): T {
        return this.jwtService.verify<T>(token, options);
    }
}