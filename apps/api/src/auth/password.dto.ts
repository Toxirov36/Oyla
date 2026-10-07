import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { LoginDto } from './auth.dto';

export class PasswordResetRequestDto extends PickType(LoginDto, ['email'] as const) {}
export class ChangePasswordDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(128) currentPassword!: string;
  @ApiProperty({ minLength: 10, maxLength: 128 })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  newPassword!: string;
}
export class ResetPasswordDto extends PickType(ChangePasswordDto, ['newPassword'] as const) {
  @ApiProperty() @IsString() @Matches(/^[A-Za-z0-9_-]{64}$/) token!: string;
}
