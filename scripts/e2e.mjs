import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { createPrismaClient } from '../apps/api/prisma/client.ts';
import { verifyAccountFeatures } from './account-checks.mjs';
import { verifyTeachingAndFriends } from './teaching-friends-checks.mjs';
config({ path: 'apps/api/.env', override: true, quiet: true });
const db = createPrismaClient();
const base = process.env.E2E_API || 'http://127.0.0.1:3001/api/v1';
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1'].includes(new URL(base).hostname)
)
  throw new Error('E2E tests require a local, non-production API.');
class Client {
  token = '';
  cookie = '';
  async request(
    path,
    {
      method = 'GET',
      body,
      expected = 200,
      origin = process.env.WEB_ORIGIN,
      cookie = this.cookie,
      token = this.token,
    } = {},
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        Origin: origin,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
    const nextCookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith('oyla_refresh='));
    if (nextCookie) this.cookie = nextCookie.split(';')[0];
    if (result.accessToken) this.token = result.accessToken;
    return result;
  }
  async login(email) {
    return this.request('/auth/login', {
      method: 'POST',
      expected: 201,
      body: { email, password: process.env.DEMO_PASSWORD },
    });
  }
}
const admin = new Client(),
  teacher = new Client(),
  student = new Client(),
  other = new Client();
const runId = randomUUID().slice(0, 8);
const createdUsers = [],
  createdClasses = [],
  createdSubjects = [];
