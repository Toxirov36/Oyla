import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ExercisePayloadDto } from './exercise.dto';
import { IsIn, ValidateNested, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Optional } from '../common/dto';
export class StartAttemptDto {
  @Optional() @IsIn(['STANDARD', 'MINI_GAME', 'BOSS_BATTLE']) mode?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @Optional() @IsUUID('4') lessonId?: string;
}
export class AnswerDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') questionId!: string;
  @Optional() @IsString() @MinLength(1) @MaxLength(2000) value?: string;
  @Optional() @ValidateNested() @Type(() => ExercisePayloadDto) payload?: ExercisePayloadDto;
}
export class ContinueFeedbackDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') questionId!: string;
}
