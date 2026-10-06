import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { createValidationPipe } from '../src/common/validation';
import { RegisterDto } from '../src/auth/auth.dto';
import { AnswerDto } from '../src/learning/learning.dto';
import { PaginationDto } from '../src/common/dto';
import {
  QuestionDto,
  UpdateQuestionDto,
  UpdateSubjectDto,
  UpdateUserDto,
} from '../src/admin/admin.dto';
const pipe = createValidationPipe();
const valid = {
  email: 'learner@example.uz',
  password: 'SecurePassword123!',
  name: 'Ali Valiyev',
  grade: 6,
};
test('register DTO rejects privilege and numeric-string mass assignment', async () => {
  for (const payload of [
    { ...valid, role: 'ADMIN' },
    { ...valid, xp: 9999 },
    { ...valid, grade: '6' },
    { ...valid, grade: 8 },
    { ...valid, email: 'no-email' },
  ])
    await assert.rejects(
      pipe.transform(payload, { type: 'body', metatype: RegisterDto }),
      BadRequestException,
    );
  const dto = await pipe.transform(valid, { type: 'body', metatype: RegisterDto });
  assert.ok(dto instanceof RegisterDto);
});
test('unknown answer XP and score are rejected', async () => {
  await assert.rejects(
    pipe.transform(
      { questionId: 'a3123412-3312-4312-a312-341234123412', value: 'true', xp: 1000, score: 100 },
      { type: 'body', metatype: AnswerDto },
    ),
    BadRequestException,
  );
});
test('pagination converts only valid query numbers and limits page size', async () => {
  const dto = await pipe.transform(
    { page: '2', limit: '10' },
    { type: 'query', metatype: PaginationDto },
  );
  assert.equal(dto.page, 2);
  for (const limit of ['-1', '101', '1.5', '', 'foo'])
    await assert.rejects(
      pipe.transform({ limit }, { type: 'query', metatype: PaginationDto }),
      BadRequestException,
    );
});
test('nested options reject undeclared fields and validation errors never include secrets', async () => {
  try {
    await pipe.transform(
      {
        lessonId: 'a3123412-3312-4312-a312-341234123412',
        text: 'Choose an answer',
        type: 'MULTIPLE_CHOICE',
        answer: 'a',
        explanation: 'The first option is right.',
        options: [{ text: 'A', value: 'a', secret: 'DO_NOT_RETURN' }],
      },
      { type: 'body', metatype: QuestionDto },
    );
    assert.fail('Expected validation error');
  } catch (e) {
    assert.ok(e instanceof BadRequestException);
    const body = JSON.stringify(e.getResponse());
    assert.ok(body.includes('options.0.secret'));
    assert.ok(!body.includes('DO_NOT_RETURN'));
  }
});
test('optional fields do not accept null or string booleans', async () => {
  for (const payload of [{ active: 'false' }, { name: null }, { grade: null }])
    await assert.rejects(
      pipe.transform(payload, { type: 'body', metatype: UpdateUserDto }),
      BadRequestException,
    );
});
test('updated emails use the same normalization as login', async () => {
  const dto = await pipe.transform(
    { email: ' LEARNER@EXAMPLE.UZ ' },
    { type: 'body', metatype: UpdateUserDto },
  );
  assert.equal(dto.email, 'learner@example.uz');
});
test('PATCH DTOs do not inject create defaults that overwrite existing values', async () => {
  const subject = await pipe.transform(
    { title: 'Updated subject' },
    { type: 'body', metatype: UpdateSubjectDto },
  );
  assert.equal(subject.status, undefined);
  assert.equal(subject.position, undefined);
  const question = await pipe.transform(
    { status: 'PUBLISHED' },
    { type: 'body', metatype: UpdateQuestionDto },
  );
  assert.equal(question.options, undefined);
  assert.equal(question.xp, undefined);
  assert.equal(question.difficulty, undefined);
});
