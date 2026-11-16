import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

@Injectable()
export class JwtHelperService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Generates a signed JWT with any payload and optional sign options (e.g., custom expiresIn)
   */
  generateToken<T extends object>(payload: T, options?: JwtSignOptions): string {
    return this.jwtService.sign(payload, options);
  }

  /**
   * Verifies a token's signature and expiration, returning the typed payload.
   * Throws an exception if invalid or expired.
   */
  verifyToken<T extends object>(token: string): T {
    return this.jwtService.verify<T>(token);
  }

  /**
   * Decodes a token without verifying signature (useful for inspecting claims)
   */
  decodeToken<T extends object>(token: string): T {
    return this.jwtService.decode(token) as T;
  }
}