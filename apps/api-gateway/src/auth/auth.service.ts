import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UserRole } from '@repo/common';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        // 1. Check if user already exists
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('A user with this email already exists');
        }

        // 2. Hash the password with bcryptjs
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(dto.password, salt);

        // 3. Save new user in database
        const user = await this.usersService.create({
            name: dto.name,
            email: dto.email,
            password: hashedPassword,
            role: dto.role ?? UserRole.BUYER,
        });

        // 4. Generate JWT token
        const token = this.generateToken(user.id, user.email, user.role);

        return {
            message: 'User registered successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            accessToken: token,
        };
    }

    async login(dto: LoginDto) {
        // 1. Find user (including password hash)
        const user = await this.usersService.findByEmail(dto.email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        if (!user.password) {
            throw new UnauthorizedException('This account uses social login. Please sign in with your provider.');
        }

        // 2. Verify password
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // 3. Generate JWT token
        const token = this.generateToken(user.id, user.email, user.role);

        return {
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            accessToken: token,
        };
    }

    private generateToken(userId: string, email: string, role: UserRole): string {
        const payload = { sub: userId, email, role };
        return this.jwtService.sign(payload);
    }
}