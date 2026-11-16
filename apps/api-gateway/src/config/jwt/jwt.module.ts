import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JwtConfigService } from './jwt-config.service.js';
import { JwtHelperService } from './jwt-helper.service.js';

@Global()
@Module({
    imports: [
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useClass: JwtConfigService,
        }),
    ],
    providers: [JwtConfigService,JwtHelperService], // Provide JwtConfigService and JwtHelperService
    exports: [JwtModule,JwtHelperService], // Exported so JwtService and JwtHelperService are available everywhere!
})
export class AppJwtModule { }