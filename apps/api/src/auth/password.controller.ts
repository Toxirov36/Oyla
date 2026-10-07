import { Body, Controller, Param, Post, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Actor, CurrentUser, Public, Roles } from '../common/security';
import { IdDto } from '../common/dto';
import { config } from '../common/config';
import { ChangePasswordDto, PasswordResetRequestDto, ResetPasswordDto } from './password.dto';
import { PasswordService } from './password.service';

@ApiTags('Account security')
@Controller()
export class PasswordController {
  constructor(private readonly passwords: PasswordService) {}
  @ApiBearerAuth() @Post('users/me/password') async change(
    @CurrentUser() actor: Actor,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.passwords.change(actor, dto);
    res.clearCookie('oyla_refresh', {
      path: '/api/v1/auth',
      sameSite: 'strict',
      secure: config.NODE_ENV === 'production',
      httpOnly: true,
    });
    return result;
  }
  @Public() @Post('auth/password-reset/request') request(@Body() dto: PasswordResetRequestDto) {
    return this.passwords.request(dto);
  }
  @Public() @Post('auth/password-reset/confirm') async reset(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.passwords.reset(dto);
    res.clearCookie('oyla_refresh', {
      path: '/api/v1/auth',
      sameSite: 'strict',
      secure: config.NODE_ENV === 'production',
      httpOnly: true,
    });
    return result;
  }
  @ApiBearerAuth() @Roles('ADMIN') @Post('admin/users/:id/password-reset') issue(
    @Param() params: IdDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.passwords.issue(params.id, actor);
  }
}
