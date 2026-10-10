import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { weekStart } from '../apps/api/src/learning/calendar.ts';

export async function verifyTeachingAndFriends({
  db,
  Client,
  admin,
  password,
  createdUsers,
  createdClasses,
  createdSubjects,
  pass,
}) {
  const suffix = randomUUID();
  const accounts = [];
  for (const [name, grade] of [
    ['Topic learner', 6],
    ['Friend learner', 6],
    ['Zero XP learner', 6],
    ['Inactive learner', 6],
    ['Outside learner', 7],
  ]) {
    const client = new Client();
    const result = await client.request('/auth/register', {
      method: 'POST',
      expected: 201,
      body: {
        name,
        email: `${name.split(' ')[0].toLowerCase()}-${suffix}@example.uz`,
        password,
        grade,
      },
    });
    createdUsers.push(result.user.id);
    accounts.push({ client, user: result.user });
  }
  const [a, b, c, inactive, outside] = accounts;
  await db.user.update({ where: { id: inactive.user.id }, data: { active: false } });
  const teacher = await admin.request('/admin/users', {
    method: 'POST',
    expected: 201,
    body: {
      name: 'Analytics teacher',
      email: `analytics-${suffix}@example.uz`,
      password,
      role: 'TEACHER',
    },
  });
  createdUsers.push(teacher.id);
  const staff = new Client();
  await staff.request('/auth/login', {
    method: 'POST',
    expected: 201,
    body: { email: teacher.email, password },
  });
  const group = await db.class.create({
    data: { name: `Analytics ${suffix}`, grade: 6, teacherId: teacher.id },
  });
  createdClasses.push(group.id);
  await db.classStudent.createMany({
    data: [...accounts.map((x) => x.user.id), teacher.id].map((studentId) => ({
      classId: group.id,
      studentId,
    })),
  });
  const subject = await db.subject.create({
    data: {
      slug: `analytics-${suffix}`,
      title: 'Analytics fixture',
      description: 'Isolated test content',
      status: 'PUBLISHED',
    },
  });
  createdSubjects.push(subject.id);
  const course = await db.course.create({
    data: { subjectId: subject.id, grade: 6, title: 'Analytics grade 6', status: 'PUBLISHED' },
  });
  const makeLesson = async (
    title,
    courseId = course.id,
    status = 'PUBLISHED',
    topicStatus = 'PUBLISHED',
  ) =>
    db.lesson.create({
      data: {
        title,
        explanation: 'Fixture explanation',
        example: 'Fixture example',
        status,
        topic: { create: { title, courseId, status: topicStatus } },
      },
      include: { topic: true },
    });
  const weak = await makeLesson('Weak topic');
  const strong = await makeLesson('Strong topic');
  const empty = await makeLesson('Unstarted topic');
  const oldCourse = await db.course.create({
    data: { subjectId: subject.id, grade: 7, title: 'Old grade', status: 'PUBLISHED' },
  });
  const draftCourse = await db.course.create({
    data: { subjectId: subject.id, grade: 6, title: 'Draft course', status: 'DRAFT' },
  });
  const hiddenSubject = await db.subject.create({
    data: {
      slug: `hidden-${suffix}`,
      title: 'Hidden subject',
      description: 'Fixture',
      status: 'DRAFT',
    },
  });
  createdSubjects.push(hiddenSubject.id);
  const hiddenCourse = await db.course.create({
    data: {
      subjectId: hiddenSubject.id,
      grade: 6,
      title: 'Hidden subject course',
      status: 'PUBLISHED',
    },
  });
  const excluded = await Promise.all([
    makeLesson('Old grade lesson', oldCourse.id),
    makeLesson('Draft course lesson', draftCourse.id),
    makeLesson('Draft topic lesson', course.id, 'PUBLISHED', 'DRAFT'),
    makeLesson('Archived lesson', course.id, 'ARCHIVED'),
    makeLesson('Hidden subject lesson', hiddenCourse.id),
  ]);
  await db.progress.createMany({
    data: [
      { userId: a.user.id, lessonId: weak.id, bestScore: 40 },
      { userId: a.user.id, lessonId: strong.id, bestScore: 100 },
      { userId: b.user.id, lessonId: weak.id, bestScore: 100 },
      ...excluded.map((l) => ({ userId: a.user.id, lessonId: l.id, bestScore: 100 })),
    ],
  });
  const detail = await staff.request(`/teacher/classes/${group.id}`);
  assert.deepEqual(
    new Set(detail.students.map((x) => x.id)),
    new Set([a.user.id, b.user.id, c.user.id]),
  );
  const learning = detail.students.find((x) => x.id === a.user.id);
  assert.equal(learning.completed, 2);
  assert.equal(learning.mastery, 70);
  assert.equal(learning.needsHelp, true);
  assert.ok(excluded.every((l) => !learning.progress.some((p) => p.lessonId === l.id)));
  const dashboard = await a.client.request('/students/me');
  assert.equal(detail.totalLessons, dashboard.totalLessons);
  assert.equal(learning.completed, dashboard.completedLessons);
  assert.equal(
    learning.progressPercent,
    Math.round((dashboard.completedLessons / dashboard.totalLessons) * 100),
  );
  const weakTopic = detail.topics.find((t) => t.id === weak.topicId);
  assert.equal(weakTopic.mastery, 70);
  assert.equal(weakTopic.participants, 2);
  assert.equal(weakTopic.notStarted, 1);
  assert.equal(weakTopic.struggling, 1);
  assert.equal(weakTopic.suggestedLesson.id, weak.id);
  assert.equal(detail.topics.find((t) => t.id === empty.topicId).mastery, null);
  assert.deepEqual(
    detail.studentsNeedingHelp.map((x) => x.id),
    [a.user.id],
  );
  const foreign = new Client();
  await foreign.login('teacher2@oyla.uz');
  await foreign.request(`/teacher/classes/${group.id}`, { expected: 404 });
  await a.client.request(`/teacher/classes/${group.id}`, { expected: 403 });
  const assignment = await staff.request('/teacher/assignments', {
    method: 'POST',
    expected: 201,
    body: {
      classId: group.id,
      lessonId: weak.id,
      title: 'Focused practice',
    },
  });
  assert.equal(
    await db.notification.count({
      where: {
        type: 'ASSIGNMENT',
        body: 'Focused practice',
        userId: { in: [...accounts.map((x) => x.user.id), teacher.id] },
      },
    }),
    3,
  );
  for (const [userId, late] of [
    [a.user.id, false],
    [inactive.user.id, true],
  ]) {
    const attempt = await db.attempt.create({
      data: {
        userId,
        lessonId: weak.id,
        questionIds: [],
        status: 'COMPLETED',
        score: 70,
        completedAt: new Date(),
      },
    });
    await db.assignmentSubmission.create({
      data: { assignmentId: assignment.id, userId, attemptId: attempt.id, score: 70, late },
    });
  }
  const report = (await staff.request('/teacher/assignments')).find((x) => x.id === assignment.id);
  assert.deepEqual(report.completion, { completed: 1, total: 3, late: 0, historical: 1 });
  assert.equal(report.submissions.length, 2);
  pass(
    'teacher calculations match dashboard, exclude hidden/old content, classify weak topics and preserve historical submissions',
  );

  const peerClass = await db.class.create({
    data: {
      name: `Other class ${suffix}`,
      grade: 6,
      teacherId: teacher.id,
      students: { create: [{ studentId: b.user.id }, { studentId: c.user.id }] },
    },
  });
  const secondClass = await db.class.create({
    data: {
      name: `Second class ${suffix}`,
      grade: 6,
      teacherId: teacher.id,
      students: { create: [{ studentId: a.user.id }, { studentId: c.user.id }] },
    },
  });
  createdClasses.push(peerClass.id, secondClass.id);
  await db.assignment.createMany({
    data: [
      {
        classId: group.id,
        lessonId: weak.id,
        title: 'Overdue class task',
        deadline: new Date(Date.now() - 86400000),
      },
      {
        classId: group.id,
        lessonId: excluded[0].id,
        title: 'Wrong grade task',
        deadline: new Date(Date.now() + 86400000),
      },
      {
        classId: group.id,
        lessonId: excluded[3].id,
        title: 'Archived task',
        deadline: new Date(Date.now() + 86400000),
      },
      {
        classId: peerClass.id,
        lessonId: weak.id,
        title: 'Other class task',
        deadline: new Date(Date.now() + 86400000),
      },
    ],
  });
  const peerAttempt = await db.attempt.create({
    data: {
      userId: b.user.id,
      lessonId: weak.id,
      questionIds: [],
      status: 'COMPLETED',
      score: 99,
      completedAt: new Date(),
    },
  });
  await db.assignmentSubmission.create({
    data: {
      assignmentId: assignment.id,
      userId: b.user.id,
      attemptId: peerAttempt.id,
      score: 99,
      late: false,
    },
  });
  await new Client().request('/students/me/classes', { expected: 401 });
  await staff.request('/students/me/classes', { expected: 403 });
  const ownClasses = await a.client.request('/students/me/classes');
  assert.deepEqual(new Set(ownClasses.map((x) => x.id)), new Set([group.id, secondClass.id]));
  await a.client.request(`/students/me/classes/${peerClass.id}`, { expected: 404 });
  await outside.client.request(`/students/me/classes/${group.id}`, { expected: 404 });
  assert.equal((await outside.client.request('/users/me/profile')).student.classes.length, 0);
  await a.client.request('/students/me/classes/not-a-uuid', { expected: 400 });
  const avatarCatalog = await b.client.request('/avatars');
  await b.client.request('/users/me/profile', {
    method: 'PATCH',
    body: { avatarId: avatarCatalog[0].id },
  });
  const studentClass = await a.client.request(`/students/me/classes/${group.id}`);
  assert.equal(studentClass.studentCount, 3);
  assert.deepEqual(
    new Set(studentClass.members.map((x) => x.id)),
    new Set([a.user.id, b.user.id, c.user.id]),
  );
  assert.deepEqual(Object.keys(studentClass.teacher), ['name']);
  for (const member of studentClass.members) {
    assert.deepEqual(Object.keys(member).sort(), ['avatar', 'friendship', 'id', 'isMe', 'name']);
    if (member.avatar)
      assert.deepEqual(Object.keys(member.avatar).sort(), ['id', 'imageUrl', 'name']);
  }
  assert.equal(
    studentClass.members.find((member) => member.id === b.user.id).avatar.id,
    avatarCatalog[0].id,
  );
  const serialized = JSON.stringify(studentClass);
  assert.ok(!serialized.includes(b.user.email));
  assert.ok(!serialized.includes('passwordHash'));
  assert.ok(!serialized.includes('inviteCode'));
  assert.equal(studentClass.assignments.length, 2);
  const ownTask = studentClass.assignments.find((x) => x.id === assignment.id);
  assert.equal(ownTask.submissions.length, 1);
  assert.equal(ownTask.submissions[0].score, 70);
  assert.equal(
    (await a.client.request(`/students/me/classes/${secondClass.id}`)).assignments.length,
    0,
  );
  await a.client.request(`/leaderboards?scope=class&classId=${peerClass.id}`, { expected: 404 });
  assert.ok(
    (await a.client.request(`/leaderboards?scope=class&classId=${group.id}`)).every((x) =>
      [a.user.id, b.user.id, c.user.id].includes(x.userId),
    ),
  );
  await a.client.request('/friends/classmates', {
    method: 'POST',
    expected: 400,
    body: { classId: group.id, userId: c.user.id, status: 'ACCEPTED' },
  });
  for (const [classId, userId] of [
    [peerClass.id, c.user.id],
    [group.id, outside.user.id],
    [group.id, inactive.user.id],
  ])
    await a.client.request('/friends/classmates', {
      method: 'POST',
      expected: 404,
      body: { classId, userId },
    });
  await a.client.request('/friends/classmates', {
    method: 'POST',
    expected: 400,
    body: { classId: group.id, userId: a.user.id },
  });
  const classRequest = await a.client.request('/friends/classmates', {
    method: 'POST',
    expected: 201,
    body: { classId: group.id, userId: c.user.id },
  });
  const duplicate = await a.client.request('/friends/classmates', {
    method: 'POST',
    expected: 201,
    body: { classId: secondClass.id, userId: c.user.id },
  });
  assert.equal(duplicate.id, classRequest.id);
  assert.equal(
    (await a.client.request(`/students/me/classes/${group.id}`)).members.find(
      (x) => x.id === c.user.id,
    ).friendship.state,
    'OUTGOING',
  );
  assert.equal(
    (await c.client.request(`/students/me/classes/${group.id}`)).members.find(
      (x) => x.id === a.user.id,
    ).friendship.state,
    'INCOMING',
  );
  assert.equal(await db.notification.count({ where: { userId: c.user.id, type: 'FRIEND' } }), 1);
  await c.client.request(`/friends/requests/${classRequest.id}/accept`, {
    method: 'PATCH',
    body: {},
  });
  assert.equal(
    (await a.client.request(`/students/me/classes/${secondClass.id}`)).members.find(
      (x) => x.id === c.user.id,
    ).friendship.state,
    'FRIENDS',
  );
  await a.client.request(`/friends/${classRequest.id}`, { method: 'DELETE' });
  await db.notification.deleteMany({
    where: { userId: { in: [a.user.id, c.user.id] }, type: 'FRIEND' },
  });
  pass(
    'student classes enforce membership and grade, expose a private roster and own submissions, and send consent-based classmate requests across multiple classes',
  );

  const pa = await a.client.request('/friends'),
    pb = await b.client.request('/friends'),
    pc = await c.client.request('/friends'),
    pe = await outside.client.request('/friends');
  await staff.request('/friends', { expected: 403 });
  await a.client.request('/friends/requests', {
    method: 'POST',
    expected: 400,
    body: { code: pa.inviteCode },
  });
  await a.client.request('/friends/requests', {
    method: 'POST',
    expected: 400,
    body: { code: pb.inviteCode, userId: b.user.id, status: 'ACCEPTED' },
  });
  await a.client.request('/friends/requests', {
    method: 'POST',
    expected: 404,
    body: { code: '0000000000000000' },
  });
  const request = await a.client.request('/friends/requests', {
    method: 'POST',
    expected: 201,
    body: { code: pb.inviteCode },
  });
  await Promise.all(
    Array.from({ length: 3 }, () =>
      a.client.request('/friends/requests', {
        method: 'POST',
        expected: 201,
        body: { code: pb.inviteCode },
      }),
    ),
  );
  const reciprocal = await b.client.request('/friends/requests', {
    method: 'POST',
    expected: 201,
    body: { code: pa.inviteCode },
  });
  assert.equal(reciprocal.state, 'INCOMING');
  assert.equal(
    await db.friendship.count({
      where: {
        userLowId: { in: [a.user.id, b.user.id] },
        userHighId: { in: [a.user.id, b.user.id] },
      },
    }),
    1,
  );
  assert.equal(await db.notification.count({ where: { userId: b.user.id, type: 'FRIEND' } }), 1);
  await a.client.request(`/friends/requests/${request.id}/accept`, {
    method: 'PATCH',
    expected: 403,
    body: {},
  });
  await c.client.request(`/friends/requests/${request.id}/accept`, {
    method: 'PATCH',
    expected: 404,
    body: {},
  });
  await c.client.request(`/friends/${request.id}`, { method: 'DELETE', expected: 404 });
  await b.client.request(`/friends/requests/${request.id}/accept`, {
    method: 'PATCH',
    expected: 400,
    body: { accept: false },
  });
  await Promise.all(
    Array.from({ length: 3 }, () =>
      b.client.request(`/friends/requests/${request.id}/accept`, { method: 'PATCH', body: {} }),
    ),
  );
  assert.equal(await db.notification.count({ where: { userId: a.user.id, type: 'FRIEND' } }), 1);
  const zero = await a.client.request('/friends/requests', {
    method: 'POST',
    expected: 201,
    body: { code: pc.inviteCode },
  });
  await c.client.request(`/friends/requests/${zero.id}/accept`, { method: 'PATCH', body: {} });
  await a.client.request('/friends/requests', {
    method: 'POST',
    expected: 201,
    body: { code: pe.inviteCode },
  });
  const week = weekStart();
  await db.xpTransaction.createMany({
    data: [
      { userId: a.user.id, amount: 10, type: 'TEST', sourceKey: `friends:a:${suffix}` },
      { userId: b.user.id, amount: 40, type: 'TEST', sourceKey: `friends:b:${suffix}` },
      {
        userId: b.user.id,
        amount: 1000,
        type: 'TEST',
        sourceKey: `friends:old:${suffix}`,
        createdAt: new Date(week.getTime() - 1),
      },
      {
        userId: outside.user.id,
        amount: 9999,
        type: 'TEST',
        sourceKey: `friends:outside:${suffix}`,
      },
    ],
  });
  const ranks = await a.client.request('/leaderboards?scope=friends');
  assert.deepEqual(
    ranks.map((x) => [x.userId, x.xp, x.rank]),
    [
      [b.user.id, 40, 1],
      [a.user.id, 10, 2],
      [c.user.id, 0, 3],
    ],
  );
  assert.equal(ranks[1].isMe, true);
  const classRanks = await a.client.request(`/leaderboards?scope=class&classId=${group.id}`);
  assert.deepEqual(
    classRanks.map((row) => [row.userId, row.xp]),
    [
      [b.user.id, 1040],
      [a.user.id, 10],
    ],
  );
  const privateView = await a.client.request('/friends');
  assert.equal(privateView.friends.length, 2);
  assert.ok(!JSON.stringify(privateView).includes(b.user.email));
  assert.ok(!JSON.stringify(privateView).includes(pb.inviteCode));
  await db.user.update({ where: { id: b.user.id }, data: { active: false } });
  assert.equal((await a.client.request('/leaderboards?scope=friends')).length, 2);
  await a.client.request(`/friends/${request.id}`, { method: 'DELETE' });
  await admin.request(`/admin/users/${c.user.id}`, { method: 'PATCH', body: { role: 'TEACHER' } });
  assert.equal(await db.friendProfile.count({ where: { userId: c.user.id } }), 0);
  assert.equal(
    await db.friendship.count({
      where: { OR: [{ userLowId: c.user.id }, { userHighId: c.user.id }] },
    }),
    0,
  );
  assert.equal((await a.client.request('/leaderboards?scope=friends')).length, 1);
  pass(
    'private friend requests, recipient consent, concurrency, notification deduplication and weekly accepted-friends ranking including zero XP',
  );
}
