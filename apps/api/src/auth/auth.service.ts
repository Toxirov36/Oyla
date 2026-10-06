import { ConflictException, Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { TokenService } from '../common/token.service';
import { Prisma, User } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma.service';
import { config } from '../common/config';
import { LoginDto, RegisterDto } from './auth.dto';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');
@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash!: string;
  async onModuleInit() {
    this.dummyHash = await argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id });
  }
  constructor(
    private readonly db: PrismaService,
    private readonly jwt: TokenService,
  ) {}
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
        throw new ConflictException('Bu email bilan foydalanuvchi mavjud.');
      throw e;
    }
  }
  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({ where: { email: dto.email } });
    const validPassword = await argon2.verify(user?.passwordHash || this.dummyHash, dto.password);
    if (!user || !user.active || !validPassword)
      throw new UnauthorizedException('Email yoki parol noto‘g‘ri.');
    return this.issue(user);
  }
  private async issue(user: User) {
    const refreshToken = randomBytes(48).toString('base64url');
    const session = await this.db.session.create({
      data: {
        userId: user.id,
        tokenHash: digest(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
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
    if (!token || token.length > 200) throw new UnauthorizedException('Sessiya mavjud emas.');
    const next = randomBytes(48).toString('base64url');
    const session = await this.db.$transaction(async (tx) => {
      const old = await tx.session.findUnique({
        where: { tokenHash: digest(token) },
        include: { user: true },
      });
      if (!old || old.revokedAt || old.expiresAt <= new Date() || !old.user.active)
        throw new UnauthorizedException('Sessiya yakunlangan.');
      const changed = await tx.session.updateMany({
        where: { id: old.id, tokenHash: old.tokenHash, revokedAt: null },
        data: { tokenHash: digest(next), expiresAt: new Date(Date.now() + 7 * 86400000) },
      });
      if (changed.count !== 1) throw new UnauthorizedException('Sessiya yangilangan.');
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
    return this.db.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        student: { select: { grade: true } },
      },
    });
  }
}
