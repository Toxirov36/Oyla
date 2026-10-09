import { ConflictException, Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { TokenService } from '../common/token.service';
import { Prisma, User } from '../../generated/prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma.service';
import { config } from '../common/config';
import { LoginDto, RegisterDto } from './auth.dto';
import { avatarSelect } from '../profile/avatars';
import { photoSelect, publicMedia } from '../profile/public-media';
import { OAuth2Client } from 'google-auth-library';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');
@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash!: string;
  private googleClient?: OAuth2Client;
  async onModuleInit() {
    this.dummyHash = await argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id });
  }
  constructor(
    private readonly db: PrismaService,
    private readonly jwt: TokenService,
  ) {}
  private oauthClient() {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_REDIRECT_URI)
      throw new UnauthorizedException({
        code: 'AUTH_GOOGLE_UNAVAILABLE',
        message: 'Google orqali kirish hozircha sozlanmagan.',
      });
    return (this.googleClient ??= new OAuth2Client(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI,
    ));
  }
  googleAuthorizationUrl(state: string) {
    return this.oauthClient().generateAuthUrl({
      access_type: 'online',
      prompt: 'select_account',
      scope: ['openid', 'email', 'profile'],
      state,
    });
  }
  async loginWithGoogle(code: string, flow: 'login' | 'register', grade?: number) {
    const client = this.oauthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token)
      throw new UnauthorizedException({
        code: 'AUTH_GOOGLE_INVALID',
        message: 'Google hisobi tasdiqlanmadi.',
      });
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.GOOGLE_CLIENT_ID,
    });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || profile.email_verified !== true)
      throw new UnauthorizedException({
        code: 'AUTH_GOOGLE_INVALID',
        message: 'Google hisobi tasdiqlanmadi.',
      });
    const email = profile.email.trim().toLowerCase();
    let user = await this.db.user.findUnique({ where: { googleSub: profile.sub } });
    if (user) {
      if (!user.active)
        throw new UnauthorizedException({
          code: 'AUTH_ACCOUNT_INACTIVE',
          message: 'Hisob faol emas.',
        });
      return this.issue(user);
    }

    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing) {
      if (!existing.active)
        throw new UnauthorizedException({
          code: 'AUTH_ACCOUNT_INACTIVE',
          message: 'Hisob faol emas.',
        });
      if (existing.googleSub && existing.googleSub !== profile.sub)
        throw new ConflictException({
          code: 'AUTH_GOOGLE_LINKED',
          message: 'Bu email boshqa Google hisobi bilan bog‘langan.',
        });
      user = existing.googleSub
        ? existing
        : await this.db.user.update({
            where: { id: existing.id },
            data: { googleSub: profile.sub },
          });
      return this.issue(user);
    }

    if (flow === 'login') return null;
    if (!grade || grade < 5 || grade > 7)
      throw new UnauthorizedException({
        code: 'AUTH_GOOGLE_GRADE_REQUIRED',
        message: 'Sinfingizni tanlang va qayta urinib ko‘ring.',
      });
    const passwordHash = await argon2.hash(randomBytes(48).toString('base64url'), {
      type: argon2.argon2id,
    });
    const name = (profile.name || email.split('@')[0]).trim().slice(0, 80) || 'O‘quvchi';
    try {
      user = await this.db.user.create({
        data: {
          email,
          name,
          googleSub: profile.sub,
          passwordHash,
          role: 'STUDENT',
          student: { create: { grade } },
        },
      });
      return this.issue(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await this.db.user.findUnique({ where: { email } });
        if (raced?.active && (!raced.googleSub || raced.googleSub === profile.sub)) {
          const linked = raced.googleSub
            ? raced
            : await this.db.user.update({
                where: { id: raced.id },
                data: { googleSub: profile.sub },
              });
          return this.issue(linked);
        }
      }
      throw error;
    }
  }
  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    try {
      const user = await this.db.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: 'STUDENT',
          student: { create: { grade: dto.grade } },
        },
      });
      return this.issue(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw new ConflictException({
          code: 'AUTH_EMAIL_EXISTS',
          message: 'Bu email bilan foydalanuvchi mavjud.',
        });
      throw e;
    }
  }
  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({ where: { email: dto.email } });
    const validPassword = await argon2.verify(user?.passwordHash || this.dummyHash, dto.password);
    if (!user || !user.active || !validPassword)
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Email yoki parol noto‘g‘ri.',
      });
    return this.issue(user);
  }
  private async issue(user: User) {
    const refreshToken = randomBytes(48).toString('base64url');
    const session = await this.db.withUserLock(user.id, async (tx) => {
      const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (!current.active || current.passwordHash !== user.passwordHash)
        throw new UnauthorizedException({
          code: 'AUTH_ACCOUNT_CHANGED',
          message: 'Hisob o‘zgargan. Tizimga qayta kiring.',
        });
      return tx.session.create({
        data: {
          userId: user.id,
          tokenHash: digest(refreshToken),
          expiresAt: new Date(Date.now() + 7 * 86400000),
        },
      });
    });
    return {
      refreshToken,
      accessToken: await this.access(user.id, session.id),
      user: await this.publicUser(user.id),
    };
  }
  private access(id: string, sid: string) {
    return this.jwt.signAsync(
      { sub: id, sid },
      { secret: config.JWT_SECRET, expiresIn: '15m', issuer: 'oyla', audience: 'oyla-web' },
    );
  }
  async refresh(token?: string) {
    if (!token || token.length > 200)
      throw new UnauthorizedException({
        code: 'AUTH_SESSION_MISSING',
        message: 'Sessiya mavjud emas.',
      });
    const next = randomBytes(48).toString('base64url');
    const session = await this.db.$transaction(async (tx) => {
      const old = await tx.session.findUnique({
        where: { tokenHash: digest(token) },
        include: { user: true },
      });
      if (!old || old.revokedAt || old.expiresAt <= new Date() || !old.user.active)
        throw new UnauthorizedException({
          code: 'AUTH_SESSION_EXPIRED',
          message: 'Sessiya yakunlangan.',
        });
      const changed = await tx.session.updateMany({
        where: { id: old.id, tokenHash: old.tokenHash, revokedAt: null },
        data: { tokenHash: digest(next), expiresAt: new Date(Date.now() + 7 * 86400000) },
      });
      if (changed.count !== 1)
        throw new UnauthorizedException({
          code: 'AUTH_SESSION_CHANGED',
          message: 'Sessiya yangilangan.',
        });
      return old;
    });
    return {
      refreshToken: next,
      accessToken: await this.access(session.userId, session.id),
      user: await this.publicUser(session.userId),
    };
  }
  async logout(sid: string) {
    await this.db.session.updateMany({
      where: { id: sid, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }
  async publicUser(id: string) {
    const user = await this.db.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        preferredLocale: true,
        avatarId: true,
        avatar: { select: avatarSelect },
        photo: { select: photoSelect },
        email: true,
        role: true,
        teacherAccess: true,
        student: { select: { grade: true } },
      },
    });
    return publicMedia(user);
  }
}
