import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { OtpService } from './otp.service.js';
import { AppJwtModule } from '../config/jwt/jwt.module.js';
import { UsersModule } from '../users/users.module.js';
import { StoresModule } from '../stores/stores.module.js';

@Module({
  imports: [UsersModule, AppJwtModule, StoresModule],
  providers: [AuthService, OtpService],
  controllers: [AuthController],
  exports: [AuthService, OtpService],
})
export class AuthModule { }
