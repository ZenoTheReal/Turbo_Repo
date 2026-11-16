import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JwtConfigService } from './jwt-config.service.js';

@Global()
@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useClass: JwtConfigService,
        }),
    ],
    providers: [JwtConfigService],
    exports: [JwtModule], // Exported so JwtService is available everywhere!
})
export class AppJwtModule { }