import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';
import { visibleLesson } from '../content/content.service';
import { studentLearning, classTopics } from './analytics';
import { CreateAssignmentDto } from './teacher.dto';

const studentSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  student: { select: { grade: true } },
} as const;
@Injectable()
export class TeacherService {
  constructor(private readonly db: PrismaService) {}
  async classes(actor: Actor) {
    return this.classReports(actor);
  }
  private async classReports(actor: Actor, id?: string) {
    const groups = await this.db.class.findMany({
      where: { teacherId: actor.id, ...(id ? { id } : {}) },
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
    if (!groups.length) return [];
    const grades = [...new Set(groups.map((group) => group.grade))];
    const lessons = await this.db.lesson.findMany({
      where: { OR: grades.map((grade) => visibleLesson(grade)) },
      include: { topic: { include: { course: { include: { subject: true } } } } },
      orderBy: [
        { topic: { course: { subject: { position: 'asc' } } } },
        { topic: { position: 'asc' } },
        { position: 'asc' },
        { id: 'asc' },
      ],
    });
    const rosterIds = [
      ...new Set(
        groups.flatMap((group) =>
          group.students
            .filter(
              ({ student }) =>
                student.active &&
                student.role === 'STUDENT' &&
                student.student?.grade === group.grade,
            )
            .map(({ student }) => student.id),
        ),
      ),
    ];
    const rows =
      rosterIds.length && lessons.length
        ? await this.db.progress.findMany({
            where: {
              userId: { in: rosterIds },
              lessonId: { in: lessons.map((lesson) => lesson.id) },
            },
            select: { userId: true, lessonId: true, bestScore: true },
          })
        : [];
    return groups.map((group) => {
      const visible = lessons.filter((lesson) => lesson.topic.course.grade === group.grade);
      const students = group.students
        .filter(
          ({ student }) =>
            student.active && student.role === 'STUDENT' && student.student?.grade === group.grade,
        )
        .map(({ student }) => ({ ...student, ...studentLearning(student.id, visible, rows) }));
      const topics = classTopics(visible, students);
      return {
        ...group,
        students,
        topics,
        totalLessons: visible.length,
        studentsNeedingHelp: students
          .filter((student) => student.needsHelp)
          .map((student) => ({
            id: student.id,
            name: student.name,
            mastery: student.mastery,
            topics: student.topics.filter((topic) => topic.needsHelp),
          })),
      };
    });
  }
  async classDetail(actor: Actor, id: string) {
    const group = (await this.classReports(actor, id))[0];
    if (!group) throw new NotFoundException('Sinf topilmadi.');
    const assignments = await this.assignmentReports(actor, id);
    return { ...group, assignments };
  }
  async assignments(actor: Actor) {
    return this.assignmentReports(actor);
  }
  private async assignmentReports(actor: Actor, classId?: string) {
    const rows = await this.db.assignment.findMany({
      where: { class: { teacherId: actor.id }, ...(classId ? { classId } : {}) },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            students: { select: { student: { select: studentSelect } } },
          },
        },
        lesson: { select: { id: true, title: true } },
        submissions: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(({ class: group, ...row }) => {
      const ids = new Set(
        group.students
          .filter(
            ({ student }) =>
              student.active &&
              student.role === 'STUDENT' &&
              student.student?.grade === group.grade,
          )
          .map(({ student }) => student.id),
      );
      const eligible = row.submissions.filter((submission) => ids.has(submission.userId));
      return {
        ...row,
        class: { id: group.id, name: group.name, _count: { students: ids.size } },
        completion: {
          completed: eligible.length,
          total: ids.size,
          late: eligible.filter((submission) => submission.late).length,
          historical: row.submissions.length - eligible.length,
        },
      };
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
      const students = await tx.classStudent.findMany({
        where: {
          classId: group.id,
          student: { active: true, role: 'STUDENT', student: { grade: group.grade } },
        },
      });
      if (students.length)
        await tx.notification.createMany({
          data: students.map((s) => ({
            userId: s.studentId,
            title: 'Yangi topshiriq',
            type: 'ASSIGNMENT',
            body: dto.title,
            link: '/assignments',
          })),
        });
      return assignment;
    });
  }
}
