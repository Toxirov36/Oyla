import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { accountFor, mountPage } from './page-harness';

const student = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  email: `${id}@example.uz`,
  role: 'STUDENT',
  student: { grade: 6 },
  active: true,
  mastery: 0,
  completed: 0,
  totalLessons: 10,
  progressPercent: 0,
  needsHelp: false,
  topics: [],
  progress: [],
  ...extra,
});
const classroom = (extra: Record<string, unknown> = {}) => ({
  id: 'class-1',
  name: '6-A',
  grade: 6,
  teacherId: 'teacher-1',
  totalLessons: 10,
  topics: [],
  studentsNeedingHelp: [],
  assignments: [],
  students: [
    student('s1', 'Aziza Karimova', { mastery: 90, completed: 4, progressPercent: 40 }),
    student('s2', 'Bobur Aliyev', { mastery: 40, completed: 2, needsHelp: true }),
    student('s3', 'Sevara Toshova'),
  ],
  ...extra,
});

describe('dashboard page', () => {
  const dashboard = {
    user: accountFor('STUDENT', { name: 'Ali Valiyev' }),
    totalXp: 280,
    level: { number: 2, title: 'Izlanuvchi', threshold: 200 },
    nextLevel: { number: 3, title: 'Bilimdon', threshold: 500 },
    streak: 3,
    longestStreak: 5,
    completedLessons: 4,
    completedLessonIds: [],
    totalLessons: 20,
    continueLesson: {
      id: 'lesson-1',
      title: 'Kasrlarni qo‘shish',
      duration: 10,
      subject: 'Matematika',
      slug: 'mathematics',
      topic: 'Kasrlar',
    },
    subjects: [
      {
        id: 'sub-1',
        slug: 'mathematics',
        title: 'Matematika',
        total: 10,
        completed: 4,
        progress: 40,
        mastery: 85,
      },
    ],
    topics: [],
    badges: [],
    assignments: [],
    dailyCompleted: false,
    activity: [],
  };
  const routes = {
    '/api/v1/students/me': dashboard,
    '/api/v1/leaderboards': [
      { rank: 1, userId: 'u1', name: 'Dilnoza', xp: 900, isMe: false },
      { rank: 2, userId: 'me', name: 'Ali Valiyev', xp: 280, isMe: true },
    ],
    '/api/v1/daily-challenge': {
      day: '2026-10-22',
      questionCount: 5,
      reward: 50,
      status: 'AVAILABLE',
      attemptId: null,
      result: null,
    },
  };

  it('greets the student, shows XP and the next lesson, and ranks the weekly leaders', async () => {
    mountPage('/dashboard', dashboard.user, routes);
    expect(await screen.findByRole('heading', { name: /Ali/ })).toBeVisible();
    expect(await screen.findByText('Kasrlarni qo‘shish')).toBeVisible();
    expect(await screen.findByText('Dilnoza')).toBeVisible();
    expect(screen.getAllByText(/280/).length).toBeGreaterThan(0);
  });

  it('shows a retryable error when the dashboard cannot be loaded', async () => {
    mountPage('/dashboard', dashboard.user, {
      ...routes,
      '/api/v1/students/me': Response.json({ message: 'Server xatosi.' }, { status: 503 }),
    });
    expect(await screen.findByText('Server xatosi.')).toBeVisible();
  });
});

describe('teacher pages', () => {
  const teacher = accountFor('TEACHER', { name: 'Gulnora Ustoz' });

  it('summarises classes and students who need support', async () => {
    mountPage('/teacher', teacher, { '/api/v1/teacher/classes': [classroom()] });
    expect(await screen.findByRole('heading', { name: '6-A' })).toBeVisible();
    const link = screen.getByRole('link', { name: /Sinfni ko‘rish/ });
    expect(link).toHaveAttribute('href', '/teacher/classes/class-1');
  });

  it('explains when no classes are assigned and disables creating assignments', async () => {
    mountPage('/teacher', teacher, { '/api/v1/teacher/classes': [] });
    expect(await screen.findByText(/Hali sinflar biriktirilmagan/)).toBeVisible();
    const buttons = screen.getAllByRole('button', { name: /Topshiriq/ });
    expect(buttons[0]).toBeDisabled();
  });

  it('lists the students of a class with their mastery', async () => {
    mountPage('/teacher/classes/class-1', teacher, {
      '/api/v1/teacher/classes': [classroom()],
      '/api/v1/teacher/classes/class-1': classroom(),
    });
    expect(await screen.findByText('Aziza Karimova')).toBeVisible();
    expect(screen.getByText('Bobur Aliyev')).toBeVisible();
    expect(screen.getByText('90%')).toBeVisible();
    expect(screen.getByText('Sevara Toshova')).toBeVisible();
  });

  it('shows an empty state on the assignments page', async () => {
    mountPage('/teacher/assignments', teacher, {
      '/api/v1/teacher/classes': [classroom()],
      '/api/v1/teacher/assignments': [],
    });
    expect(await screen.findByText(/Hali topshiriq berilmagan/)).toBeVisible();
  });
});

