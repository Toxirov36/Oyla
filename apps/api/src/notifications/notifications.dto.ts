import { Transform } from 'class-transformer';
import { Equals, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Optional, PaginationDto } from '../common/dto';

export class NotificationQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @Optional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  unreadOnly?: boolean;
}
export class ReadNotificationDto {
  @ApiPropertyOptional({ default: true }) @Optional() @IsBoolean() @Equals(true) read?: boolean;
}
