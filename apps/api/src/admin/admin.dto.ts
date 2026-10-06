import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { BadgeCriterion, ContentStatus, Difficulty, QuestionType, Role } from '../../generated/prisma/client';
import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LoginDto } from '../auth/auth.dto';
import { Optional, Trim, PaginationDto, QueryNumber } from '../common/dto';

export class AdminUserQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: Role }) @Optional() @IsEnum(Role) role?: Role;
  @ApiPropertyOptional() @Optional() @QueryNumber() @IsInt() @Min(5) @Max(7) grade?: number;
}

export class SubjectDto {
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(100) title!: string;
  @ApiProperty() @IsString() @Matches(/^[a-z][a-z0-9-]{1,59}$/) slug!: string;
  @ApiProperty() @Trim() @IsString() @MaxLength(1000) description!: string;
  @ApiPropertyOptional({ enum: ContentStatus })
  @Optional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
  @ApiPropertyOptional() @Optional() @IsInt() @Min(0) @Max(10000) position?: number;
}
export class UpdateSubjectDto extends PartialType(SubjectDto, { skipNullProperties: false }) {}
export class CourseDto {
  @ApiProperty() @IsUUID('4') subjectId!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(100) title!: string;
  @ApiProperty() @IsInt() @Min(5) @Max(7) grade!: number;
  @ApiPropertyOptional({ enum: ContentStatus })
  @Optional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
  @ApiPropertyOptional() @Optional() @IsInt() @Min(0) @Max(10000) position?: number;
}
export class UpdateCourseDto extends PartialType(CourseDto, { skipNullProperties: false }) {}
export class TopicDto {
  @ApiProperty() @IsUUID('4') courseId!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(100) title!: string;
  @ApiPropertyOptional({ enum: ContentStatus })
  @Optional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
  @ApiPropertyOptional() @Optional() @IsInt() @Min(0) @Max(10000) position?: number;
}
export class UpdateTopicDto extends PartialType(TopicDto, { skipNullProperties: false }) {}
export class LessonDto {
  @ApiProperty() @IsUUID('4') topicId!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(150) title!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(20) @MaxLength(30000) explanation!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(10) @MaxLength(10000) example!: string;
  @ApiPropertyOptional() @Optional() @IsInt() @Min(1) @Max(180) duration?: number;
  @ApiPropertyOptional({ enum: ContentStatus })
  @Optional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
  @ApiPropertyOptional() @Optional() @IsInt() @Min(0) @Max(10000) position?: number;
}
export class UpdateLessonDto extends PartialType(LessonDto, { skipNullProperties: false }) {}
export class OptionDto {
  @ApiProperty() @Trim() @IsString() @MinLength(1) @MaxLength(1000) text!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(1) @MaxLength(100) value!: string;
}
export class QuestionDto {
  @ApiProperty() @IsUUID('4') lessonId!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(3) @MaxLength(5000) text!: string;
  @ApiProperty({ enum: QuestionType }) @IsEnum(QuestionType) type!: QuestionType;
  @ApiPropertyOptional({ enum: Difficulty })
  @Optional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;
  @ApiProperty() @Trim() @IsString() @MinLength(1) @MaxLength(2000) answer!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(3) @MaxLength(5000) explanation!: string;
  @ApiPropertyOptional() @Optional() @IsString() @MaxLength(2000) hint?: string;
  @ApiPropertyOptional() @Optional() @IsInt() @Min(0) @Max(1000) xp?: number;
  @ApiPropertyOptional()
  @Optional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  tolerance?: number;
  @ApiPropertyOptional({ enum: ContentStatus })
  @Optional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
  @ApiPropertyOptional() @Optional() @IsInt() @Min(0) @Max(10000) position?: number;
  @ApiPropertyOptional({ type: [OptionDto] })
  @Optional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];
}
export class UpdateQuestionDto extends PartialType(QuestionDto, { skipNullProperties: false }) {}
export class CreateUserDto extends LoginDto {
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @ApiProperty({ enum: Role }) @IsEnum(Role) role!: Role;
  @ApiPropertyOptional() @Optional() @IsInt() @Min(5) @Max(7) grade?: number;
}
export class UpdateUserDto {
  @ApiPropertyOptional() @Optional() @Trim() @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @ApiPropertyOptional()
  @Optional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email?: string;
  @ApiPropertyOptional() @Optional() @IsBoolean() active?: boolean;
  @ApiPropertyOptional() @Optional() @IsInt() @Min(5) @Max(7) grade?: number;
}
export class ClassDto {
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @ApiProperty() @IsInt() @Min(5) @Max(7) grade!: number;
  @ApiProperty() @IsUUID('4') teacherId!: string;
}
export class UpdateClassDto extends PartialType(ClassDto, { skipNullProperties: false }) {}
export class MembershipDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  studentIds!: string[];
}
export class XpRuleDto {
  @ApiProperty() @IsInt() @Min(0) @Max(10000) amount!: number;
}
export class RuleKeyDto {
  @ApiProperty()
  @IsEnum({
    LESSON_COMPLETED: 'LESSON_COMPLETED',
    CORRECT_ANSWER: 'CORRECT_ANSWER',
    DAILY_CHALLENGE: 'DAILY_CHALLENGE',
    STREAK_7: 'STREAK_7',
  })
  key!: string;
}
export class LevelDto {
  @ApiProperty() @IsInt() @Min(1) @Max(1000) number!: number;
  @ApiProperty() @IsInt() @Min(0) @Max(10000000) threshold!: number;
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(80) title!: string;
}
export class UpdateLevelDto extends PartialType(LevelDto, { skipNullProperties: false }) {}
export class BadgeDto {
  @ApiProperty() @IsString() @Matches(/^[a-z][a-z0-9-]{1,59}$/) slug!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(100) title!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(3) @MaxLength(500) description!: string;
  @ApiProperty({ enum: BadgeCriterion }) @IsEnum(BadgeCriterion) criterion!: BadgeCriterion;
  @ApiProperty() @IsInt() @Min(1) @Max(100000) threshold!: number;
}
export class UpdateBadgeDto extends PartialType(BadgeDto, { skipNullProperties: false }) {}
