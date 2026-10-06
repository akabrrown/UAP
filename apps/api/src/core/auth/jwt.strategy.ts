import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET') || 'super-secret-jwt-token-with-at-least-32-characters-long', // Default for dev DB
    });
  }

  async validate(payload: any) {
    // payload is the decoded JWT from Supabase
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.app_metadata?.role,
      scopes: payload.app_metadata?.scopes || [],
      isAdmin: payload.app_metadata?.is_admin || false,
    };
  }
}
