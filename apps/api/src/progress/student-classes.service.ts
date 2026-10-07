import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';
import { ProgressService } from './progress.service';

const eligible = (grade: number | null) => ({
  active: true,
  role: 'STUDENT' as const,
  student: { grade: grade ?? -1 },
});
const classSelect = (grade: number | null) =>
  ({
    id: true,
    name: true,
    grade: true,
    teacher: { select: { name: true } },
    _count: { select: { students: { where: { student: eligible(grade) } } } },
  }) as const;

@Injectable()
export class StudentClassesService {
  constructor(
    private readonly db: PrismaService,
    private readonly progress: ProgressService,
  ) {}
  async list(actor: Actor) {
    const rows = await this.db.class.findMany({
      where: { grade: actor.grade ?? -1, students: { some: { studentId: actor.id } } },
      select: classSelect(actor.grade),
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return rows.map(({ _count, ...group }) => ({ ...group, studentCount: _count.students }));
  }
  async detail(actor: Actor, id: string) {
    const group = await this.db.class.findFirst({
      where: { id, grade: actor.grade ?? -1, students: { some: { studentId: actor.id } } },
      select: {
        ...classSelect(actor.grade),
        students: {
          where: { student: eligible(actor.grade) },
          select: { student: { select: { id: true, name: true } } },
          orderBy: [{ student: { name: 'asc' } }, { studentId: 'asc' }],
        },
      },
    });
    if (!group) throw new NotFoundException('Sinf topilmadi.');
    const ids = group.students.map((row) => row.student.id);
    const [connections, assignments] = await Promise.all([
      this.db.friendship.findMany({
        where: {
          OR: [
            { userLowId: actor.id, userHighId: { in: ids } },
            { userHighId: actor.id, userLowId: { in: ids } },
          ],
        },
        select: { id: true, userLowId: true, userHighId: true, requestedById: true, status: true },
      }),
      this.progress.assignments(actor, id),
    ]);
    const { students, _count, ...summary } = group;
    return {
      ...summary,
      studentCount: _count.students,
      members: students.map(({ student }) => {
        const connection = connections.find(
          (row) => row.userLowId === student.id || row.userHighId === student.id,
        );
        return {
          ...student,
          isMe: student.id === actor.id,
          friendship:
            student.id === actor.id || !connection
              ? null
              : {
                  id: connection.id,
                  state:
                    connection.status === 'ACCEPTED'
                      ? 'FRIENDS'
                      : connection.requestedById === actor.id
                        ? 'OUTGOING'
                        : 'INCOMING',
                },
        };
      }),
      assignments,
    };
  }
}
