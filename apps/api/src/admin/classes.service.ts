import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../common/prisma.service';
import { ClassDto, MembershipDto, UpdateClassDto } from './admin.dto';
import { safeUser } from './safe-user';

@Injectable()
export class AdminClassesService {
  constructor(private readonly db: PrismaService) {}
  classes() {
    return this.db.class.findMany({
      include: {
        teacher: { select: { id: true, name: true } },
        students: { include: { student: { select: safeUser } } },
      },
      orderBy: { name: 'asc' },
    });
  }
  async createClass(dto: ClassDto) {
    return this.db.withUserLock(dto.teacherId, async (tx) => {
      if (
        !(await tx.user.findFirst({
          where: {
            id: dto.teacherId,
            active: true,
            OR: [{ role: 'TEACHER' }, { teacherAccess: true }],
          },
        }))
      )
        throw new BadRequestException('Faol o‘qituvchini tanlang.');
      return tx.class.create({ data: dto });
    });
  }
  async updateClass(id: string, dto: UpdateClassDto) {
    const update = async (tx: Prisma.TransactionClient) => {
      if (
        dto.teacherId &&
        !(await tx.user.findFirst({
          where: {
            id: dto.teacherId,
            active: true,
            OR: [{ role: 'TEACHER' }, { teacherAccess: true }],
          },
        }))
      )
        throw new BadRequestException('Faol o‘qituvchini tanlang.');
      if (
        dto.grade &&
        (await tx.classStudent.count({
          where: { classId: id, student: { student: { grade: { not: dto.grade } } } },
        }))
      )
        throw new BadRequestException('Sinfdagi o‘quvchilar bosqichi mos emas.');
      return tx.class.update({ where: { id }, data: dto });
    };
    return dto.teacherId
      ? this.db.withUserLock(dto.teacherId, update)
      : this.db.$transaction(update);
  }
  deleteClass(id: string) {
    return this.db.class.delete({ where: { id } });
  }
  async membership(id: string, dto: MembershipDto) {
    return this.db.$transaction(async (tx) => {
      if (dto.studentIds.length)
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM "User" WHERE id IN (${Prisma.join(dto.studentIds.map((studentId) => Prisma.sql`${studentId}::uuid`))}) ORDER BY id FOR UPDATE`,
        );
      const group = await tx.class.findUniqueOrThrow({ where: { id } });
      const students = await tx.user.count({
        where: {
          id: { in: dto.studentIds },
          role: 'STUDENT',
          active: true,
          student: { grade: group.grade },
        },
      });
      if (students !== dto.studentIds.length)
        throw new BadRequestException('Sinfga mos faol o‘quvchilarni tanlang.');
      await tx.classStudent.deleteMany({ where: { classId: id } });
      await tx.classStudent.createMany({
        data: dto.studentIds.map((studentId) => ({ classId: id, studentId })),
      });
      return { success: true };
    });
  }
}
