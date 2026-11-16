import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { AppJwtModule } from '../config/jwt/jwt.module.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [UsersModule, AppJwtModule],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule { }
