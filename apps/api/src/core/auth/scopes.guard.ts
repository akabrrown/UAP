import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from './scopes.decorator';
import { Scope } from '@uap/types/scopes';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<Scope[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    // Assuming Supabase custom claims put scopes in user.user_metadata.scopes or user.app_metadata.scopes
    // The exact location depends on the access-token hook. We assume `user.scopes` is populated by JwtStrategy.
    if (!user || !user.scopes) {
      return false;
    }
    const userScopes = user.scopes as string[];
    // Require ALL specified scopes or ANY? Usually ANY of the required scopes for a route, or ALL.
    // Let's implement ALL required scopes.
    return requiredScopes.every((scope) => userScopes.includes(scope));
  }
}
