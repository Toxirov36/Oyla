import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../common/dto';

export class UpdateProfileDto {
  @ApiProperty({ minLength: 2, maxLength: 80, example: 'Ali Valiyev' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}
