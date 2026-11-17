import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service.js';
import { JwtPayload } from './jwt-helper.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private readonly usersService: UsersService, // 👈 Injected UsersService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET', 'default_secret_key'),
        });
    }

    /**
     * Runs on every protected request.
     * Verifies the user still exists in the database and loads their current role.
     */
    async validate(payload: JwtPayload) {
        // 🔍 1. Query the database
        const user = await this.usersService.findById(payload.sub);

        // ❌ 2. If user was deleted or does not exist, reject request immediately
        if (!user) {
            throw new UnauthorizedException('User account no longer exists or has been deleted');
        }

        // ✅ 3. Attach fresh, real-time user data to req.user
        return {
            id: user.id,
            email: user.email,
            role: user.role?.name ?? payload.role, // Live role from DB
        };
    }
}