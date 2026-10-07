import { Body, Controller, Delete, Get, Param, Post, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Actor, CurrentUser, Roles } from '../common/security';
import { IdDto } from '../common/dto';
import { AcceptFriendDto, FriendRequestDto } from './friends.dto';
import { FriendsService } from './friends.service';
@ApiTags('Friends')
@ApiBearerAuth()
@Roles('STUDENT')
@Controller('friends')
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}
  @Get() list(@CurrentUser() actor: Actor) {
    return this.friends.list(actor);
  }
  @Post('requests') request(@CurrentUser() actor: Actor, @Body() dto: FriendRequestDto) {
    return this.friends.request(actor, dto.code);
  }
  @Patch('requests/:id/accept') accept(
    @CurrentUser() actor: Actor,
    @Param() params: IdDto,
    @Body() _dto: AcceptFriendDto,
  ) {
    return this.friends.accept(actor, params.id);
  }
  @Delete(':id') remove(@CurrentUser() actor: Actor, @Param() params: IdDto) {
    return this.friends.remove(actor, params.id);
  }
}
