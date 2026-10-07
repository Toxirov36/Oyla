import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../src/common/validation';
import {
  ChangePasswordDto,
  ResetPasswordDto,
  PasswordResetRequestDto,
} from '../src/auth/password.dto';
import { UpdateUserDto } from '../src/admin/admin.dto';
import { FriendRequestDto, AcceptFriendDto } from '../src/friends/friends.dto';
import {
  NotificationQueryDto,
  ReadNotificationDto,
  ReadAllNotificationsDto,
} from '../src/notifications/notifications.dto';
const pipe = createValidationPipe();
test('friendship DTOs accept only private invite codes and explicit recipient acceptance', async () => {
  const valid = await pipe.transform(
    { code: '  AbCd0123456789_-  ' },
    { type: 'body', metatype: FriendRequestDto },
  );
  assert.equal(valid.code, 'AbCd0123456789_-');
  for (const body of [
    { code: null },
    { code: 'short' },
    { code: 'AbCd0123456789_-', status: 'ACCEPTED' },
  ])
    await assert.rejects(
      pipe.transform(body, { type: 'body', metatype: FriendRequestDto }),
      BadRequestException,
    );
  for (const body of [{ accept: false }, { accept: 'true' }, { requestedById: 'other' }])
    await assert.rejects(
      pipe.transform(body, { type: 'body', metatype: AcceptFriendDto }),
      BadRequestException,
    );
  assert.equal(
    (await pipe.transform({}, { type: 'body', metatype: AcceptFriendDto })).accept,
    true,
  );
});
test('password operations reject weak passwords and account/token mass assignment', async () => {
  for (const body of [
    { currentPassword: 'previous-password', newPassword: 'short' },
    { currentPassword: 'previous-password', newPassword: 'new-password-123', userId: 'other-user' },
    { currentPassword: 'previous-password', newPassword: null },
  ])
    await assert.rejects(
      pipe.transform(body, { type: 'body', metatype: ChangePasswordDto }),
      BadRequestException,
    );
  await assert.rejects(
    pipe.transform(
      { token: 'bad-token', newPassword: 'new-password-123' },
      { type: 'body', metatype: ResetPasswordDto },
    ),
    BadRequestException,
  );
  const recovery = await pipe.transform(
    { email: ' USER@EXAMPLE.UZ ' },
    { type: 'body', metatype: PasswordResetRequestDto },
  );
  assert.equal(recovery.email, 'user@example.uz');
});
test('only declared roles and explicit notification query booleans are accepted', async () => {
  await assert.rejects(
    pipe.transform({ role: 'SUPERADMIN' }, { type: 'body', metatype: UpdateUserDto }),
    BadRequestException,
  );
  const valid = await pipe.transform(
    { role: 'ADMIN', teacherAccess: true },
    { type: 'body', metatype: UpdateUserDto },
  );
  assert.equal(valid.role, 'ADMIN');
  assert.equal(
    (
      await pipe.transform(
        { unreadOnly: 'false' },
        { type: 'query', metatype: NotificationQueryDto },
      )
    ).unreadOnly,
    false,
  );
  await assert.rejects(
    pipe.transform({ unreadOnly: '1' }, { type: 'query', metatype: NotificationQueryDto }),
    BadRequestException,
  );
  await assert.rejects(
    pipe.transform({ read: false }, { type: 'body', metatype: ReadAllNotificationsDto }),
    BadRequestException,
  );
  await assert.rejects(
    pipe.transform({ userId: 'other-user' }, { type: 'body', metatype: ReadNotificationDto }),
    BadRequestException,
  );
  assert.equal(
    (await pipe.transform({ read: false }, { type: 'body', metatype: ReadNotificationDto })).read,
    false,
  );
  await assert.rejects(
    pipe.transform({ type: 'INTERVIEW' }, { type: 'query', metatype: NotificationQueryDto }),
    BadRequestException,
  );
});
