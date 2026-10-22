import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { config } from './config';

/** Thin Cloudflare R2 wrapper; `enabled` is false when the R2 credentials are not configured. */
@Injectable()
export class ObjectStorageService {
  private readonly client: S3Client | null =
    config.R2_ACCOUNT_ID &&
    config.R2_BUCKET_NAME &&
    config.R2_ACCESS_KEY_ID &&
    config.R2_SECRET_ACCESS_KEY
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

  get enabled() {
    return this.client !== null;
  }
  async put(key: string, body: Buffer, contentType: string) {
    await this.require().send(
      new PutObjectCommand({
        Bucket: config.R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }
  async get(key: string) {
    const response = await this.require().send(
      new GetObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: key }),
    );
    if (!response.Body) throw new Error('Object storage returned no body');
    return Buffer.from(await response.Body.transformToByteArray());
  }
  async remove(key: string) {
    await this.require().send(new DeleteObjectCommand({ Bucket: config.R2_BUCKET_NAME, Key: key }));
  }
  private require() {
    if (!this.client) throw new Error('Object storage is not configured');
    return this.client;
  }
}
