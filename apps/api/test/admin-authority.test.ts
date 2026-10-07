import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AdminService } from '../src/admin/admin.service';
import { PrismaService } from '../src/common/prisma.service';
import type { Actor } from '../src/common/security';
import type { Role } from '../generated/prisma/client';
const actor: Actor = {
  id: 'admin-actor',
  role: 'ADMIN',
  teacherAccess: false,
  name: 'Admin',
  email: 'admin@example.uz',
  grade: null,
  sessionId: 'session',
};
function service(role: Role, classes = 0, id = 'target') {
  const transaction = {
    user: {
      findUniqueOrThrow: async () => ({
        id,
        role,
        active: true,
        teacherAccess: role === 'TEACHER',
        student: null,
      }),
      count: async () => 1,
    },
    class: { count: async () => classes },
    $queryRaw: async () => [],
  };
  return new AdminService({
    withUserLock: async (_id: string, work: (tx: typeof transaction) => Promise<unknown>) =>
      work(transaction),
  } as unknown as PrismaService);
}
test('the last active administrator cannot be demoted by a previously authorized request', async () => {
  await assert.rejects(
    service('ADMIN').updateUser('target', { role: 'STUDENT', grade: 6 }, actor),
    /Oxirgi admin/,
  );
});
test('administrator self-demotion and teacher demotion with assigned classes are rejected', async () => {
  await assert.rejects(
    service('ADMIN', 0, actor.id).updateUser(actor.id, { role: 'TEACHER' }, actor),
    /O‘z administrator/,
  );
  await assert.rejects(
    service('TEACHER', 1).updateUser('target', { role: 'STUDENT', grade: 6 }, actor),
    /sinflarini boshqa o‘qituvchiga/,
  );
});
