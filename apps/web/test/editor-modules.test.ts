import { describe, expect, it } from 'vitest';
import {
  buildCalendarCells,
  formatDisplayDate,
  padZero,
  parseValue,
} from '../src/components/ui/datetime-picker-utils';
import {
  buildDefinition,
  fromDefinition,
  lines,
} from '../src/components/exercises/question-editor-model';
import { exampleQuestion } from '../src/lib/exercise-examples';
import {
  classEditorSpec,
  contentEditorSpec,
  flattenContent,
  gameEditorSpec,
  isEligibleClassStudent,
} from '../src/pages/admin/editor-specs';
import type { AdminSubject, User } from '../src/lib/types';

describe('date-time picker helpers', () => {
  it('pads numbers and parses empty or invalid values to an 18:00 default', () => {
    expect(padZero(5)).toBe('05');
    for (const value of [undefined, '', 'not-a-date']) {
      const parsed = parseValue(value);
      expect(parsed.date).toBeNull();
      expect([parsed.hours, parsed.minutes]).toEqual([18, 0]);
    }
    const parsed = parseValue('2026-03-14T09:30');
    expect([parsed.year, parsed.month, parsed.day, parsed.hours, parsed.minutes]).toEqual([
      2026, 2, 14, 9, 30,
    ]);
  });

  it('formats display dates per locale and echoes unparseable text', () => {
    expect(formatDisplayDate('2026-03-14T09:30', 'uz')).toBe('14-mart 2026, 09:30');
    expect(formatDisplayDate('2026-03-14T09:30', 'ru')).toBe('14 марта 2026, 09:30');
    expect(formatDisplayDate('2026-03-14T09:30', 'en')).toBe('14 Mar 2026, 09:30');
    expect(formatDisplayDate('', 'en')).toBe('');
    expect(formatDisplayDate('garbage', 'en')).toBe('garbage');
  });

  it('builds a Monday-first grid that marks past days, today and the selection', () => {
    const today = new Date(2026, 2, 10); // Tuesday, 10 March 2026
    const selected = parseValue('2026-03-14T09:30');
    const cells = buildCalendarCells(2026, 2, selected, today);
    // March 2026 starts on a Sunday, so six leading days from February fill the Monday-first row.
    expect(cells.slice(0, 6).every((c) => !c.isCurrentMonth && c.isPast)).toBe(true);
    expect(cells[6]).toMatchObject({ day: 1, isCurrentMonth: true, isPast: true });
    expect(cells.length % 7).toBe(0);
    const current = cells.filter((c) => c.isCurrentMonth);
    expect(current).toHaveLength(31);
    expect(current.find((c) => c.isToday)?.day).toBe(10);
    expect(current.filter((c) => c.isSelected).map((c) => c.day)).toEqual([14]);
    expect(current.filter((c) => c.isPast)).toHaveLength(9);
  });

  it('does not mark a selection in a different month', () => {
    const cells = buildCalendarCells(
      2026,
      3,
      parseValue('2026-03-14T09:30'),
      new Date(2026, 2, 10),
    );
    expect(cells.some((c) => c.isSelected)).toBe(false);
    expect(cells.filter((c) => c.isCurrentMonth).every((c) => !c.isPast)).toBe(true);
  });
});

describe('question editor model', () => {
  it('splits text into trimmed non-empty lines', () => {
    expect(lines(' a \n\n b\n  ')).toEqual(['a', 'b']);
  });

  it('round-trips a multiple-choice example through the editor fields', () => {
    const example = exampleQuestion('MULTIPLE_CHOICE');
    const fields = fromDefinition(example);
    const rebuilt = buildDefinition({
      type: 'MULTIPLE_CHOICE',
      fields,
      selectedLesson: example.lessonId,
      tolerance: example.tolerance,
      wrongReasons: {},
    });
    expect(rebuilt.text).toBe(example.text);
    expect(rebuilt.answer).toBe(example.answer);
    expect(rebuilt.options.map((o) => o.text)).toEqual(example.options.map((o) => o.text));
    expect(rebuilt.config).toBeUndefined();
  });

  it('keeps pairings and wrong-answer reasons when building structured exercises', () => {
    const example = exampleQuestion('MATCH_PAIRS');
    const fields = fromDefinition(example);
    const rebuilt = buildDefinition({
      type: 'MATCH_PAIRS',
      fields,
      selectedLesson: example.lessonId,
      tolerance: example.tolerance,
      wrongReasons: {},
    });
    expect(rebuilt.answer).toBe('structured');
    // Item ids are regenerated positionally (i1.., t1..); the pairing itself must be preserved.
    const positional = (id: string, list?: { id: string }[], prefix = '') =>
      `${prefix}${(list?.findIndex((x) => x.id === id) ?? -1) + 1}`;
    expect(rebuilt.grading?.pairs).toEqual(
      example.grading?.pairs?.map((p) => ({
        left: positional(p.left, example.config?.items, 'i'),
        right: positional(p.right, example.config?.targets, 't'),
      })),
    );
    expect(rebuilt.config?.items?.map((i) => i.text)).toEqual(
      example.config?.items?.map((i) => i.text),
    );
    const choice = exampleQuestion('MULTIPLE_CHOICE');
    const withReasons = buildDefinition({
      type: 'MULTIPLE_CHOICE',
      fields: fromDefinition(choice),
      selectedLesson: choice.lessonId,
      tolerance: choice.tolerance,
      wrongReasons: { [choice.options[0]!.value]: ' Because. ', [choice.answer]: 'ignored' },
    });
    expect(withReasons.feedback?.wrongAnswers).toEqual([
      { value: choice.options[0]!.value, reason: 'Because.' },
    ]);
  });

  it('rejects malformed coordinates for point-based exercises', () => {
    const example = exampleQuestion('DRAW');
    const fields = { ...fromDefinition(example), answer: 'one, two' };
    expect(() =>
      buildDefinition({
        type: 'DRAW',
        fields,
        selectedLesson: example.lessonId,
        tolerance: example.tolerance,
        wrongReasons: {},
      }),
    ).toThrow();
  });
});