describe('admin pages', () => {
  const admin = accountFor('ADMIN', { name: 'Admin' });
  const groups = [
    {
      id: 'class-1',
      name: '6-A',
      grade: 6,
      teacherId: 't1',
      teacher: { id: 't1', name: 'Gulnora Ustoz' },
      students: [{ studentId: 's1', student: student('s1', 'Aziza Karimova') }],
    },
  ];

  it('shows platform totals on the overview', async () => {
    mountPage('/admin', admin, {
      '/api/v1/admin/analytics': {
        users: 120,
        students: 100,
        teachers: 15,
        lessons: 54,
        published: 50,
        draft: 4,
        completedAttempts: 777,
        averageScore: 82,
        totalXp: 54321,
        subjects: 3,
        recent: [],
      },
    });
    expect(await screen.findByText('777')).toBeVisible();
    expect(screen.getByText('120')).toBeVisible();
  });

  it('confirms and sends a class deletion, then reports a conflict from the API', async () => {
    const { user, calls } = mountPage('/admin/classes', admin, {
      '/api/v1/admin/classes': groups,
      '/api/v1/admin/users': { items: [], total: 0, page: 1, limit: 100 },
      'DELETE /api/v1/admin/classes/class-1': () =>
        Response.json(
          { message: 'Ma’lumot mavjud yoki boshqa yozuvlar bilan bog‘langan.' },
          { status: 409 },
        ),
    });
    await screen.findByText('6-A');
    await user.click(screen.getAllByRole('button', { name: /O‘chirish|Delete|Remove/i })[0]!);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Tasdiqlash' }));
    await waitFor(() =>
      expect(
        calls.some((c) => c.method === 'DELETE' && c.path === '/api/v1/admin/classes/class-1'),
      ).toBe(true),
    );
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('bog‘langan');
  });

  it('saves the chosen class members from the membership dialog', async () => {
    const { user, calls } = mountPage('/admin/classes', admin, {
      '/api/v1/admin/classes': groups,
      '/api/v1/admin/users': {
        items: [
          student('s1', 'Aziza Karimova'),
          student('s2', 'Bobur Aliyev'),
          student('s9', 'Boshqa sinf', { student: { grade: 7 } }),
        ],
        total: 3,
        page: 1,
        limit: 100,
      },
      'PUT /api/v1/admin/classes/class-1/students': { success: true },
    });
    await screen.findByText('6-A');
    await user.click(screen.getByRole('button', { name: /O‘quvchilar|Students|Talaba/i }));
    const dialog = await screen.findByRole('dialog');
    const bobur = await within(dialog).findByRole('checkbox', { name: /Bobur Aliyev/ });
    expect(within(dialog).queryByText('Boshqa sinf')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: /Aziza Karimova/ })).toBeChecked();
    await user.click(bobur);
    await user.click(within(dialog).getByRole('button', { name: 'Saqlash' }));
    await waitFor(() => {
      const put = calls.find((c) => c.method === 'PUT');
      expect(put?.body).toEqual({ studentIds: ['s1', 's2'] });
    });
  });
});

describe('lesson and brain ring pages', () => {
  const learner = accountFor('STUDENT');

  it('shows the stored result of a finished attempt with mastery movement and badges', async () => {
    const result = {
      attemptId: 'attempt-1',
      score: 90,
      correct: 9,
      total: 10,
      earnedXp: 120,
      totalXp: 400,
      level: 2,
      streak: 4,
      mastered: true,
      masteryBefore: 60,
      masteryAfter: 85,
      badges: [{ id: 'b1', title: 'Birinchi dars', description: 'Birinchi darsni tugatdingiz.' }],
      nextLesson: { id: 'lesson-2', title: 'Keyingi dars' },
    };
    mountPage('/lessons/lesson-1', learner, {
      '/api/v1/lessons/lesson-1': {
        id: 'lesson-1',
        title: 'Kasrlar',
        explanation: 'Izoh',
        example: 'Misol',
        duration: 10,
        youtubeId: null,
        attemptId: 'attempt-1',
        questionCount: 10,
        topic: { title: 'Kasrlar', course: { grade: 6, subject: { title: 'Matematika' } } },
      },
      '/api/v1/attempts/attempt-1': {
        id: 'attempt-1',
        lessonId: 'lesson-1',
        status: 'COMPLETED',
        questions: [],
        result,
      },
    });
    expect(await screen.findByText('90')).toBeVisible();
    expect(screen.getByText('60% → 85%')).toBeVisible();
    expect(screen.getByText('Birinchi dars')).toBeVisible();
    expect(screen.getByRole('link', { name: /Keyingi/ })).toHaveAttribute(
      'href',
      '/lessons/lesson-2',
    );
  });

  it('reports a missing lesson instead of an empty page', async () => {
    mountPage('/lessons/missing', learner, {
      '/api/v1/lessons/missing': Response.json({ message: 'Dars topilmadi.' }, { status: 404 }),
    });
    expect(await screen.findByText('Dars topilmadi.')).toBeVisible();
  });

  it('loads the brain ring lobby with no matches yet', async () => {
    mountPage('/brain-ring', learner, {
      '/api/v1/friends': { inviteCode: 'abc', friends: [], incoming: [], outgoing: [] },
      '/api/v1/subjects': [],
      '/api/v1/brain-ring': [],
    });
    expect(await screen.findByRole('heading', { level: 1 })).toBeVisible();
    await waitFor(() => expect(document.querySelector('.loading, [aria-busy="true"]')).toBeNull());
  });
});
