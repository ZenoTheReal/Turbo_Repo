import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions, JwtOptionsFactory } from '@nestjs/jwt';

@Injectable()
export class JwtConfigService implements JwtOptionsFactory {
    constructor(private readonly configService: ConfigService) { }

    createJwtOptions(): JwtModuleOptions {
        return {
            secret: this.configService.get<string>('JWT_SECRET', 'default_secret_key'),
            signOptions: {
                expiresIn: this.configService.get<string>('JWT_EXPIRATION', '1d') as any,
            },
        };
    }
}