const tree = [
  {
    id: 's1',
    title: 'Mathematics',
    slug: 'mathematics',
    status: 'PUBLISHED',
    courses: [
      {
        id: 'c1',
        subjectId: 's1',
        title: 'Fractions',
        grade: 6,
        status: 'PUBLISHED',
        topics: [
          {
            id: 't1',
            courseId: 'c1',
            title: 'Basics',
            status: 'PUBLISHED',
            lessons: [{ id: 'l1', topicId: 't1', title: 'Halves', status: 'PUBLISHED' }],
          },
        ],
      },
    ],
  },
] as unknown as AdminSubject[];

describe('admin editor specs', () => {
  it('flattens the content tree into labelled select lists', () => {
    const { courses, topics, lessons } = flattenContent(tree);
    expect(courses.map((c) => c.id)).toEqual(['c1']);
    expect(topics[0]!.label).toContain('Basics');
    expect(lessons[0]!.label).toContain('Halves');
  });

  it('serializes course grades as numbers and drops an empty lesson video link', () => {
    const course = contentEditorSpec('courses', tree, '7', undefined, 's1');
    expect(course.endpoint).toBe('/admin/courses');
    expect(course.values).toMatchObject({ subjectId: 's1', grade: '7' });
    expect(course.serialize!({ grade: '6', title: 'x' })).toEqual({ grade: 6, title: 'x' });
    const lesson = contentEditorSpec('lessons', tree, '6', undefined, 't1');
    expect(lesson.serialize!({ title: 'x', youtubeUrl: '' })).toEqual({ title: 'x' });
    expect(lesson.fields.some((f) => f.key === 'status')).toBe(false);
    const existing = contentEditorSpec(
      'lessons',
      tree,
      '6',
      tree[0]!.courses[0]!.topics[0]!.lessons[0],
    );
    expect(existing.id).toBe('l1');
    expect(existing.fields.some((f) => f.key === 'status')).toBe(true);
    const prerequisite = existing.fields.find((f) => f.key === 'prerequisiteId')!;
    expect(prerequisite.options!.some((o) => o.value === 'l1')).toBe(false);
  });

  it('builds level and badge editors with the right fields', () => {
    expect(gameEditorSpec('levels').fields.map((f) => f.key)).toEqual([
      'number',
      'title',
      'threshold',
    ]);
    expect(gameEditorSpec('badges').fields.map((f) => f.key)).toEqual([
      'title',
      'slug',
      'description',
      'criterion',
      'threshold',
    ]);
  });

  it('offers only active teachers or teacher-enabled admins as class teachers', () => {
    const person = (id: string, role: User['role'], extra: Partial<User> = {}): User => ({
      id,
      name: id,
      email: `${id}@example.uz`,
      role,
      student: null,
      active: true,
      ...extra,
    });
    const spec = classEditorSpec(undefined, [
      person('teacher', 'TEACHER'),
      person('sleeping', 'TEACHER', { active: false }),
      person('admin-teacher', 'ADMIN', { teacherAccess: true }),
      person('admin', 'ADMIN'),
      person('student', 'STUDENT'),
    ]);
    const teacherField = spec.fields.find((f) => f.key === 'teacherId')!;
    expect(teacherField.options!.map((o) => o.value)).toEqual(['teacher', 'admin-teacher']);
    expect(spec.values).toMatchObject({ grade: '6' });
    expect(spec.serialize!({ grade: '7' })).toEqual({ grade: 7 });
  });

  it('accepts only active students of the class grade as members', () => {
    const student = (grade: number, active = true) =>
      ({ role: 'STUDENT', active, student: { grade } }) as User;
    expect(isEligibleClassStudent(student(6), 6)).toBe(true);
    expect(isEligibleClassStudent(student(7), 6)).toBe(false);
    expect(isEligibleClassStudent(student(6, false), 6)).toBe(false);
    expect(
      isEligibleClassStudent({ role: 'TEACHER', active: true, student: null } as User, 6),
    ).toBe(false);
  });
});
