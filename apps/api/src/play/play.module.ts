import { Module } from '@nestjs/common';
import { BrainController } from './brain.controller';
import { BrainService } from './brain.service';
import { VideosController, VideosService } from './videos';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';
import { MemoryGenerationService } from './memory-generation.service';
@Module({
  controllers: [BrainController, VideosController, MemoryController],
  providers: [BrainService, VideosService, MemoryService, MemoryGenerationService],
})
export class PlayModule {}
