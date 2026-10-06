import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { sign, verify, type SignOptions, type VerifyOptions } from 'jsonwebtoken';
@Injectable()
export class TokenService {
  async signAsync(
    payload: { sub: string; sid: string },
    options: SignOptions & { secret: string },
  ) {
    const { secret, ...settings } = options;
    return sign(payload, secret, { ...settings, algorithm: 'HS256' });
  }
  async verifyAsync(token: string, options: VerifyOptions & { secret: string }) {
    const { secret, ...settings } = options;
    const claims = verify(token, secret, { ...settings, complete: false, algorithms: ['HS256'] });
    if (
      typeof claims === 'string' ||
      typeof claims.sub !== 'string' ||
      typeof claims.sid !== 'string' ||
      !isUUID(claims.sub, '4') ||
      !isUUID(claims.sid, '4')
    )
      throw new Error('Invalid access token claims');
    return { sub: claims.sub, sid: claims.sid };
  }
}
