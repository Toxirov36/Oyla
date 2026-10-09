import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { config } from '../common/config';

export const MAX_ASSIGNMENT_ATTACHMENT_BYTES = 15 * 1024 * 1024;
export const MAX_ASSIGNMENT_ATTACHMENTS = 5;
export type IncomingAssignmentFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};
export type PreparedAssignmentFile = {
  buffer: Buffer;
  originalName: string;
  contentType: string;
  size: number;
  key: string;
};

@Injectable()
export class AssignmentStorage {
  private readonly client: S3Client | null =
    config.R2_ACCOUNT_ID && config.R2_BUCKET_NAME && config.R2_ACCESS_KEY_ID && config.R2_SECRET_ACCESS_KEY
      ? new S3Client({
          region: 'auto',
          endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          forcePathStyle: true,
          credentials: {
            accessKeyId: config.R2_ACCESS_KEY_ID,
            secretAccessKey: config.R2_SECRET_ACCESS_KEY,
          },
        })
      : null;

  async prepare(files: IncomingAssignmentFile[]) {
    if (files.length > MAX_ASSIGNMENT_ATTACHMENTS)
      throw new BadRequestException('Ko‘pi bilan 5 ta fayl biriktiring.');
    const prepared: Omit<PreparedAssignmentFile, 'key'>[] = [];
    for (const file of files) {
      if (!file.buffer?.length || file.size > MAX_ASSIGNMENT_ATTACHMENT_BYTES)
        throw new BadRequestException('Har bir fayl 15 MB dan kichik bo‘lishi kerak.');
      const cleanName = file.originalname.replace(/\\/g, '/').split('/').pop()?.replace(/[\u0000-\u001f\u007f]/g, '').trim();
      if (!cleanName) throw new BadRequestException('Fayl nomi noto‘g‘ri.');
      const extension = cleanName.split('.').pop()?.toLowerCase();
      if (extension === 'pdf' && file.buffer.subarray(0, 5).toString() === '%PDF-') {
        prepared.push({ buffer: file.buffer, originalName: cleanName, contentType: 'application/pdf', size: file.buffer.length });
        continue;
      }
      if (
        extension === 'docx' &&
        file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
      ) {
        prepared.push({
          buffer: file.buffer,
          originalName: cleanName,
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: file.buffer.length,
        });
        continue;
      }
      if (['jpg', 'jpeg', 'png', 'webp'].includes(extension || '')) {
        try {
          const input = sharp(file.buffer, { limitInputPixels: 25000000, animated: false });
          const metadata = await input.metadata();
          if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages ?? 1) > 1)
            throw new Error('Unsupported image');
          const buffer = await input.rotate().webp({ quality: 85 }).toBuffer();
          prepared.push({
            buffer,
            originalName: `${cleanName.replace(/\.[^.]+$/, '')}.webp`,
            contentType: 'image/webp',
            size: buffer.length,
          });
          continue;
        } catch {
          throw new BadRequestException('Rasm JPG, PNG yoki WebP formatida bo‘lishi kerak.');
        }
      }
      throw new BadRequestException('Faqat PDF, DOCX, JPG, PNG yoki WebP fayllarini biriktirish mumkin.');
    }
    return prepared.map((file) => ({ ...file, key: `assignments/${randomUUID()}` }));
  }

  async upload(file: PreparedAssignmentFile) {
    const client = this.requireClient();
    await client.send(
      new PutObjectCommand({
        Bucket: config.R2_BUCKET_NAME,
        Key: file.key,
        Body: file.buffer,
        ContentType: file.contentType,
      }),
    );
  }

  async download(key: string) {
    const response = await this.requireClient().send(
      new GetObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: key }),
    );
    if (!response.Body) throw new ServiceUnavailableException('Fayl omboridan javob olinmadi.');
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async remove(key: string) {
    await this.requireClient().send(new DeleteObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: key }));
  }

  private requireClient() {
    if (!this.client) throw new ServiceUnavailableException('Cloudflare R2 kalitlari sozlanmagan.');
    return this.client;
  }
}
