import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Trim } from '../common/dto';
export class CreateAssignmentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') classId!: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') lessonId!: string;
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(100) title!: string;
  @ApiProperty({ format: 'date-time' }) @IsDateString({ strict: true }) deadline!: string;
}
