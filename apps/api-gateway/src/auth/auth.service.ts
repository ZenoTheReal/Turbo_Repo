import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtHelperService } from '../config/jwt/jwt-helper.service.js';
import { UserRole } from '@repo/common';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtHelper: JwtHelperService,
    ) { }

    async register(dto: RegisterDto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('A user with this email already exists');
        }

        const roleName = dto.role ?? UserRole.BUYER;
        const role = await this.usersService.findRoleByName(roleName);
        if (!role) {
            throw new BadRequestException(
                `Role '${roleName}' does not exist in the database.`,
            );
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(dto.password, salt);

        const user = await this.usersService.create({
            name: dto.name,
            email: dto.email,
            password: hashedPassword,
            role: role,
        });

        // Generate both tokens
        const tokens = this.jwtHelper.generateAuthTokens({
            sub: user.id,
            email: user.email,
            role: role.name,
        });

        return {
            message: 'User registered successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: role.name,
            },
            ...tokens,
        };
    }

    async login(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        if (!user.password) {
            throw new UnauthorizedException(
                'This account uses social login. Please sign in with your provider.',
            );
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const roleName = user.role?.name ?? UserRole.BUYER;

        // Generate both tokens
        const tokens = this.jwtHelper.generateAuthTokens({
            sub: user.id,
            email: user.email,
            role: roleName,
        });

        return {
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: roleName,
            },
            ...tokens,
        };
    }

    async refreshTokens(dto: RefreshTokenDto) {
        try {
            // 1. Verify refresh token
            const payload = this.jwtHelper.verifyRefreshToken(dto.refreshToken);

            // 2. Fetch user to ensure user still exists and get latest role
            const user = await this.usersService.findById(payload.sub);
            if (!user) {
                throw new UnauthorizedException('User no longer exists');
            }

            const roleName = user.role?.name ?? UserRole.BUYER;

            // 3. Issue fresh tokens
            return this.jwtHelper.generateAuthTokens({
                sub: user.id,
                email: user.email,
                role: roleName,
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }
}