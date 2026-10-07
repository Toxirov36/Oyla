import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';
@Module({
  controllers: [AuthController, PasswordController],
  providers: [AuthService, PasswordService],
  exports: [AuthService],
})
export class AuthModule {}
