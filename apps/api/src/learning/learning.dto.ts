import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Optional } from '../common/dto';
export class StartAttemptDto {
  @ApiPropertyOptional({ format: 'uuid' }) @Optional() @IsUUID('4') lessonId?: string;
}
export class AnswerDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') questionId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) value!: string;
}
