import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TeacherService } from '../src/teacher/teacher.service';
import type { AssignmentStorage } from '../src/teacher/assignment-storage';
import type { PrismaService } from '../src/common/prisma.service';
import type { Actor } from '../src/common/security';

const teacher: Actor = {
  id: 'teacher-id',
  role: 'TEACHER',
  teacherAccess: true,
  name: 'Teacher',
  email: 'teacher@example.uz',
  grade: null,
  sessionId: 'session-id',
};

test('an assignment is due exactly 24 hours after its server creation time', async () => {
  let saved: { createdAt: Date; deadline: Date } | undefined;
  const transaction = {
    assignment: {
      create: async ({ data }: { data: { createdAt: Date; deadline: Date } }) => {
        saved = data;
        return { id: 'assignment-id' };
      },
    },
    classStudent: { findMany: async () => [] },
  };
  const db = {
    class: { findFirst: async () => ({ id: 'class-id', grade: 6 }) },
    lesson: { findFirst: async () => ({ id: 'lesson-id' }) },
    $transaction: async (work: (tx: typeof transaction) => Promise<unknown>) => work(transaction),
  } as unknown as PrismaService;
  const storage = { prepare: async () => [] } as unknown as AssignmentStorage;
  const service = new TeacherService(db, storage);

  const before = Date.now();
  await service.create(teacher, {
    classId: 'class-id',
    lessonId: 'lesson-id',
    title: 'Practice',
  });
  const after = Date.now();

  assert.ok(saved);
  assert.ok(saved.createdAt.getTime() >= before);
  assert.ok(saved.createdAt.getTime() <= after);
  assert.equal(saved.deadline.getTime() - saved.createdAt.getTime(), 24 * 60 * 60 * 1000);
});
