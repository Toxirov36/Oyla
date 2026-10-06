import { Transform } from 'class-transformer';
import { IsInt, IsString, IsUUID, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const Optional = () => ValidateIf((_object, value: unknown) => value !== undefined);
export const Trim = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
export const QueryNumber = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
  );
export class IdDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') id!: string;
}
export class PaginationDto {
  @ApiPropertyOptional({ default: 1 }) @QueryNumber() @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ default: 20 }) @QueryNumber() @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional() @Optional() @Trim() @IsString() @MaxLength(100) search?: string;
}
export class GradeQueryDto {
  @ApiPropertyOptional() @Optional() @QueryNumber() @IsInt() @Min(5) @Max(7) grade?: number;
}
