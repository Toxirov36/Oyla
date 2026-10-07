import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';
import { NotificationQueryDto } from './notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: PrismaService) {}
  async list(actor: Actor, query: NotificationQueryDto) {
    const where = {
      userId: actor.id,
      ...(query.type ? { type: query.type } : {}),
      ...(query.unreadOnly ? { readAt: null } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' as const } },
              { body: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total, unreadCount] = await this.db.$transaction([
      this.db.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          link: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.db.notification.count({ where }),
      this.db.notification.count({ where: { userId: actor.id, readAt: null } }),
    ]);
    return { items, total, unreadCount, page: query.page, limit: query.limit };
  }
  async unread(actor: Actor) {
    return {
      unreadCount: await this.db.notification.count({ where: { userId: actor.id, readAt: null } }),
    };
  }
  async read(actor: Actor, id: string, read = true) {
    return this.db.$transaction(async (tx) => {
      if (
        !(await tx.notification.findFirst({
          where: { id, userId: actor.id },
          select: { id: true },
        }))
      )
        throw new NotFoundException('Bildirishnoma topilmadi.');
      await tx.notification.updateMany({
        where: { id, userId: actor.id, readAt: read ? null : { not: null } },
        data: { readAt: read ? new Date() : null },
      });
      return { success: true };
    });
  }
  async remove(actor: Actor, id: string) {
    const result = await this.db.notification.deleteMany({ where: { id, userId: actor.id } });
    if (!result.count) throw new NotFoundException('Bildirishnoma topilmadi.');
    return { success: true };
  }
  async readAll(actor: Actor) {
    const now = new Date();
    const result = await this.db.notification.updateMany({
      where: { userId: actor.id, readAt: null, createdAt: { lte: now } },
      data: { readAt: now },
    });
    return { success: true, updated: result.count };
  }
}
