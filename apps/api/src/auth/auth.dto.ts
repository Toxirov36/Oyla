import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Trim } from '../common/dto';

export class LoginDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @ApiProperty({ minLength: 10, maxLength: 128 })
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty() @Trim() @IsString() @MinLength(2) @MaxLength(80) name!: string;
  @ApiProperty({ minimum: 5, maximum: 7 }) @IsInt() @Min(5) @Max(7) grade!: number;
}
