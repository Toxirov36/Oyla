import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Actor, CurrentUser } from '../common/security';
import { UpdateProfileDto } from './profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('users/me/profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}
  @Get() get(@CurrentUser() actor: Actor) {
    return this.profile.get(actor);
  }
  @Patch() update(@CurrentUser() actor: Actor, @Body() dto: UpdateProfileDto) {
    return this.profile.update(actor, dto);
  }
}