let checks = 0;
const pass = (name) => {
  checks++;
  console.log(`PASS ${name}`);
};
try {
  await new Client().request('/auth/login', {
    method: 'POST',
    expected: 401,
    body: { email: 'admin@oyla.uz', password: 'WrongPassword123' },
  });
  const adminLogin = await admin.login('admin@oyla.uz');
  const teacherLogin = await teacher.login('teacher@oyla.uz');
  assert.ok(!JSON.stringify(adminLogin.user).includes('passwordHash'));
  pass('authentication and safe user contracts');
  const password = randomBytes(20).toString('hex');
  const first = await student.request('/auth/register', {
    method: 'POST',
    expected: 201,
    body: { email: `e2e-${runId}@example.uz`, password, name: 'Integration Learner', grade: 6 },
  });
  createdUsers.push(first.user.id);
  const second = await other.request('/auth/register', {
    method: 'POST',
    expected: 201,
    body: { email: `e2e-other-${runId}@example.uz`, password, name: 'Other Learner', grade: 6 },
  });
  createdUsers.push(second.user.id);
  const staffFixture = await admin.request('/admin/users', {
    method: 'POST',
    expected: 201,
    body: {
      name: 'Integration Admin',
      email: `e2e-admin-${runId}@example.uz`,
      password,
      role: 'ADMIN',
    },
  });
  createdUsers.push(staffFixture.id);
  assert.equal(
    (
      await admin.request(`/admin/users/${staffFixture.id}`, {
        method: 'PATCH',
        body: { active: false },
      })
    ).active,
    false,
  );
  assert.equal(
    (
      await admin.request(`/admin/users/${first.user.id}`, {
        method: 'PATCH',
        body: { email: first.user.email.toUpperCase() },
      })
    ).email,
    first.user.email,
  );
  const firstLevel = (await admin.request('/admin/gamification')).levels.find(
    (l) => l.number === 1,
  );
  await admin.request(`/admin/levels/${firstLevel.id}`, {
    method: 'PATCH',
    expected: 400,
    body: { number: 2 },
  });
  await student.request('/admin/users', { expected: 403 });
  await student.request('/teacher/classes', { expected: 403 });
  await teacher.request('/students/me', { expected: 403 });
  await student.request('/auth/register', {
    method: 'POST',
    expected: 400,
    body: { email: 'exploit@example.uz', password, name: 'Exploit', grade: 6, role: 'ADMIN' },
  });
  await student.request('/attempts', { method: 'POST', expected: 400, body: { xp: 9999 } });
  await student.request('/attempts', {
    method: 'POST',
    expected: 403,
    origin: 'https://untrusted.example',
    body: {},
  });
  await student.request('/lessons/not-a-uuid', { expected: 400 });
  pass('RBAC, UUID validation, mass assignment, CSRF origin rejection');
  const subject = await admin.request('/admin/subjects', {
    method: 'POST',
    expected: 201,
    body: {
      title: 'Integration subject',
      slug: `integration-${runId}`,
      description: 'Test fixture for the complete learning flow.',
      status: 'PUBLISHED',
    },
  });
  createdSubjects.push(subject.id);
  const course = await admin.request('/admin/courses', {
    method: 'POST',
    expected: 201,
    body: { title: 'Integration course', subjectId: subject.id, grade: 6, status: 'PUBLISHED' },
  });
  const topic = await admin.request('/admin/topics', {
    method: 'POST',
    expected: 201,
    body: { title: 'Integration topic', courseId: course.id, status: 'PUBLISHED' },
  });
  const lesson = await admin.request('/admin/lessons', {
    method: 'POST',
    expected: 201,
    body: {
      title: 'Integration lesson',
      topicId: topic.id,
      youtubeUrl:
        'https://www.youtube.com/watch?v=l1RAFNhhB5k&list=RDl1RAFNhhB5k&start_radio=1&pp=oAcB0gcJCTcMAYcqIYzv',
    },
  });
  assert.equal(lesson.youtubeId, 'l1RAFNhhB5k');
  await student.request(`/lessons/${lesson.id}`, { expected: 404 });
  await admin.request(`/admin/lessons/${lesson.id}`, {
    method: 'PATCH',
    expected: 400,
    body: { status: 'PUBLISHED' },
  });
  const specs = [
    {
      type: 'MULTIPLE_CHOICE',
      text: 'Choose number four.',
      answer: 'b',
      options: [
        { text: '3', value: 'a' },
        { text: '4', value: 'b' },
      ],
    },
    { type: 'TRUE_FALSE', text: 'Two plus two equals four.', answer: 'true' },
    { type: 'NUMERICAL', text: 'Compute 6 plus 6.', answer: '12' },
    { type: 'TEXT', text: 'Write the word algorithm.', answer: 'algorithm|algoritm' },
  ];
  const questions = [];
  for (const [i, spec] of specs.entries())
    questions.push(
      await admin.request('/admin/questions', {
        method: 'POST',
        expected: 201,
        body: {
          ...spec,
          lessonId: lesson.id,
          explanation: 'The correct answer follows directly from the lesson.',
          position: i,
          status: 'PUBLISHED',
        },
      }),
    );
  await admin.request(`/admin/lessons/${lesson.id}`, {
    method: 'PATCH',
    body: { status: 'PUBLISHED' },
  });
  const publicLesson = await student.request(`/lessons/${lesson.id}`);
  assert.equal(publicLesson.questions.length, 4);
  assert.ok(publicLesson.questions.every((q) => !('answer' in q) && !('explanation' in q)));
  const subjectList = await student.request('/subjects');
  assert.ok(subjectList.some((s) => s.id === subject.id));
  pass('admin publishing lifecycle and hidden answer keys');
  const group = await admin.request('/admin/classes', {
    method: 'POST',
    expected: 201,
    body: { name: `e2e-${runId}`, grade: 6, teacherId: teacherLogin.user.id },
  });
  createdClasses.push(group.id);
  await admin.request(`/admin/classes/${group.id}/students`, {
    method: 'PUT',
    body: { studentIds: [first.user.id] },
  });
  const assignment = await teacher.request('/teacher/assignments', {
    method: 'POST',
    expected: 201,
    body: {
      classId: group.id,
      lessonId: lesson.id,
      title: 'Integration homework',
      deadline: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  const foreign = (await admin.request('/admin/classes')).find(
    (c) => c.teacherId !== teacherLogin.user.id,
  );
  if (foreign) {
    await teacher.request(`/teacher/classes/${foreign.id}`, { expected: 404 });
    await teacher.request('/teacher/assignments', {
      method: 'POST',
      expected: 404,
      body: {
        classId: foreign.id,
        lessonId: lesson.id,
        title: 'Unauthorized assignment',
        deadline: new Date(Date.now() + 86400000).toISOString(),
      },
    });
  }
  assert.ok(
    (await student.request('/students/me/assignments')).some((a) => a.id === assignment.id),
  );
  pass('teacher ownership, assignment creation and student delivery');
  const attempt = await student.request('/attempts', {
    method: 'POST',
    expected: 201,
    body: { lessonId: lesson.id },
  });
  const resumed = await student.request('/attempts', {
    method: 'POST',
    expected: 201,
    body: { lessonId: lesson.id },
  });
  assert.equal(resumed.id, attempt.id);
  await other.request(`/attempts/${attempt.id}`, { expected: 404 });
  await student.request(`/attempts/${attempt.id}/complete`, { method: 'POST', expected: 400 });
  await student.request(`/attempts/${attempt.id}/answers`, {
    method: 'POST',
    expected: 400,
    body: { questionId: questions[0].id, value: 'b', score: 100 },
  });
  const values = ['b', 'true', '12', ' ALGORITHM '];
  for (const [i, question] of questions.entries()) {
    const feedback = await student.request(`/attempts/${attempt.id}/answers`, {
      method: 'POST',
      expected: 201,
      body: { questionId: question.id, value: values[i] },
    });
    assert.equal(feedback.correct, true);
  }
  const rules = (await admin.request('/admin/gamification')).rules;
  const xpFor = (key) => rules.find((r) => r.key === key).amount;
  const completions = await Promise.all(
    Array.from({ length: 3 }, () =>
      student.request(`/attempts/${attempt.id}/complete`, { method: 'POST', expected: 201 }),
    ),
  );
  const result = completions[0];
  assert.equal(result.score, 100);
  assert.equal(result.earnedXp, xpFor('LESSON_COMPLETED') + 4 * xpFor('CORRECT_ANSWER'));
  for (const duplicate of completions) assert.deepEqual(duplicate, result);
  assert.equal(
    await db.xpTransaction.count({
      where: { userId: first.user.id, sourceKey: `lesson:${lesson.id}` },
    }),
    1,
  );
  const dashboard = await student.request('/students/me');
  assert.equal(dashboard.completedLessons, 1);
  assert.equal(dashboard.streak, 1);
  assert.equal(dashboard.topics.find((t) => t.id === topic.id).mastery, 100);
  const earnedBadges = await student.request('/badges');
  assert.ok(earnedBadges.find((b) => b.slug === 'first-lesson').unlockedAt);
  assert.ok(earnedBadges.find((b) => b.slug === 'perfect-score').unlockedAt);
  const classResults = await teacher.request(`/teacher/classes/${group.id}`);
  assert.equal(
    classResults.assignments.find((a) => a.id === assignment.id).submissions[0].score,
    100,
  );
  assert.ok(
    (await student.request('/leaderboards?scope=class')).some(
      (row) => row.userId === first.user.id,
    ),
  );
  pass(
    'four answer types, concurrent completion, XP ledger, mastery, streak, badges and assignment results',
  );
  const repeat = await student.request('/attempts', {
    method: 'POST',
    expected: 201,
    body: { lessonId: lesson.id },
  });
  for (const [i, question] of questions.entries())
    await student.request(`/attempts/${repeat.id}/answers`, {
      method: 'POST',
      expected: 201,
      body: { questionId: question.id, value: values[i] },
    });
  const repeated = await student.request(`/attempts/${repeat.id}/complete`, {
    method: 'POST',
    expected: 201,
  });
  assert.equal(repeated.earnedXp, 0);
  assert.equal(repeated.streak, 1);
  assert.equal(
    await db.userBadge.count({ where: { userId: first.user.id, badge: { slug: 'first-lesson' } } }),
    1,
  );
  pass('repeat lessons do not farm XP or duplicate badges');
  const yesterday = new Date(Date.now() + 5 * 3600000 - 86400000).toISOString().slice(0, 10);
  await db.streak.update({
    where: { userId: first.user.id },
    data: { current: 6, longest: 6, lastDay: yesterday },
  });
  const daily = await student.request('/attempts', { method: 'POST', expected: 201, body: {} });
  assert.equal(daily.questions.length, 5);
  for (const q of daily.questions) {
    const key = await db.question.findUniqueOrThrow({ where: { id: q.id } });
    const payload = key.grading ? { ...key.grading } : null;
    if (payload) {
      delete payload.radius;
      if (payload.text) payload.text = payload.text.split('|')[0];
      if (payload.values) payload.values = payload.values.map((v) => v.split('|')[0]);
    }
    await student.request(`/attempts/${daily.id}/answers`, {
      method: 'POST',
      expected: 201,
      body: { questionId: q.id, ...(payload ? { payload } : { value: key.answer.split('|')[0] }) },
    });
  }
  const dailyResult = await student.request(`/attempts/${daily.id}/complete`, {
    method: 'POST',
    expected: 201,
  });
  assert.equal(dailyResult.score, 100);
  assert.equal(dailyResult.streak, 7);
  assert.equal(
    dailyResult.earnedXp,
    xpFor('DAILY_CHALLENGE') + 5 * xpFor('CORRECT_ANSWER') + xpFor('STREAK_7'),
  );
  assert.equal(
    await db.xpTransaction.count({ where: { userId: first.user.id, type: 'STREAK' } }),
    1,
  );
  assert.ok((await student.request('/badges')).find((b) => b.slug === 'seven-day').unlockedAt);
  const dailyAgain = await student.request('/attempts', {
    method: 'POST',
    expected: 201,
    body: {},
  });
  assert.equal(dailyAgain.id, daily.id);
  assert.equal(
    (await student.request(`/attempts/${daily.id}/complete`, { method: 'POST', expected: 201 }))
      .earnedXp,
    dailyResult.earnedXp,
  );
  assert.equal(
    await db.xpTransaction.count({ where: { userId: first.user.id, type: 'DAILY_CHALLENGE' } }),
    1,
  );
  pass('daily challenge snapshots and duplicate reward prevention');
  await admin.request(`/admin/topics/${topic.id}`, { method: 'PATCH', body: { status: 'DRAFT' } });
  await student.request(`/lessons/${lesson.id}`, { expected: 404 });
  await admin.request(`/admin/topics/${topic.id}`, {
    method: 'PATCH',
    body: { status: 'PUBLISHED' },
  });
  pass('unpublishing a parent hides its lessons');
  const oldCookie = student.cookie;
  await student.request('/auth/refresh', { method: 'POST', expected: 201 });
  assert.notEqual(student.cookie, oldCookie);
  await new Client().request('/auth/refresh', { method: 'POST', expected: 401, cookie: oldCookie });
  const previousToken = student.token;
  await student.request('/auth/logout', { method: 'POST', expected: 201 });
  await student.request('/auth/me', { expected: 401, token: previousToken });
  pass('refresh rotation, replay rejection and logout session revocation');
  await verifyAccountFeatures({
    db,
    base,
    Client,
    admin,
    student,
    other,
    first,
    second,
    password,
    createdUsers,
    createdClasses,
    pass,
  });
  await verifyTeachingAndFriends({
    db,
    Client,
    admin,
    password,
    createdUsers,
    createdClasses,
    createdSubjects,
    pass,
  });
  console.log(`${checks} end-to-end groups passed against PostgreSQL and Redis.`);
} finally {
  // Remove only fixtures created by this run, preserving seeded and user data.
  for (const classId of createdClasses) await db.class.deleteMany({ where: { id: classId } });
  for (const userId of createdUsers) await db.user.deleteMany({ where: { id: userId } });
  for (const subjectId of createdSubjects) {
    const courses = await db.course.findMany({ where: { subjectId }, select: { id: true } });
    const topics = await db.topic.findMany({
      where: { courseId: { in: courses.map((c) => c.id) } },
      select: { id: true },
    });
    const lessons = await db.lesson.findMany({
      where: { topicId: { in: topics.map((t) => t.id) } },
      select: { id: true },
    });
    await db.question.deleteMany({ where: { lessonId: { in: lessons.map((l) => l.id) } } });
    await db.lesson.deleteMany({ where: { id: { in: lessons.map((l) => l.id) } } });
    await db.topic.deleteMany({ where: { id: { in: topics.map((t) => t.id) } } });
    await db.course.deleteMany({ where: { id: { in: courses.map((c) => c.id) } } });
    await db.subject.deleteMany({ where: { id: subjectId } });
  }
  await db.$disconnect();
}
