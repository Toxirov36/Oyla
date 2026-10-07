import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Actor, CurrentUser } from '../common/security';
import { IdDto } from '../common/dto';
import {
  NotificationQueryDto,
  ReadNotificationDto,
  ReadAllNotificationsDto,
} from './notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@CurrentUser() actor: Actor, @Query() query: NotificationQueryDto) {
    return this.notifications.list(actor, query);
  }
  @Get('unread-count') unread(@CurrentUser() actor: Actor) {
    return this.notifications.unread(actor);
  }
  @Patch('read-all') readAll(@CurrentUser() actor: Actor, @Body() _dto: ReadAllNotificationsDto) {
    return this.notifications.readAll(actor);
  }
  @Patch(':id/read') read(
    @CurrentUser() actor: Actor,
    @Param() params: IdDto,
    @Body() dto: ReadNotificationDto,
  ) {
    return this.notifications.read(actor, params.id, dto.read ?? true);
  }
  @Delete(':id') remove(@CurrentUser() actor: Actor, @Param() params: IdDto) {
    return this.notifications.remove(actor, params.id);
  }
}
