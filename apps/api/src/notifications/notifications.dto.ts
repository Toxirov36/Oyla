import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsEnum } from 'class-validator';
import { NotificationType } from '../../generated/prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Optional, PaginationDto } from '../common/dto';

export class NotificationQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: NotificationType })
  @Optional()
  @IsEnum(NotificationType)
  type?: NotificationType;
  @ApiPropertyOptional()
  @Optional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  unreadOnly?: boolean;
}
export class ReadNotificationDto {
  @ApiPropertyOptional({ default: true }) @Optional() @IsBoolean() read?: boolean;
}
export class ReadAllNotificationsDto extends ReadNotificationDto {
  @Equals(true) override read = true;
}
