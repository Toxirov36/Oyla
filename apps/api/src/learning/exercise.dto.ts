import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Optional } from '../common/dto';

export class ExerciseItemDto {
  @IsString() @MaxLength(60) id!: string;
  @IsString() @MaxLength(1000) text!: string;
}
export class ExercisePointDto {
  @IsNumber() @Min(0) @Max(100) x!: number;
  @IsNumber() @Min(0) @Max(100) y!: number;
}
export class ExercisePairDto {
  @IsString() @MaxLength(60) left!: string;
  @IsString() @MaxLength(60) right!: string;
}
export class ExerciseConfigDto {
  @Optional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ExerciseItemDto)
  items?: ExerciseItemDto[];
  @Optional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ExerciseItemDto)
  targets?: ExerciseItemDto[];
  @Optional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ExerciseItemDto)
  slots?: ExerciseItemDto[];
  @Optional() @IsString() @MaxLength(5000) code?: string;
  @Optional() @IsString() @MaxLength(2000) audioText?: string;
  @Optional() @IsString() @MaxLength(2000) audioUrl?: string;
  @Optional() @IsString() @MaxLength(2000) imageUrl?: string;
  @Optional() @IsString() @MaxLength(500) imageAlt?: string;
  @Optional() @IsIn(['en-US', 'en-GB', 'uz-UZ']) language?: string;
  @Optional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ExercisePointDto)
  markers?: ExercisePointDto[];
}
export class ExercisePayloadDto {
  @Optional() @IsString() @MaxLength(5000) text?: string;
  @Optional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  values?: string[];
  @Optional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ExercisePairDto)
  pairs?: ExercisePairDto[];
  @Optional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ExercisePointDto)
  points?: ExercisePointDto[];
}
export class ExerciseGradingDto extends ExercisePayloadDto {
  @Optional() @IsNumber() @Min(0.5) @Max(15) radius?: number;
}
