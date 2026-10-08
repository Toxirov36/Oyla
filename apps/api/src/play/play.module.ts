import { Module } from '@nestjs/common';
import { BrainController } from './brain.controller';
import { BrainService } from './brain.service';
import { VideosController, VideosService } from './videos';
@Module({
  controllers: [BrainController, VideosController],
  providers: [BrainService, VideosService],
})
export class PlayModule {}
