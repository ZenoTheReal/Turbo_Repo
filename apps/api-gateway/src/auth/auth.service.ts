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
import { UserRole } from '@repo/common';
import { JwtHelperService } from '../config/jwt/jwt-helper.service.js';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
          private readonly jwtHelper: JwtHelperService,
    ) { }

    async register(dto: RegisterDto) {
        // 1. Check if user already exists
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            throw new ConflictException('A user with this email already exists');
        }

        // 2. Fetch the Role entity from the database
        const roleName = dto.role ?? UserRole.BUYER;
        const role = await this.usersService.findRoleByName(roleName);
        if (!role) {
            throw new BadRequestException(
                `Role '${roleName}' does not exist in the database. Please run the seed script first.`,
            );
        }

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(dto.password, salt);

        // 4. Save user with the Role entity relation
        const user = await this.usersService.create({
            name: dto.name,
            email: dto.email,
            password: hashedPassword,
            role: role, // 👈 Assigns the Role entity relation!
        });

        // 5. Pass role.name string into JWT payload
        const token = this.generateToken(user.id, user.email, role.name as UserRole);

        return {
            message: 'User registered successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: role.name,
            },
            accessToken: token,
        };
    }

    async login(dto: LoginDto) {
        // 1. Find user (including password hash and role)
        const user = await this.usersService.findByEmail(dto.email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }

        if (!user.password) {
            throw new UnauthorizedException(
                'This account uses social login. Please sign in with your provider.',
            );
        }

        // 2. Verify password
        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }

        // 3. Extract role name from the relation
        const roleName = user.role?.name ?? UserRole.BUYER;

        // 4. Generate JWT token
        const token = this.generateToken(user.id, user.email, roleName as UserRole);

        return {
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: roleName,
            },
            accessToken: token,
        };
    }

    private generateToken(userId: string, email: string, role: UserRole): string {
        const payload = { sub: userId, email, role };
        return this.jwtHelper.generateToken(payload);
    }
}