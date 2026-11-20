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
        private readonly usersService: UsersService,
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
        const user = await this.usersService.findById(payload.sub);

        // 1. Reject if deleted
        if (!user || user.isDeleted) {
            throw new UnauthorizedException('User account no longer exists or was deleted');
        }

        // 2. Reject if deactivated by Admin
        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}. Please contact support.`);
        }

        // 3. Reject if email not verified
        if (!user.isEmailVerified) {
            throw new UnauthorizedException('Account email is not verified');
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role?.name ?? payload.role,
            status: user.status,
            isEmailVerified: user.isEmailVerified,
        };
    }
}