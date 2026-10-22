import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Injectable,
  Logger,
  NotFoundException,
  Param,
  Post,
  Res,
  ServiceUnavailableException,
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
import { ObjectStorageService } from '../common/object-storage.service';
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
  private readonly logger = new Logger(PhotosService.name);
  constructor(
    private readonly db: PrismaService,
    private readonly profiles: ProfileService,
    private readonly storage: ObjectStorageService,
  ) {}
  async save(actor: Actor, buffer?: Buffer) {
    const data = await normalizedPhoto(buffer);
    // Prefer object storage; fall back to inline bytes when R2 is not configured.
    let storageKey: string | null = this.storage.enabled ? `profile-photos/${randomUUID()}` : null;
    if (storageKey) {
      try {
        await this.storage.put(storageKey, data, 'image/webp');
      } catch {
        // A storage outage must not block profile photos; keep the image inline instead.
        this.logger.warn('Object storage upload failed; storing the profile photo in PostgreSQL');
        storageKey = null;
      }
    }
    try {
      const previous = await this.db.withUserLock(actor.id, async (tx) => {
        const old = await tx.profilePhoto.findUnique({ where: { userId: actor.id } });
        const fields = {
          id: randomUUID(),
          storageKey,
          data: storageKey ? null : new Uint8Array(data),
        };
        await tx.profilePhoto.upsert({
          where: { userId: actor.id },
          create: { userId: actor.id, ...fields },
          update: fields,
        });
        return old?.storageKey ?? null;
      });
      if (previous) await this.discard(previous);
    } catch (error) {
      if (storageKey) await this.discard(storageKey);
      throw error;
    }
    return this.profiles.get(actor);
  }
  async remove(actor: Actor) {
    const keys = await this.db.withUserLock(actor.id, async (tx) => {
      const old = await tx.profilePhoto.findUnique({ where: { userId: actor.id } });
      await tx.profilePhoto.deleteMany({ where: { userId: actor.id } });
      return old?.storageKey ? [old.storageKey] : [];
    });
    await Promise.all(keys.map((key) => this.discard(key)));
    return this.profiles.get(actor);
  }
  async get(id: string) {
    const photo = await this.db.profilePhoto.findFirst({ where: { id, user: { active: true } } });
    if (!photo) throw new NotFoundException('Rasm topilmadi.');
    if (!photo.storageKey) {
      if (!photo.data) throw new NotFoundException('Rasm topilmadi.');
      return Buffer.from(photo.data);
    }
    try {
      return await this.storage.get(photo.storageKey);
    } catch {
      throw new ServiceUnavailableException('Rasm vaqtincha mavjud emas.');
    }
  }
  private async discard(key: string) {
    try {
      await this.storage.remove(key);
    } catch {
      this.logger.warn(`Could not delete orphaned profile photo object ${key}`);
    }
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
    const image = await this.photos.get(params.id);
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', 'inline');
    res.send(image);
  }
}
