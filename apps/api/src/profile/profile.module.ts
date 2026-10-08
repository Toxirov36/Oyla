import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AvatarsController, AvatarsService } from './avatars';
import { PhotosController, PhotosService } from './photos';
@Module({
  controllers: [ProfileController, AvatarsController, PhotosController],
  providers: [ProfileService, AvatarsService, PhotosService],
})
export class ProfileModule {}
