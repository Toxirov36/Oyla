import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Optional, Trim } from '../common/dto';

export class WrongAnswerFeedbackDto {
  @Trim() @IsString() @MinLength(1) @MaxLength(100) value!: string;
  @Trim() @IsString() @MinLength(3) @MaxLength(1500) reason!: string;
}

export class QuestionFeedbackDto {
  @Optional() @Trim() @IsString() @MaxLength(1500) reason?: string;
  @Optional() @Trim() @IsString() @MaxLength(5000) rule?: string;
  @Optional() @Trim() @IsString() @MaxLength(3000) example?: string;
  @Optional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(1500, { each: true })
  steps?: string[];
  @Optional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => WrongAnswerFeedbackDto)
  wrongAnswers?: WrongAnswerFeedbackDto[];
}
