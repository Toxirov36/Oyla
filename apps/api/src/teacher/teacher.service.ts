import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';
import { visibleLesson } from '../content/content.service';
import { mean } from '../learning/rules';
import { CreateAssignmentDto } from './teacher.dto';

const studentSelect = {
  id: true,
  name: true,
  email: true,
  active: true,
  student: { select: { grade: true } },
  progress: {
    select: {
      bestScore: true,
      lessonId: true,
      lesson: { select: { title: true, topic: { select: { title: true } } } },
    },
  },
} as const;
@Injectable()
export class TeacherService {
  constructor(private readonly db: PrismaService) {}
  async classes(actor: Actor) {
    const groups = await this.db.class.findMany({
      where: { teacherId: actor.id },
      include: {
        students: { select: { student: { select: studentSelect } } },
        assignments: {
          include: {
            _count: { select: { submissions: true } },
            lesson: { select: { title: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return groups.map((group) => ({
      ...group,
      students: group.students.map((s) => ({
        ...s.student,
        mastery: mean(s.student.progress.map((p) => p.bestScore)),
        completed: s.student.progress.length,
      })),
    }));
  }
  async classDetail(actor: Actor, id: string) {
    const group = (await this.classes(actor)).find((c) => c.id === id);
    if (!group) throw new NotFoundException('Sinf topilmadi.');
    const assignments = await this.db.assignment.findMany({
      where: { classId: id },
      include: {
        lesson: { select: { id: true, title: true } },
        submissions: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { ...group, assignments };
  }
  async assignments(actor: Actor) {
    return this.db.assignment.findMany({
      where: { class: { teacherId: actor.id } },
      include: {
        class: { select: { id: true, name: true, _count: { select: { students: true } } } },
        lesson: { select: { id: true, title: true } },
        submissions: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  async create(actor: Actor, dto: CreateAssignmentDto) {
    const group = await this.db.class.findFirst({
      where: { id: dto.classId, teacherId: actor.id },
    });
    if (!group) throw new NotFoundException('Sinf topilmadi.');
    if (
      !(await this.db.lesson.findFirst({
        where: { id: dto.lessonId, ...visibleLesson(group.grade) },
      }))
    )
      throw new BadRequestException('Sinfga mos chop etilgan darsni tanlang.');
    const deadline = new Date(dto.deadline);
    if (deadline <= new Date() || !/(?:Z|[+-]\d{2}:\d{2})$/.test(dto.deadline))
      throw new BadRequestException('Kelajakdagi muddatni vaqt zonasi bilan kiriting.');
    return this.db.$transaction(async (tx) => {
      const assignment = await tx.assignment.create({
        data: { classId: dto.classId, lessonId: dto.lessonId, title: dto.title, deadline },
      });
      const students = await tx.classStudent.findMany({ where: { classId: group.id } });
      if (students.length)
        await tx.notification.createMany({
          data: students.map((s) => ({
            userId: s.studentId,
            title: 'Yangi topshiriq',
            body: dto.title,
          })),
        });
      return assignment;
    });
  }
}
