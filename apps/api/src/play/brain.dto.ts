import { IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Optional } from '../common/dto';
export class CreateBrainDto {
  @IsUUID('4') opponentId!: string;
  @Optional() @IsUUID('4') subjectId?: string;
}
export class BrainActionDto {
  @IsIn(['accept', 'decline', 'cancel']) action!: 'accept' | 'decline' | 'cancel';
}
export class BrainAnswerDto {
  @IsInt() @Min(0) @Max(4) roundIndex!: number;
  @IsString() @MinLength(1) @MaxLength(1000) value!: string;
}
