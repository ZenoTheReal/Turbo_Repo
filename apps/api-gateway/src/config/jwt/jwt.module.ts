import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../../users/users.module.js';
import { JwtConfigService } from './jwt-config.service.js';
import { JwtHelperService } from './jwt-helper.service.js';
import { JwtStrategy } from './jwt.strategy.js';

@Global()
@Module({
    imports: [
        UsersModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useClass: JwtConfigService,
        }),
    ],
    providers: [JwtConfigService, JwtHelperService, JwtStrategy],
    exports: [JwtModule, PassportModule, JwtHelperService, JwtStrategy],
})
export class AppJwtModule { }