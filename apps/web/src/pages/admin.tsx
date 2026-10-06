import { AdminClasses } from './admin/classes';
import { AdminGamification } from './admin/gamification';
import { AdminContent } from './admin/content';
import { AdminUsers } from './admin/users';
import { AdminOverview } from './admin/overview';
import { grades, roles, criterions, typeOptions } from './admin/config';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, errorText } from '../lib/api';
import type {
  AdminClass,
  AdminCourse,
  AdminLesson,
  AdminQuestion,
  AdminSubject,
  AdminTopic,
  Analytics,
  Badge,
  GameConfig,
  Level,
  User,
} from '../lib/types';
import { Button, ErrorState, Loading, Modal, PageHeader, StatusPill } from '../components/ui';
import { EntityEditor, type EditorField, type EditorSpec } from '../components/entity-editor';

const statuses = [
  { value: 'DRAFT', label: 'Qoralama' },
  { value: 'PUBLISHED', label: 'Chop etilgan' },
  { value: 'ARCHIVED', label: 'Arxiv' },
];
const statusField: EditorField = {
  key: 'status',
  label: 'Holat',
  kind: 'select',
  options: statuses,
};
const titleField: EditorField = { key: 'title', label: 'Nomi', min: 2, max: 100 };
const positionField: EditorField = {
  key: 'position',
  label: 'Tartib raqami',
  kind: 'number',
  min: 0,
  max: 10000,
};
type ContentKind = 'subjects' | 'courses' | 'topics' | 'lessons' | 'questions';
type ContentEntity = AdminSubject | AdminCourse | AdminTopic | AdminLesson | AdminQuestion;
const entityValues = (value?: object): Record<string, unknown> => (value ? { ...value } : {});

