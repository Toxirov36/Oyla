import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';
import { GoogleAuthController } from './google-auth.controller';
@Module({
  controllers: [AuthController, PasswordController, GoogleAuthController],
  providers: [AuthService, PasswordService],
  exports: [AuthService],
})
export class AuthModule {}
