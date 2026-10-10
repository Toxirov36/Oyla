import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Actor } from '../common/security';
import { visibleLesson } from '../content/content.service';
import { studentLearning, classTopics } from './analytics';
import { exerciseAnalysis } from './exercise-analytics';
import { CreateAssignmentDto } from './teacher.dto';
import { AssignmentStorage, IncomingAssignmentFile } from './assignment-storage';

const ASSIGNMENT_DURATION_MS = 24 * 60 * 60 * 1000;

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
  constructor(
    private readonly db: PrismaService,
    private readonly assignmentStorage: AssignmentStorage,
  ) {}
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
    const attempts =
      rosterIds.length && lessons.length
        ? await this.db.attempt.findMany({
            where: {
              userId: { in: rosterIds },
              lessonId: { in: lessons.map((l) => l.id) },
              status: 'COMPLETED',
            },
            select: {
              id: true,
              userId: true,
              lessonId: true,
              completedAt: true,
              questionsSnapshot: true,
              answers: {
                select: { questionId: true, correct: true, question: { select: { type: true } } },
              },
            },
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
      const topics = classTopics(visible, students).map((t) => ({
        ...t,
        exerciseTypes: exerciseAnalysis(
          attempts,
          visible,
          students.map((s) => s.id),
          t.id,
        ),
      }));
      return {
        ...group,
        students,
        topics,
        exerciseTypes: exerciseAnalysis(
          attempts,
          visible,
          students.map((s) => s.id),
        ),
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
        attachments: { select: { id: true, originalName: true, contentType: true, size: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(({ class: group, ...row }) => {
      const roster = group.students
        .map(({ student }) => student)
        .filter(
          (student) =>
            student.active &&
            student.role === 'STUDENT' &&
            student.student?.grade === group.grade,
        );
      const ids = new Set(roster.map((student) => student.id));
      const eligible = row.submissions.filter((submission) => ids.has(submission.userId));
      const submissionsByStudent = new Map(eligible.map((submission) => [submission.userId, submission]));
      return {
        ...row,
        class: { id: group.id, name: group.name, _count: { students: ids.size } },
        attachments: row.attachments.map(({ originalName, ...attachment }) => ({
          ...attachment,
          name: originalName,
        })),
        students: roster.map((student) => ({
          id: student.id,
          name: student.name,
          submission: submissionsByStudent.get(student.id) ?? null,
        })),
        completion: {
          completed: eligible.length,
          total: ids.size,
          late: eligible.filter((submission) => submission.late).length,
          historical: row.submissions.length - eligible.length,
        },
      };
    });
  }
  async removeAssignment(actor: Actor, id: string) {
    const assignment = await this.db.assignment.findFirst({
      where: { id, class: { teacherId: actor.id } },
      select: { id: true, attachments: { select: { storageKey: true } } },
    });
    if (!assignment) throw new NotFoundException('Topshiriq topilmadi.');
    await this.db.assignment.delete({ where: { id: assignment.id } });
    await Promise.allSettled(
      assignment.attachments.map((attachment) => this.assignmentStorage.remove(attachment.storageKey)),
    );
    return { success: true };
  }
  async getAssignmentAttachment(actor: Actor, id: string) {
    const studentAccess =
      actor.role === 'STUDENT' && actor.grade !== null
        ? {
            class: {
              grade: actor.grade,
              students: { some: { studentId: actor.id } },
            },
            lesson: visibleLesson(actor.grade),
          }
        : null;
    const attachment = await this.db.assignmentAttachment.findFirst({
      where: {
        id,
        assignment: {
          OR: [
            { class: { teacherId: actor.id } },
            ...(studentAccess ? [studentAccess] : []),
          ],
        },
      },
      select: { id: true, originalName: true, storageKey: true, contentType: true, size: true },
    });
    if (!attachment) throw new NotFoundException('Topshiriq fayli topilmadi.');
    return attachment;
  }
  downloadAssignmentAttachment(storageKey: string) {
    return this.assignmentStorage.download(storageKey);
  }
  async create(actor: Actor, dto: CreateAssignmentDto, files: IncomingAssignmentFile[] = []) {
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
    const prepared = await this.assignmentStorage.prepare(files);
    const uploaded: string[] = [];
    try {
      for (const file of prepared) {
        await this.assignmentStorage.upload(file);
        uploaded.push(file.key);
      }
      return await this.db.$transaction(async (tx) => {
        const createdAt = new Date();
        const assignment = await tx.assignment.create({
          data: {
            classId: dto.classId,
            lessonId: dto.lessonId,
            title: dto.title,
            createdAt,
            deadline: new Date(createdAt.getTime() + ASSIGNMENT_DURATION_MS),
            attachments: prepared.length
              ? {
                  create: prepared.map(({ key, originalName, contentType, size }) => ({
                    storageKey: key,
                    originalName,
                    contentType,
                    size,
                  })),
                }
              : undefined,
          },
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
    } catch (error) {
      await Promise.allSettled(uploaded.map((key) => this.assignmentStorage.remove(key)));
      throw error;
    }
  }
}
