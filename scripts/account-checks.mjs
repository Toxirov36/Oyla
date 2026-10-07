import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';

export async function verifyAccountFeatures({
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
}) {
  const email = first.user.email;
  const login = (client, accountEmail, accountPassword) =>
    client.request('/auth/login', {
      method: 'POST',
      expected: 201,
      body: { email: accountEmail, password: accountPassword },
    });
  const recoveryPath = `/admin/users?search=${encodeURIComponent(email)}`;
  try {
    const history = await db.progress.count({ where: { userId: first.user.id } });
    const totalXp = (
      await db.xpTransaction.aggregate({ where: { userId: first.user.id }, _sum: { amount: true } })
    )._sum.amount;
    await login(student, email, password);
    const priorCookie = student.cookie;
    await student.request(`/admin/users/${first.user.id}`, {
      method: 'PATCH',
      expected: 403,
      body: { role: 'ADMIN' },
    });
    const promoted = await admin.request(`/admin/users/${first.user.id}`, {
      method: 'PATCH',
      body: { role: 'TEACHER' },
    });
    assert.equal(promoted.role, 'TEACHER');
    assert.ok(await db.teacherProfile.findUnique({ where: { userId: first.user.id } }));
    assert.equal(await db.classStudent.count({ where: { studentId: first.user.id } }), 0);
    await student.request('/auth/me', { expected: 401 });
    await new Client().request('/auth/refresh', {
      method: 'POST',
      expected: 401,
      cookie: priorCookie,
    });
    await login(student, email, password);
    await student.request('/teacher/classes');
    await student.request('/students/me', { expected: 403 });
    const group = await admin.request('/admin/classes', {
      method: 'POST',
      expected: 201,
      body: { name: `Account check ${first.user.id}`, grade: 6, teacherId: first.user.id },
    });
    createdClasses.push(group.id);
    await admin.request(`/admin/users/${first.user.id}`, {
      method: 'PATCH',
      expected: 400,
      body: { role: 'STUDENT' },
    });
    await admin.request(`/admin/users/${first.user.id}`, {
      method: 'PATCH',
      body: { role: 'ADMIN', teacherAccess: true },
    });
    await login(student, email, password);
    await student.request('/teacher/classes');
    await student.request('/admin/users');
    await student.request(`/admin/users/${first.user.id}`, {
      method: 'PATCH',
      expected: 400,
      body: { role: 'STUDENT' },
    });
    const seededTeacher = await db.user.findUniqueOrThrow({ where: { email: 'teacher@oyla.uz' } });
    await admin.request(`/admin/classes/${group.id}`, {
      method: 'PATCH',
      body: { teacherId: seededTeacher.id },
    });
    await admin.request(`/admin/users/${first.user.id}`, {
      method: 'PATCH',
      body: { role: 'STUDENT', grade: 6 },
    });
    assert.equal(await db.progress.count({ where: { userId: first.user.id } }), history);
    assert.equal(
      (
        await db.xpTransaction.aggregate({
          where: { userId: first.user.id },
          _sum: { amount: true },
        })
      )._sum.amount,
      totalXp,
    );
    await login(student, email, password);
    await student.request('/teacher/classes', { expected: 403 });
    const newTeacher = await admin.request('/admin/users', {
      method: 'POST',
      expected: 201,
      body: {
        name: 'Account transition fixture',
        email: `transition-${first.user.id}@example.uz`,
        password,
        role: 'TEACHER',
      },
    });
    createdUsers.push(newTeacher.id);
    await admin.request(`/admin/users/${newTeacher.id}`, {
      method: 'PATCH',
      expected: 400,
      body: { role: 'STUDENT' },
    });
    await admin.request(`/admin/users/${newTeacher.id}`, {
      method: 'PATCH',
      body: { role: 'STUDENT', grade: 7 },
    });
    pass(
      'role changes preserve learning history, revoke sessions, protect own admin role and class ownership',
    );

    const separateSession = new Client();
    await login(separateSession, email, password);
    const changedPassword = randomBytes(24).toString('hex');
    await student.request('/users/me/password', {
      method: 'POST',
      expected: 400,
      body: { currentPassword: 'Incorrect-password', newPassword: changedPassword },
    });
    await student.request('/users/me/password', {
      method: 'POST',
      expected: 400,
      body: { currentPassword: password, newPassword: password },
    });
    await student.request('/users/me/password', {
      method: 'POST',
      expected: 400,
      body: { currentPassword: password, newPassword: changedPassword, userId: second.user.id },
    });
    const oldRefreshCookie = separateSession.cookie;
    await student.request('/users/me/password', {
      method: 'POST',
      expected: 201,
      body: { currentPassword: password, newPassword: changedPassword },
    });
    await separateSession.request('/auth/me', { expected: 401 });
    await new Client().request('/auth/refresh', {
      method: 'POST',
      expected: 401,
      cookie: oldRefreshCookie,
    });
    await new Client().request('/auth/login', {
      method: 'POST',
      expected: 401,
      body: { email, password },
    });
    await login(student, email, changedPassword);
    pass('password changes require the old password and revoke every existing session');

    const anonymous = new Client();
    const known = await anonymous.request('/auth/password-reset/request', {
      method: 'POST',
      expected: 201,
      body: { email },
    });
    const unknown = await anonymous.request('/auth/password-reset/request', {
      method: 'POST',
      expected: 201,
      body: { email: `unknown-${first.user.id}@example.uz` },
    });
    assert.deepEqual(known, unknown);
    const requestCount = await db.notification.count({ where: { link: recoveryPath } });
    assert.ok(requestCount > 0);
    await anonymous.request('/auth/password-reset/request', {
      method: 'POST',
      expected: 201,
      body: { email },
    });
    assert.equal(await db.notification.count({ where: { link: recoveryPath } }), requestCount);
    await other.request(`/admin/users/${first.user.id}/password-reset`, {
      method: 'POST',
      expected: 403,
    });
    const issue = () =>
      admin.request(`/admin/users/${first.user.id}/password-reset`, {
        method: 'POST',
        expected: 201,
      });
    const rawToken = (result) =>
      new URLSearchParams(new URL(result.resetUrl).hash.slice(1)).get('token');
    const expired = rawToken(await issue());
    const expiredHash = createHash('sha256').update(expired).digest('hex');
    const tokenRow = await db.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: expiredHash },
    });
    assert.notEqual(tokenRow.tokenHash, expired);
    await db.passwordResetToken.update({
      where: { id: tokenRow.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await anonymous.request('/auth/password-reset/confirm', {
      method: 'POST',
      expected: 400,
      body: { token: expired, newPassword: changedPassword },
    });
    const replaced = rawToken(await issue());
    const valid = rawToken(await issue());
    await anonymous.request('/auth/password-reset/confirm', {
      method: 'POST',
      expected: 400,
      body: { token: replaced, newPassword: changedPassword },
    });
    const recoveredPassword = randomBytes(24).toString('hex');
    const responses = await Promise.all(
      [1, 2].map(() =>
        fetch(`${base}/auth/password-reset/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: process.env.WEB_ORIGIN },
          body: JSON.stringify({ token: valid, newPassword: recoveredPassword }),
        }),
      ),
    );
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 400]);
    await student.request('/auth/me', { expected: 401 });
    await anonymous.request('/auth/password-reset/confirm', {
      method: 'POST',
      expected: 400,
      body: { token: valid, newPassword: changedPassword },
    });
    await new Client().request('/auth/login', {
      method: 'POST',
      expected: 401,
      body: { email, password: changedPassword },
    });
    await login(student, email, recoveredPassword);
    pass(
      'recovery hides account existence, limits requests, expires links and consumes tokens exactly once',
    );

    const privilegedLink = rawToken(await issue());
    await admin.request(`/admin/users/${first.user.id}`, {
      method: 'PATCH',
      body: { role: 'ADMIN' },
    });
    await anonymous.request('/auth/password-reset/confirm', {
      method: 'POST',
      expected: 400,
      body: { token: privilegedLink, newPassword: changedPassword },
    });
    await admin.request(`/admin/users/${first.user.id}`, {
      method: 'PATCH',
      body: { role: 'STUDENT', grade: 6 },
    });
    await login(student, email, recoveredPassword);
    const notifications = await db.notification.createManyAndReturn({
      data: Array.from({ length: 23 }, (_, index) => ({
        userId: first.user.id,
        title: `Account check notification ${index}`,
        type: index % 2 === 0 ? 'ASSIGNMENT' : 'BADGE',
        body: 'Owned account fixture',
        link: '/profile',
      })),
    });
    const otherNotification = await db.notification.create({
      data: {
        userId: second.user.id,
        title: 'Other account fixture',
        body: 'Private notification',
      },
    });
    const expectedCount = await db.notification.count({ where: { userId: first.user.id } });
    const page = await student.request('/notifications?page=2&limit=5');
    assert.equal(page.items.length, 5);
    assert.equal(page.total, expectedCount);
    assert.ok(!JSON.stringify(page).includes('Private notification'));
    await student.request('/notifications?unreadOnly=yes', { expected: 400 });
    await student.request('/notifications?type=INTERVIEW', { expected: 400 });
    const assignments = await student.request(
      '/notifications?type=ASSIGNMENT&search=Account%20check%20notification',
    );
    assert.equal(assignments.total, 12);
    assert.ok(assignments.items.every((item) => item.type === 'ASSIGNMENT'));
    await other.request(`/notifications/${notifications[0].id}/read`, {
      method: 'PATCH',
      expected: 404,
      body: {},
    });
    await student.request(`/notifications/${notifications[0].id}/read`, {
      method: 'PATCH',
      expected: 400,
      body: { userId: second.user.id },
    });
    await student.request(`/notifications/${notifications[0].id}/read`, {
      method: 'PATCH',
      body: {},
    });
    const readAt = (await db.notification.findUniqueOrThrow({ where: { id: notifications[0].id } }))
      .readAt;
    await student.request(`/notifications/${notifications[0].id}/read`, {
      method: 'PATCH',
      body: {},
    });
    assert.equal(
      (
        await db.notification.findUniqueOrThrow({ where: { id: notifications[0].id } })
      ).readAt.getTime(),
      readAt.getTime(),
    );
    await student.request('/notifications/read-all', { method: 'PATCH', body: {} });
    assert.equal((await student.request('/notifications/unread-count')).unreadCount, 0);
    assert.equal((await student.request('/notifications?unreadOnly=true')).total, 0);
    assert.equal(
      (await student.request('/notifications/read-all', { method: 'PATCH', body: {} })).updated,
      0,
    );
    assert.equal(
      (await db.notification.findUniqueOrThrow({ where: { id: otherNotification.id } })).readAt,
      null,
    );
    await student.request(`/notifications/${notifications[0].id}/read`, {
      method: 'PATCH',
      body: { read: false },
    });
    assert.equal((await student.request('/notifications/unread-count')).unreadCount, 1);
    await student.request(`/notifications/${notifications[0].id}/read`, {
      method: 'PATCH',
      body: { read: false },
    });
    assert.equal((await student.request('/notifications/unread-count')).unreadCount, 1);
    await other.request(`/notifications/${notifications[0].id}`, {
      method: 'DELETE',
      expected: 404,
    });
    await student.request(`/notifications/${notifications[0].id}`, { method: 'DELETE' });
    await student.request(`/notifications/${notifications[0].id}`, {
      method: 'DELETE',
      expected: 404,
    });
    assert.equal((await student.request('/notifications/unread-count')).unreadCount, 0);
    pass('notification filters, read/unread transitions and deletion enforce per-user ownership');
  } finally {
    await db.notification.deleteMany({ where: { link: recoveryPath } });
  }
}
