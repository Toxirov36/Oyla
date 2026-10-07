import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService } from './token.service';
import { Role } from '../../generated/prisma/client';
import type { Request } from 'express';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { config } from './config';

export interface Actor {
  id: string;
  name: string;
  email: string;
  role: Role;
  teacherAccess: boolean;
  grade: number | null;
  sessionId: string;
}
export type AuthRequest = Request & { user: Actor };
export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Actor =>
    ctx.switchToHttp().getRequest<AuthRequest>().user,
);

@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: TokenService,
    private readonly db: PrismaService,
  ) {}
  async canActivate(ctx: ExecutionContext) {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    const origin = request.headers.origin;
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      ((origin && origin !== config.WEB_ORIGIN) ||
        request.headers['sec-fetch-site'] === 'cross-site')
    )
      throw new ForbiddenException('So‘rov manbasi ruxsat etilmagan.');
    if (this.reflector.getAllAndOverride<boolean>('public', [ctx.getHandler(), ctx.getClass()]))
      return true;
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException('Tizimga kiring.');
    let payload: { sub: string; sid: string };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: config.JWT_SECRET,
        issuer: 'oyla',
        audience: 'oyla-web',
      });
    } catch {
      throw new UnauthorizedException('Sessiya yakunlangan.');
    }
    const session = await this.db.session.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { active: true },
      },
      include: { user: { include: { student: true } } },
    });
    if (!session) throw new UnauthorizedException('Sessiya yakunlangan.');
    request.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      teacherAccess: session.user.teacherAccess,
      grade: session.user.student?.grade || null,
      sessionId: session.id,
    };
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const teacherRouteAllowed =
      roles?.includes('TEACHER') && request.user.role === 'ADMIN' && request.user.teacherAccess;
    if (roles && !roles.includes(request.user.role) && !teacherRouteAllowed)
      throw new ForbiddenException('Bu sahifaga kirish huquqingiz yo‘q.');
    return true;
  }
}
@Injectable()
export class RateGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();
    const sensitive =
      /\/auth\/(login|register|refresh|password-reset\/(request|confirm))$|\/users\/me\/password$|\/admin\/users\/[^/]+\/password-reset$/.test(
        req.path,
      );
    const limit = sensitive ? config.AUTH_RATE_LIMIT : config.API_RATE_LIMIT;
    const count = await this.redis.incrementWindow(
      `rate:${sensitive ? 'auth' : 'api'}:${req.ip}`,
      60,
    );
    if (count > limit)
      throw new HttpException('Juda ko‘p so‘rov. Birozdan so‘ng urinib ko‘ring.', 429);
    return true;
  }
}
