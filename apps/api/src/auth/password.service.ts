import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { Actor } from '../common/security';
import { config } from '../common/config';
import { ChangePasswordDto, PasswordResetRequestDto, ResetPasswordDto } from './password.dto';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const invalidReset = () =>
  new BadRequestException(
    'Tiklash havolasi yaroqsiz yoki muddati tugagan. Administratordan yangi havola oling.',
  );
@Injectable()
export class PasswordService {
  constructor(
    private readonly db: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async change(actor: Actor, dto: ChangePasswordDto) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: actor.id } });
    if (!(await argon2.verify(user.passwordHash, dto.currentPassword)))
      throw new BadRequestException('Hozirgi parol noto‘g‘ri.');
    if (dto.newPassword === dto.currentPassword)
      throw new BadRequestException('Yangi parol hozirgi paroldan farq qilsin.');
    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    return this.db.withUserLock(actor.id, async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id: actor.id, active: true, passwordHash: user.passwordHash },
        data: { passwordHash },
      });
      if (changed.count !== 1)
        throw new UnauthorizedException('Hisob o‘zgargan. Tizimga qayta kiring.');
      const now = new Date();
      await tx.session.updateMany({
        where: { userId: actor.id, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: actor.id, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.notification.create({
        data: {
          userId: actor.id,
          title: 'Parolingiz o‘zgartirildi',
          body: 'Hisobingiz paroli yangilandi. Barcha qurilmalarda qayta kirish talab etiladi.',
          link: '/profile',
        },
      });
      return { success: true };
    });
  }

  async request(dto: PasswordResetRequestDto) {
    const response = {
      message:
        'Agar faol hisob mavjud bo‘lsa, administratorga so‘rov yuborildi. Tiklash havolasini olish uchun administratorga murojaat qiling.',
    };
    // The same response and cooldown apply to known and unknown emails.
    const accepted = await this.redis.client.set(
      `password-recovery:${hashToken(dto.email)}`,
      '1',
      'EX',
      600,
      'NX',
    );
    if (!accepted) return response;
    const user = await this.db.user.findUnique({
      where: { email: dto.email },
      select: { id: true, name: true, active: true },
    });
    if (user?.active) {
      const admins = await this.db.user.findMany({
        where: { role: 'ADMIN', active: true },
        select: { id: true },
      });
      if (admins.length)
        await this.db.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: 'Parolni tiklash so‘rovi',
            body: `${user.name} (${dto.email}) parolini tiklashni so‘radi. Havola berishdan oldin uning kimligini tekshiring.`,
            link: `/admin/users?search=${encodeURIComponent(dto.email)}`,
          })),
        });
    }
    return response;
  }

  async issue(userId: string, actor: Actor) {
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + 15 * 60000);
    await this.db.withUserLock(userId, async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (!user.active)
        throw new BadRequestException('Faolsiz hisob uchun tiklash havolasi yaratib bo‘lmaydi.');
      await tx.passwordResetToken.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      await tx.passwordResetToken.create({
        data: { userId, createdById: actor.id, tokenHash: hashToken(token), expiresAt },
      });
    });
    // The fragment stays out of HTTP access logs and is removed by the reset page.
    return { resetUrl: `${config.WEB_ORIGIN}/reset-password#token=${token}`, expiresAt };
  }

  async reset(dto: ResetPasswordDto) {
    const token = await this.db.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
      include: { user: { select: { active: true } } },
    });
    if (!token || token.consumedAt || token.expiresAt <= new Date() || !token.user.active)
      throw invalidReset();
    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    return this.db.withUserLock(token.userId, async (tx) => {
      const now = new Date();
      const user = await tx.user.findUniqueOrThrow({ where: { id: token.userId } });
      if (!user.active) throw invalidReset();
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) throw invalidReset();
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash } });
      await tx.session.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: token.userId, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.notification.create({
        data: {
          userId: token.userId,
          title: 'Parolingiz tiklandi',
          body: 'Hisobingiz paroli yangilandi. Yangi parol bilan tizimga kiring.',
          link: '/profile',
        },
      });
      return { success: true };
    });
  }
}
