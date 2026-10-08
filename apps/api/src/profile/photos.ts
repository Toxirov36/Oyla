import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { IdDto } from '../common/dto';
import { Actor, CurrentUser } from '../common/security';
import { PrismaService } from '../common/prisma.service';
import { ProfileService } from './profile.service';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export async function normalizedPhoto(buffer?: Buffer) {
  if (!buffer?.length || buffer.length > MAX_PHOTO_BYTES)
    throw new BadRequestException('5 MB gacha JPG, PNG yoki WebP rasm tanlang.');
  const raster =
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) ||
    (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP');
  if (!raster) throw new BadRequestException('JPG, PNG yoki WebP fayl tanlang.');
  try {
    const image = sharp(buffer, { limitInputPixels: 25000000, animated: false });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '') || (metadata.pages ?? 1) > 1)
      throw Error('Unsupported photo');
    // Re-encoding strips original metadata and accepts no executable image format.
    return await image
      .rotate()
      .resize(512, 512, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new BadRequestException('Rasm ochilmadi. JPG, PNG yoki WebP fayl tanlang.');
  }
}
@Injectable()
export class PhotosService {
  constructor(
    private readonly db: PrismaService,
    private readonly profiles: ProfileService,
  ) {}
  async save(actor: Actor, buffer?: Buffer) {
    const data = await normalizedPhoto(buffer);
    await this.db.withUserLock(actor.id, (tx) =>
      tx.profilePhoto.upsert({
        where: { userId: actor.id },
        create: { id: randomUUID(), userId: actor.id, data: new Uint8Array(data) },
        update: { id: randomUUID(), data: new Uint8Array(data) },
      }),
    );
    return this.profiles.get(actor);
  }
  async remove(actor: Actor) {
    await this.db.withUserLock(actor.id, (tx) =>
      tx.profilePhoto.deleteMany({ where: { userId: actor.id } }),
    );
    return this.profiles.get(actor);
  }
  async get(id: string) {
    const photo = await this.db.profilePhoto.findFirst({ where: { id, user: { active: true } } });
    if (!photo) throw new NotFoundException('Rasm topilmadi.');
    return photo;
  }
}
@ApiTags('Profile photos')
@ApiBearerAuth()
@Controller()
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}
  @Post('users/me/photo')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 0 } }),
  )
  save(@CurrentUser() actor: Actor, @UploadedFile() file?: { buffer: Buffer }) {
    return this.photos.save(actor, file?.buffer);
  }
  @Delete('users/me/photo') remove(@CurrentUser() actor: Actor) {
    return this.photos.remove(actor);
  }
  @Get('profile-photos/:id') async get(@Param() params: IdDto, @Res() res: Response) {
    const photo = await this.photos.get(params.id);
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', 'inline');
    res.send(Buffer.from(photo.data));
  }
}
