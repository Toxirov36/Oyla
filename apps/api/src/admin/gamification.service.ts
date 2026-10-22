import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { BadgeDto, LevelDto, UpdateBadgeDto, UpdateLevelDto } from './admin.dto';

@Injectable()
export class AdminGamificationService {
  constructor(private readonly db: PrismaService) {}
  async gamification() {
    const [rules, levels, badges] = await Promise.all([
      this.db.xpRule.findMany(),
      this.db.level.findMany({ orderBy: { threshold: 'asc' } }),
      this.db.badge.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);
    return { rules, levels, badges };
  }
  rule(key: string, amount: number) {
    return this.db.xpRule.update({ where: { key }, data: { amount } });
  }
  private async validateLevel(number: number, threshold: number, id?: string) {
    if (number === 1 && threshold !== 0)
      throw new BadRequestException('Birinchi daraja 0 XP dan boshlanadi.');
    const others = await this.db.level.findMany({ where: id ? { id: { not: id } } : {} });
    if (
      others.some((l) =>
        l.number < number
          ? l.threshold >= threshold
          : l.number > number && l.threshold <= threshold,
      )
    )
      throw new BadRequestException('Daraja chegaralari o‘sib borishi kerak.');
  }
  async createLevel(dto: LevelDto) {
    await this.validateLevel(dto.number, dto.threshold);
    return this.db.level.create({ data: dto });
  }
  async updateLevel(id: string, dto: UpdateLevelDto) {
    const level = await this.db.level.findUniqueOrThrow({ where: { id } });
    if (
      level.number === 1 &&
      ((dto.number !== undefined && dto.number !== 1) ||
        (dto.threshold !== undefined && dto.threshold !== 0))
    )
      throw new BadRequestException('Birinchi daraja raqami va 0 XP chegarasi saqlanishi kerak.');
    await this.validateLevel(dto.number ?? level.number, dto.threshold ?? level.threshold, id);
    return this.db.level.update({ where: { id }, data: dto });
  }
  async deleteLevel(id: string) {
    if ((await this.db.level.findUniqueOrThrow({ where: { id } })).number === 1)
      throw new BadRequestException('Birinchi daraja zarur.');
    return this.db.level.delete({ where: { id } });
  }
  createBadge(dto: BadgeDto) {
    return this.db.badge.create({ data: dto });
  }
  updateBadge(id: string, dto: UpdateBadgeDto) {
    return this.db.badge.update({ where: { id }, data: dto });
  }
  deleteBadge(id: string) {
    return this.db.badge.delete({ where: { id } });
  }
}
