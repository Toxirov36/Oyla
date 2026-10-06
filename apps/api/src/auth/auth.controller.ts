import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Actor, CurrentUser, Public } from '../common/security';
import { config } from '../common/config';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  private send(response: Response, result: Awaited<ReturnType<AuthService['login']>>) {
    response.cookie('oyla_refresh', result.refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: 7 * 86400000,
    });
    return { accessToken: result.accessToken, user: result.user };
  }
  @Public() @Post('register') async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.send(res, await this.auth.register(dto));
  }
  @Public() @Post('login') async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.send(res, await this.auth.login(dto));
  }
  @Public() @Post('refresh') async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.send(
      res,
      await this.auth.refresh((req.cookies as Record<string, string> | undefined)?.oyla_refresh),
    );
  }
  @ApiBearerAuth() @Post('logout') async logout(
    @CurrentUser() actor: Actor,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('oyla_refresh', {
      path: '/api/v1/auth',
      sameSite: 'strict',
      secure: config.NODE_ENV === 'production',
      httpOnly: true,
    });
    return this.auth.logout(actor.sessionId);
  }
  @ApiBearerAuth() @Get('me') me(@CurrentUser() actor: Actor) {
    return this.auth.publicUser(actor.id);
  }
}
