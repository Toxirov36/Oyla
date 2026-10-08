import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma.service';
import { RedisService } from '../common/redis.service';
import { Actor } from '../common/security';
import { avatarSelect } from '../profile/avatars';
import { mediaAvatar, photoSelect } from '../profile/public-media';

const memberSelect = {
  id: true,
  name: true,
  avatar: { select: avatarSelect },
  photo: { select: photoSelect },
  role: true,
  active: true,
  student: { select: { grade: true } },
} as const;
const activeStudent = { active: true, role: 'STUDENT' as const };
@Injectable()
export class FriendsService {
  constructor(
    private readonly db: PrismaService,
    private readonly redis: RedisService,
  ) {}
  private async profile(actor: Actor) {
    return this.db.withUserLock(actor.id, async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: actor.id } });
      if (user.role !== 'STUDENT' || !user.active)
        throw new ForbiddenException('Do‘stlar bo‘limi faqat faol o‘quvchilar uchun.');
      return tx.friendProfile.upsert({
        where: { userId: actor.id },
        update: {},
        create: { userId: actor.id, inviteCode: randomBytes(12).toString('base64url') },
      });
    });
  }
  async list(actor: Actor) {
    const profile = await this.profile(actor);
    const rows = await this.db.friendship.findMany({
      where: {
        OR: [{ userLowId: actor.id }, { userHighId: actor.id }],
        userLow: { role: 'STUDENT' },
        userHigh: { role: 'STUDENT' },
      },
      include: { userLow: { select: memberSelect }, userHigh: { select: memberSelect } },
      orderBy: { createdAt: 'desc' },
    });
    const entries = rows.map((row) => {
      const peer = row.userLowId === actor.id ? row.userHigh : row.userLow;
      return {
        id: row.id,
        status: row.status,
        requestedById: row.requestedById,
        createdAt: row.createdAt,
        acceptedAt: row.acceptedAt,
        user: {
          id: peer.id,
          name: peer.name,
          avatar: mediaAvatar(peer),
          grade: peer.student?.grade ?? null,
          active: peer.active,
        },
      };
    });
    return {
      inviteCode: profile.inviteCode,
      friends: entries.filter((row) => row.status === 'ACCEPTED'),
      incoming: entries.filter((row) => row.status === 'PENDING' && row.requestedById !== actor.id),
      outgoing: entries.filter((row) => row.status === 'PENDING' && row.requestedById === actor.id),
    };
  }
  private async participants<T>(
    first: string,
    second: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    requireActive = true,
  ) {
    const ids = [first, second].sort();
    return this.db.$transaction(async (tx) => {
      // Canonical lock order also serializes reciprocal requests and acceptance/removal.
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "User" WHERE id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR UPDATE`,
      );
      if (
        requireActive &&
        (await tx.user.count({ where: { id: { in: ids }, ...activeStudent } })) !== 2
      )
        throw new NotFoundException('Faol o‘quvchi topilmadi.');
      return work(tx);
    });
  }
  private async requestLimit(actor: Actor) {
    if ((await this.redis.incrementWindow(`friend-requests:${actor.id}`, 3600)) > 20)
      throw new HttpException('Bir soatda 20 ta so‘rovdan ortiq yuborib bo‘lmaydi.', 429);
  }
  async request(actor: Actor, code: string) {
    await this.requestLimit(actor);
    const target = await this.db.friendProfile.findUnique({
      where: { inviteCode: code },
      select: { userId: true },
    });
    if (!target) throw new NotFoundException('Taklif kodi topilmadi.');
    if (target.userId === actor.id)
      throw new BadRequestException('O‘zingizga so‘rov yubora olmaysiz.');
    return this.participants(actor.id, target.userId, async (tx) => {
      // Code rotation or promotion may have happened before the user locks were acquired.
      if (
        !(await tx.friendProfile.findFirst({ where: { userId: target.userId, inviteCode: code } }))
      )
        throw new NotFoundException('Taklif kodi topilmadi.');
      return this.createRequest(tx, actor, target.userId);
    });
  }
  async requestClassmate(actor: Actor, classId: string, userId: string) {
    await this.requestLimit(actor);
    if (userId === actor.id) throw new BadRequestException('O‘zingizga so‘rov yubora olmaysiz.');
    return this.participants(actor.id, userId, async (tx) => {
      const group = await tx.class.findFirst({
        where: { id: classId, students: { some: { studentId: actor.id } } },
        select: { grade: true },
      });
      if (
        !group ||
        (await tx.classStudent.count({
          where: {
            classId,
            studentId: { in: [actor.id, userId] },
            student: { student: { grade: group.grade } },
          },
        })) !== 2
      )
        throw new NotFoundException('Sinfdosh topilmadi.');
      return this.createRequest(tx, actor, userId);
    });
  }
  private async createRequest(tx: Prisma.TransactionClient, actor: Actor, targetId: string) {
    const [userLowId, userHighId] = [actor.id, targetId].sort();
    const existing = await tx.friendship.findUnique({
      where: { userLowId_userHighId: { userLowId, userHighId } },
    });
    if (existing)
      return {
        id: existing.id,
        state:
          existing.status === 'ACCEPTED'
            ? 'ACCEPTED'
            : existing.requestedById === actor.id
              ? 'PENDING'
              : 'INCOMING',
      };
    if (
      (await tx.friendship.count({ where: { requestedById: actor.id, status: 'PENDING' } })) >= 20
    )
      throw new BadRequestException(
        'Avval yuborilgan so‘rovlar javobini kuting yoki ularni bekor qiling.',
      );
    if (
      (await tx.friendship.count({
        where: {
          status: 'PENDING',
          OR: [{ userLowId: targetId }, { userHighId: targetId }],
        },
      })) >= 100
    )
      throw new BadRequestException(
        'Bu o‘quvchining so‘rovlar ro‘yxati to‘lgan. Keyinroq urinib ko‘ring.',
      );
    for (const id of [actor.id, targetId])
      if (
        (await tx.friendship.count({
          where: { status: 'ACCEPTED', OR: [{ userLowId: id }, { userHighId: id }] },
        })) >= 200
      )
        throw new BadRequestException('Do‘stlar soni chegarasiga yetilgan.');
    const row = await tx.friendship.create({
      data: { userLowId, userHighId, requestedById: actor.id },
    });
    const user = await tx.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: { name: true },
    });
    await tx.notification.create({
      data: {
        userId: targetId,
        type: 'FRIEND',
        title: 'Yangi do‘stlik so‘rovi',
        body: `${user.name} sizni do‘stlikka taklif qildi.`,
        link: '/friends',
      },
    });
    return { id: row.id, state: 'PENDING' };
  }
  private async own(actor: Actor, id: string) {
    const row = await this.db.friendship.findFirst({
      where: { id, OR: [{ userLowId: actor.id }, { userHighId: actor.id }] },
    });
    if (!row) throw new NotFoundException('Do‘stlik so‘rovi topilmadi.');
    return row;
  }
  async accept(actor: Actor, id: string) {
    const current = await this.own(actor, id);
    return this.participants(current.userLowId, current.userHighId, async (tx) => {
      const row = await tx.friendship.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Do‘stlik so‘rovi topilmadi.');
      if (row.requestedById === actor.id)
        throw new ForbiddenException('Faqat so‘rov olgan o‘quvchi uni qabul qila oladi.');
      if (row.status === 'ACCEPTED') return { success: true };
      for (const userId of [row.userLowId, row.userHighId])
        if (
          (await tx.friendship.count({
            where: { status: 'ACCEPTED', OR: [{ userLowId: userId }, { userHighId: userId }] },
          })) >= 200
        )
          throw new BadRequestException('Do‘stlar soni chegarasiga yetilgan.');
      await tx.friendship.update({
        where: { id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      const user = await tx.user.findUniqueOrThrow({
        where: { id: actor.id },
        select: { name: true },
      });
      await tx.notification.create({
        data: {
          userId: row.requestedById,
          type: 'FRIEND',
          title: 'Do‘stlik so‘rovi qabul qilindi',
          body: `${user.name} so‘rovingizni qabul qildi.`,
          link: '/friends',
        },
      });
      return { success: true };
    });
  }
  async remove(actor: Actor, id: string) {
    const row = await this.own(actor, id);
    return this.participants(
      row.userLowId,
      row.userHighId,
      async (tx) => {
        if (
          !(await tx.user.findFirst({
            where: { id: actor.id, ...activeStudent },
            select: { id: true },
          }))
        )
          throw new ForbiddenException('Hisobingiz holati o‘zgargan.');
        if (!(await tx.friendship.deleteMany({ where: { id } })).count)
          throw new NotFoundException('Do‘stlik so‘rovi topilmadi.');
        return { success: true };
      },
      false,
    );
  }
  async acceptedIds(actor: Actor) {
    if (actor.role !== 'STUDENT')
      throw new ForbiddenException('Do‘stlar reytingi faqat o‘quvchilar uchun.');
    const rows = await this.db.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ userLowId: actor.id }, { userHighId: actor.id }],
        userLow: activeStudent,
        userHigh: activeStudent,
      },
      select: { userLowId: true, userHighId: true },
    });
    return [
      actor.id,
      ...rows.map((row) => (row.userLowId === actor.id ? row.userHighId : row.userLowId)),
    ];
  }
}
