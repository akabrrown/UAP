import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    
    // Only apply idempotency to POST, PUT, PATCH
    if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
      return next.handle();
    }

    const idempotencyKey = request.headers['idempotency-key'] as string;

    // If no key is provided, require it for specific endpoints (could be enforced by a decorator)
    // For now, if provided, we process it. If not, we let it pass (or we could enforce it).
    if (!idempotencyKey) {
      // In a real app, you might throw an error if the route requires it.
      return next.handle();
    }

    // Prefix the key with user ID or tenant to prevent cross-user key collision
    const userId = (request as any).user?.id || 'anonymous';
    const cacheKey = `idempotency:${userId}:${idempotencyKey}`;

    const cachedResponse = await this.cacheManager.get(cacheKey);
    if (cachedResponse) {
      if (cachedResponse === 'processing') {
        throw new ConflictException('Request is already being processed');
      }
      return of(cachedResponse);
    }

    // Mark as processing
    await this.cacheManager.set(cacheKey, 'processing', 60000); // 60 seconds

    return next.handle().pipe(
      tap({
        next: async (response) => {
          // Cache successful response for 24 hours
          await this.cacheManager.set(cacheKey, response, 86400000);
        },
        error: async () => {
          // Remove processing flag on error so they can retry
          await this.cacheManager.del(cacheKey);
        },
      }),
    );
  }
}
