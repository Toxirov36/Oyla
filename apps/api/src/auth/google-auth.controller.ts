import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { Public } from '../common/security';
import { config } from '../common/config';
import { AuthService } from './auth.service';

const stateCookie = 'oyla_google_state';

@Controller('auth/google')
export class GoogleAuthController {
  constructor(private readonly auth: AuthService) {}

  private clearState(response: Response) {
    response.clearCookie(stateCookie, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/google',
    });
  }

  private frontend(response: Response, status: string) {
    const target = new URL('/login', config.WEB_ORIGIN);
    target.searchParams.set('google', status);
    return response.redirect(target.toString());
  }

  @Public()
  @Get('start')
  start(
    @Query('flow') flow: string,
    @Query('grade') gradeInput: string | undefined,
    @Res() response: Response,
  ) {
    if (flow !== 'login' && flow !== 'register') return this.frontend(response, 'failed');
    const grade = flow === 'register' ? Number(gradeInput) : undefined;
    if (flow === 'register' && (!Number.isInteger(grade) || grade! < 5 || grade! > 7))
      return this.frontend(response, 'failed');

    const nonce = randomBytes(32).toString('base64url');
    response.cookie(stateCookie, `${nonce}|${flow}|${grade ?? ''}`, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/google',
      maxAge: 10 * 60 * 1000,
    });
    try {
      return response.redirect(this.auth.googleAuthorizationUrl(nonce));
    } catch {
      this.clearState(response);
      return this.frontend(response, 'unavailable');
    }
  }

  @Public()
  @Get('callback')
  async callback(
    @Req() request: Request,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') oauthError: string | undefined,
    @Res() response: Response,
  ) {
    const stored = (request.cookies as Record<string, string> | undefined)?.[stateCookie];
    this.clearState(response);
    if (oauthError) return this.frontend(response, 'cancelled');
    const [nonce, flow, gradeValue, extra] = (stored || '').split('|');
    if (!code || !state || !nonce || extra !== undefined || state !== nonce)
      return this.frontend(response, 'failed');
    if (flow !== 'login' && flow !== 'register') return this.frontend(response, 'failed');
    const grade = gradeValue ? Number(gradeValue) : undefined;
    if (flow === 'register' && (!Number.isInteger(grade) || grade! < 5 || grade! > 7))
      return this.frontend(response, 'failed');

    try {
      const result = await this.auth.loginWithGoogle(code, flow, grade);
      if (!result) return this.frontend(response, 'signup');
      response.cookie('oyla_refresh', result.refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/v1/auth',
        maxAge: 7 * 86400000,
      });
      return this.frontend(response, 'success');
    } catch {
      return this.frontend(response, 'failed');
    }
  }
}
