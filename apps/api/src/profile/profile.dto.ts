import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Optional, Trim } from '../common/dto';

export class UpdateProfileDto {
  @ApiPropertyOptional({ format: 'uuid' }) @Optional() @IsUUID('4') avatarId?: string;
  @ApiPropertyOptional({ minLength: 2, maxLength: 80, example: 'Ali Valiyev' })
  @Trim()
  @Optional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;
}
