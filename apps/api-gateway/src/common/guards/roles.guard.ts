import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@repo/common';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // If route has no @Roles() decorator, allow any authenticated user
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user || !user.role) {
            throw new ForbiddenException('Access denied: No role assigned');
        }

        const hasRole = requiredRoles.includes(user.role as UserRole);
        if (!hasRole) {
            throw new ForbiddenException(
                `Access denied: Required role is [${requiredRoles.join(', ')}], but your role is [${user.role}]`,
            );
        }

        return true;
    }
}