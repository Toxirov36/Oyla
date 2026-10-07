import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsBoolean, IsString, Matches } from 'class-validator';
import { Optional, Trim } from '../common/dto';
export class FriendRequestDto {
  @ApiProperty() @Trim() @IsString() @Matches(/^[A-Za-z0-9_-]{16}$/) code!: string;
}
export class AcceptFriendDto {
  @ApiPropertyOptional({ default: true }) @Optional() @IsBoolean() @Equals(true) accept = true;
}