export default function AdminPage({
  mode = 'overview',
}: {
  mode?: 'overview' | 'users' | 'content' | 'gamification' | 'classes';
}) {
  const cache = useQueryClient();
  const [editor, setEditor] = useState<EditorSpec | null>(null);
  const [deletion, setDeletion] = useState<{ endpoint: string; title: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [gradeFilter, setGradeFilter] = useState('6');
  const [membership, setMembership] = useState<AdminClass | null>(null);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const analytics = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => api<Analytics>('/admin/analytics'),
    enabled: mode === 'overview',
  });
  const users = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () =>
      api<{ items: User[]; total: number; page: number; limit: number }>(
        `/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
      ),
    enabled: mode === 'users',
  });
  const allUsers = useQuery({
    queryKey: ['admin', 'class-users', memberSearch, membership?.grade],
    queryFn: () =>
      api<{ items: User[]; total: number }>(
        `/admin/users?limit=100&role=STUDENT${membership ? `&grade=${membership.grade}` : ''}&search=${encodeURIComponent(memberSearch)}`,
      ),
    enabled: mode === 'classes',
  });
  const staff = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: () => api<{ items: User[] }>('/admin/users?limit=100&role=TEACHER'),
    enabled: mode === 'classes',
  });
  const content = useQuery({
    queryKey: ['admin', 'content'],
    queryFn: () => api<AdminSubject[]>('/admin/content'),
    enabled: mode === 'content',
  });
  const game = useQuery({
    queryKey: ['admin', 'game'],
    queryFn: () => api<GameConfig>('/admin/gamification'),
    enabled: mode === 'gamification',
  });
  const classes = useQuery({
    queryKey: ['admin', 'classes'],
    queryFn: () => api<AdminClass[]>('/admin/classes'),
    enabled: mode === 'classes',
  });
  const active =
    mode === 'overview'
      ? analytics
      : mode === 'users'
        ? users
        : mode === 'content'
          ? content
          : mode === 'gamification'
            ? game
            : classes;
  if (active.isPending) return <Loading />;
  if (active.error) return <ErrorState error={active.error} retry={() => void active.refetch()} />;
  const createContent = (kind: ContentKind, item?: ContentEntity, parentId?: string) => {
    const tree = content.data || [];
    const courses = tree.flatMap((s) =>
      s.courses.map((c) => ({ ...c, label: `${s.title} / ${c.grade}-sinf / ${c.title}` })),
    );
    const topics = courses.flatMap((c) =>
      c.topics.map((t) => ({ ...t, label: `${c.label} / ${t.title}` })),
    );
    const lessons = topics.flatMap((t) =>
      t.lessons.map((l) => ({ ...l, label: `${t.label} / ${l.title}` })),
    );
    const select = (
      key: string,
      label: string,
      values: { id: string; title?: string; label?: string }[],
    ): EditorField => ({
      key,
      label,
      kind: 'select',
      options: values.map((v) => ({ value: v.id, label: v.label || v.title || '' })),
      schema: z.uuid('Tanlang.'),
    });
    let fields: EditorField[];
    let values = entityValues(item);
    const names = {
      subjects: 'Fan',
      courses: 'Kurs',
      topics: 'Mavzu',
      lessons: 'Dars',
      questions: 'Savol',
    };
    if (kind === 'subjects')
      fields = [
        titleField,
        {
          key: 'slug',
          label: 'Qisqa nom (lotincha)',
          schema: z
            .string()
            .regex(/^[a-z][a-z0-9-]{1,59}$/, 'Kichik lotin harflari va chiziqcha ishlating.'),
        },
        { key: 'description', label: 'Tavsif', kind: 'textarea', max: 1000 },
        statusField,
        positionField,
      ];
    else if (kind === 'courses') {
      fields = [
        select('subjectId', 'Fan', tree),
        titleField,
        { key: 'grade', label: 'Sinf', kind: 'select', options: grades },
        statusField,
        positionField,
      ];
      values = {
        subjectId: parentId,
        grade: gradeFilter,
        ...values,
        ...(item && 'grade' in item ? { grade: String(item.grade) } : {}),
      };
    } else if (kind === 'topics') {
      fields = [select('courseId', 'Kurs', courses), titleField, statusField, positionField];
      values = { courseId: parentId, ...values };
    } else if (kind === 'lessons') {
      fields = [
        select('topicId', 'Mavzu', topics),
        { ...titleField, max: 150 },
        {
          key: 'explanation',
          label: 'Tushuntirish',
          kind: 'textarea',
          min: 20,
          help: 'Abzaslarni bo‘sh satr bilan ajrating.',
        },
        { key: 'example', label: 'Yechilgan misol', kind: 'textarea', min: 10, max: 10000 },
        { key: 'duration', label: 'Davomiylik (daqiqa)', kind: 'number', min: 1, max: 180 },
        ...(item ? [statusField] : []),
        positionField,
      ];
      values = { topicId: parentId, duration: 10, ...values };
    } else {
      fields = [
        select('lessonId', 'Dars', lessons),
        { key: 'text', label: 'Savol matni', kind: 'textarea', min: 3, max: 5000 },
        { key: 'type', label: 'Savol turi', kind: 'select', options: typeOptions },
        {
          key: 'difficulty',
          label: 'Murakkablik',
          kind: 'select',
          options: [
            { value: 'EASY', label: 'Oson' },
            { value: 'MEDIUM', label: 'O‘rta' },
            { value: 'HARD', label: 'Murakkab' },
          ],
        },
        {
          key: 'optionsText',
          label: 'Variantlar (faqat variantli savolda)',
          kind: 'textarea',
          optional: true,
          help: 'Har bir variantni alohida satrga yozing. 2–8 ta variant.',
        },
        {
          key: 'answer',
          label: 'To‘g‘ri javob',
          max: 2000,
          help: 'Variantli: variant matni. To‘g‘ri/noto‘g‘ri: true yoki false. Matnli muqobillarni | bilan ajrating.',
        },
        { key: 'explanation', label: 'Javob izohi', kind: 'textarea', min: 3, max: 5000 },
        { key: 'hint', label: 'Maslahat (ixtiyoriy)', optional: true, max: 2000 },
        {
          key: 'xp',
          label: 'Savol uchun XP (ixtiyoriy)',
          kind: 'number',
          optional: true,
          min: 0,
          max: 1000,
          help: 'Bo‘sh qoldirilsa umumiy XP qoidasi ishlatiladi.',
        },
        {
          key: 'tolerance',
          label: 'Sonli javob xatolik chegarasi',
          kind: 'number',
          schema: z.number().min(0).max(100),
        },
        statusField,
        positionField,
      ];
      const question = item as AdminQuestion | undefined;
      values = {
        lessonId: parentId,
        tolerance: 0.0001,
        ...values,
        optionsText: question?.options.map((o) => o.text).join('\n') || '',
      };
    }
    setEditor({
      title: `${names[kind]} ${item ? 'tahrirlash' : 'yaratish'}`,
      endpoint: `/admin/${kind}`,
      fields,
      id: item?.id,
      values,
      serialize: (input) => {
        const body = { ...input };
        if (kind === 'courses') body.grade = Number(body.grade);
        if (kind === 'questions') {
          body.options =
            body.type === 'MULTIPLE_CHOICE'
              ? String(body.optionsText || '')
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((text) => ({ text, value: text }))
              : [];
          delete body.optionsText;
        }
        return body;
      },
    });
  };
  const requestDeletion = (value: { endpoint: string; title: string }) => {
    setError('');
    setDeletion(value);
  };
  const contentActions = (kind: ContentKind, item: ContentEntity) => (
    <div className="content-actions">
      <StatusPill status={item.status} />
      <Button
        variant="ghost"
        aria-label={`${'title' in item ? item.title : 'Savol'} tahrirlash`}
        onClick={() => createContent(kind, item)}
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="ghost"
        aria-label="O‘chirish"
        onClick={() => {
          setError('');
          setDeletion({
            endpoint: `/admin/${kind}/${item.id}`,
            title: 'title' in item ? item.title : item.text,
          });
        }}
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
  const editGame = (kind: 'levels' | 'badges', item?: Level | Badge) => {
    const fields: EditorField[] =
      kind === 'levels'
        ? [
            { key: 'number', label: 'Daraja raqami', kind: 'number', min: 1, max: 1000 },
            titleField,
            { key: 'threshold', label: 'Boshlanish XP chegarasi', kind: 'number', min: 0 },
          ]
        : [
            titleField,
            { key: 'slug', label: 'Qisqa nom', schema: z.string().regex(/^[a-z][a-z0-9-]{1,59}$/) },
            {
              key: 'description',
              label: 'Qanday olish mumkin?',
              kind: 'textarea',
              min: 3,
              max: 500,
            },
            { key: 'criterion', label: 'Mezon', kind: 'select', options: criterions },
            {
              key: 'threshold',
              label: 'Kerakli natijalar soni',
              kind: 'number',
              min: 1,
              max: 100000,
            },
          ];
    setEditor({
      title: kind === 'levels' ? 'Darajani sozlash' : 'Nishonni sozlash',
      endpoint: `/admin/${kind}`,
      fields,
      id: item?.id,
      values: entityValues(item),
    });
  };
  const editUser = (user?: User) =>
    setEditor({
      title: user ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi',
      endpoint: '/admin/users',
      id: user?.id,
      values: { ...entityValues(user), grade: String(user?.student?.grade || 6) },
      fields: [
        { key: 'name', label: 'Ism va familiya', min: 2, max: 80 },
        { key: 'email', label: 'Email', kind: 'email', schema: z.email() },
        ...(user
          ? [{ key: 'active', label: 'Hisob faol', kind: 'checkbox' } as EditorField]
          : [
              {
                key: 'password',
                label: 'Boshlang‘ich parol',
                kind: 'password',
                min: 10,
                max: 128,
              } as EditorField,
              { key: 'role', label: 'Rol', kind: 'select', options: roles } as EditorField,
            ]),
        ...(!user || user.role === 'STUDENT'
          ? [
              {
                key: 'grade',
                label: 'O‘quvchi sinfi',
                kind: 'select',
                options: grades,
              } as EditorField,
            ]
          : []),
      ],
      serialize: (values) => {
        const body = { ...values };
        if (body.grade !== undefined) body.grade = Number(body.grade);
        if (body.role && body.role !== 'STUDENT') delete body.grade;
        return body;
      },
    });
  const editClass = (group?: AdminClass) =>
    setEditor({
      title: group ? 'Sinfni tahrirlash' : 'Yangi sinf',
      endpoint: '/admin/classes',
      id: group?.id,
      values: { ...entityValues(group), grade: String(group?.grade || 6) },
      fields: [
        { key: 'name', label: 'Sinf nomi', min: 2, max: 80 },
        { key: 'grade', label: 'Bosqich', kind: 'select', options: grades },
        {
          key: 'teacherId',
          label: 'O‘qituvchi',
          kind: 'select',
          schema: z.uuid(),
          options: (staff.data?.items || [])
            .filter((u) => u.role === 'TEACHER' && u.active)
            .map((u) => ({ value: u.id, label: u.name })),
        },
      ],
      serialize: (values) => ({ ...values, grade: Number(values.grade) }),
    });
  return (
    <>
      <PageHeader
        eyebrow="PLATFORMA BOSHQARUVI"
        title={
          {
            overview: 'OYLA bir qarashda',
            users: 'Foydalanuvchilar',
            content: 'Bilim kutubxonasi',
            gamification: 'O‘rganishni rag‘batlantiring',
            classes: 'Sinflar va o‘qituvchilar',
          }[mode]
        }
        description={
          {
            overview: 'Haqiqiy faoliyat, kontent va o‘quv natijalari.',
            users: 'O‘quvchi va o‘qituvchi hisoblarini boshqaring.',
            content: 'Fan → sinf → kurs → mavzu → dars → savol. Kontentni shu yerdan chop eting.',
            gamification: 'XP qoidalari, darajalar va nishonlar.',
            classes: 'Sinf yarating, o‘qituvchini va o‘quvchilarni biriktiring.',
          }[mode]
        }
        action={
          mode === 'users' ? (
            <Button onClick={() => editUser()}>
              <Plus size={18} />
              Foydalanuvchi
            </Button>
          ) : mode === 'content' ? (
            <Button onClick={() => createContent('subjects')}>
              <Plus size={18} />
              Fan qo‘shish
            </Button>
          ) : mode === 'classes' ? (
            <Button onClick={() => editClass()}>
              <Plus size={18} />
              Sinf yaratish
            </Button>
          ) : undefined
        }
      />
      {mode === 'overview' && analytics.data && <AdminOverview data={analytics.data} />}{' '}
      {mode === 'users' && users.data && (
        <AdminUsers
          data={users.data}
          search={search}
          page={page}
          onSearch={setSearch}
          onPage={setPage}
          onEdit={editUser}
          onDelete={requestDeletion}
        />
      )}{' '}
      {mode === 'content' && content.data && (
        <AdminContent
          data={content.data}
          gradeFilter={gradeFilter}
          onGradeChange={setGradeFilter}
          onCreate={createContent}
          actions={contentActions}
        />
      )}{' '}
      {mode === 'gamification' && game.data && (
        <AdminGamification
          data={game.data}
          onEdit={editGame}
          onEditor={setEditor}
          onDelete={requestDeletion}
        />
      )}{' '}
      {mode === 'classes' && classes.data && (
        <AdminClasses
          data={classes.data}
          onEdit={editClass}
          onMembership={(group) => {
            setError('');
            setMemberSearch('');
            setMembership(group);
            setMemberIds(group.students.map((s) => s.studentId));
          }}
          onDelete={requestDeletion}
        />
      )}{' '}
      <Modal
        open={!!editor}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
        title={editor?.title || ''}
        wide={mode === 'content'}
      >
        {editor && (
          <EntityEditor
            key={`${editor.endpoint}-${editor.id || 'new'}`}
            spec={editor}
            close={() => setEditor(null)}
          />
        )}
      </Modal>
      <Modal
        open={!!deletion}
        onOpenChange={(open) => {
          if (!open) setDeletion(null);
        }}
        title="Amalni tasdiqlang"
        description={deletion?.title || ''}
      >
        <p className="delete-notice">
          Bog‘langan kontent o‘chirilmasligi mumkin. Zarur bo‘lsa kontentni arxivlang.
        </p>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setDeletion(null)}>
            Bekor qilish
          </Button>
          <Button
            variant="danger"
            busy={deleteBusy}
            onClick={async () => {
              setDeleteBusy(true);
              try {
                await api(deletion!.endpoint, { method: 'DELETE' });
                await cache.invalidateQueries();
                setDeletion(null);
              } catch (e) {
                setError(errorText(e));
              } finally {
                setDeleteBusy(false);
              }
            }}
          >
            Tasdiqlash
          </Button>
        </div>
      </Modal>
      <Modal
        open={!!membership}
        onOpenChange={(open) => {
          if (!open) setMembership(null);
        }}
        title={`${membership?.name || ''} o‘quvchilari`}
        description="Sinf bosqichiga mos o‘quvchilarni belgilang."
      >
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label="O‘quvchini qidirish"
            placeholder="Ism yoki email..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />
        </label>
        <p className="subtle">{memberIds.length} ta tanlangan</p>
        <div className="membership-list">
          {allUsers.data?.items
            .filter(
              (u) => u.role === 'STUDENT' && u.active && u.student?.grade === membership?.grade,
            )
            .map((user) => (
              <label key={user.id}>
                <input
                  type="checkbox"
                  checked={memberIds.includes(user.id)}
                  onChange={(e) =>
                    setMemberIds(
                      e.target.checked
                        ? [...memberIds, user.id]
                        : memberIds.filter((id) => id !== user.id),
                    )
                  }
                />
                <span>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </span>
              </label>
            ))}
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setMembership(null)}>
            Bekor qilish
          </Button>
          <Button
            busy={deleteBusy}
            onClick={async () => {
              setDeleteBusy(true);
              try {
                await api(`/admin/classes/${membership!.id}/students`, {
                  method: 'PUT',
                  body: { studentIds: memberIds },
                });
                await cache.invalidateQueries();
                setMembership(null);
              } catch (e) {
                setError(errorText(e));
              } finally {
                setDeleteBusy(false);
              }
            }}
          >
            Saqlash
          </Button>
        </div>
      </Modal>
    </>
  );
}
