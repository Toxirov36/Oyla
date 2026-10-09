import { localizeText } from '../i18n';
import { translate as tx, useI18n as usePageLocale } from '../i18n';
import { QuestionEditor } from '../components/exercises/question-editor';
import { AdminClasses } from './admin/classes';
import { AdminGamification } from './admin/gamification';
import { AdminContent } from './admin/content';
import { AdminUsers } from './admin/users';
import { AdminOverview } from './admin/overview';
import { UserEditor } from './admin/user-editor';
import { AdminPasswordReset } from './admin/password-reset';
import { grades, criterions } from './admin/config';
import { useSearchParams } from 'react-router-dom';
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
  {
    value: 'DRAFT',
    get label() {
      return tx('common.draft');
    },
  },
  {
    value: 'PUBLISHED',
    get label() {
      return tx('common.published');
    },
  },
  {
    value: 'ARCHIVED',
    get label() {
      return tx('common.archived');
    },
  },
];
const statusField: EditorField = {
  key: 'status',
  get label() {
    return tx('pages.admin.users.status');
  },
  kind: 'select',
  options: statuses,
};
const titleField: EditorField = {
  key: 'title',
  get label() {
    return tx('pages.admin.avatars.name');
  },
  min: 2,
  max: 100,
};
const positionField: EditorField = {
  key: 'position',
  get label() {
    return tx('pages.admin.avatars.displayOrder');
  },
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
  usePageLocale();
  const cache = useQueryClient();
  const [params] = useSearchParams();
  const [userEditor, setUserEditor] = useState<{ user?: User } | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [questionEditor, setQuestionEditor] = useState<{
    question?: AdminQuestion;
    lessonId?: string;
    lessons: { id: string; title: string }[];
  } | null>(null);
  const [editor, setEditor] = useState<EditorSpec | null>(null);
  const [deletion, setDeletion] = useState<{ endpoint: string; title: string } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('search')?.slice(0, 100) || '');
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
    queryFn: () => api<{ items: User[] }>('/admin/users?limit=100'),
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
      s.courses.map((c) => ({
        ...c,
        get label() {
          return tx('pages.admin.grade', {
            value1: localizeText(s.title),
            value2: c.grade,
            value3: localizeText(c.title),
          });
        },
      })),
    );
    const topics = courses.flatMap((c) =>
      c.topics.map((t) => ({ ...t, label: `${c.label} / ${localizeText(t.title)}` })),
    );
    const lessons = topics.flatMap((t) =>
      t.lessons.map((l) => ({ ...l, label: `${t.label} / ${localizeText(l.title)}` })),
    );
    if (kind === 'questions') {
      setQuestionEditor({
        question: item as AdminQuestion | undefined,
        lessonId: parentId,
        lessons: lessons.map((l) => ({ id: l.id, title: l.label })),
      });
      return;
    }
    const select = (
      key: string,
      label: string,
      values: { id: string; title?: string; label?: string }[],
    ): EditorField => ({
      key,
      label,
      kind: 'select',
      options: values.map((v) => ({ value: v.id, label: v.label || localizeText(v.title) })),
      schema: z.uuid(tx('pages.admin.chooseAnOption')),
    });
    let fields: EditorField[];
    let values = entityValues(item);
    const names = {
      get subjects() {
        return tx('pages.admin.videos.subject');
      },
      get courses() {
        return tx('pages.admin.course');
      },
      get topics() {
        return tx('pages.admin.content.topic');
      },
      get lessons() {
        return tx('pages.admin.content.lesson');
      },
      get questions() {
        return tx('pages.admin.question');
      },
    };
    if (kind === 'subjects')
      fields = [
        titleField,
        {
          key: 'slug',
          get label() {
            return tx('pages.admin.shortNameLatinLetters');
          },
          schema: z
            .string()
            .regex(/^[a-z][a-z0-9-]{1,59}$/, tx('pages.admin.useLowercaseLatinLettersAndHyphens')),
        },
        {
          key: 'description',
          get label() {
            return tx('pages.admin.videos.description');
          },
          kind: 'textarea',
          max: 1000,
        },
        statusField,
        positionField,
      ];
    else if (kind === 'courses') {
      fields = [
        select('subjectId', tx('pages.admin.videos.subject'), tree),
        titleField,
        {
          key: 'grade',
          get label() {
            return tx('pages.admin.users.grade');
          },
          kind: 'select',
          options: grades,
        },
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
      fields = [
        select('courseId', tx('pages.admin.course'), courses),
        titleField,
        statusField,
      ];
      values = { courseId: parentId, ...values };
    } else if (kind === 'lessons') {
      fields = [
        select('topicId', tx('pages.admin.content.topic'), topics),
        { ...titleField, max: 150 },
        {
          key: 'explanation',
          get label() {
            return tx('lesson.explanation');
          },
          kind: 'textarea',
          min: 20,
          get help() {
            return tx('pages.admin.separateParagraphsWithABlankLine');
          },
        },
        {
          key: 'example',
          get label() {
            return tx('pages.admin.workedExample');
          },
          kind: 'textarea',
          min: 10,
          max: 10000,
        },
        {
          key: 'duration',
          get label() {
            return tx('pages.admin.durationMinutes');
          },
          kind: 'number',
          min: 1,
          max: 180,
        },
        {
          key: 'prerequisiteId',
          get label() {
            return tx('pages.admin.prerequisiteLesson');
          },
          kind: 'select',
          optional: true,
          options: [
            {
              value: '',
              get label() {
                return tx('pages.admin.noPrerequisite');
              },
            },
            ...lessons
              .filter((l) => l.id !== item?.id)
              .map((l) => ({ value: l.id, label: l.label })),
          ],
        },
        {
          key: 'unlockScore',
          get label() {
            return tx('pages.admin.minimumScoreOnThePreviousLesson');
          },
          kind: 'number',
          min: 0,
          max: 100,
        },
        {
          key: 'masteryScore',
          get label() {
            return tx('pages.admin.minimumScoreToMasterTheLesson');
          },
          kind: 'number',
          min: 0,
          max: 100,
        },
        ...(item ? [statusField] : []),
        positionField,
      ];
      values = {
        topicId: parentId,
        duration: 10,
        unlockScore: 70,
        masteryScore: 70,
        ...values,
        prerequisiteId: values.prerequisiteId ?? '',
      };
    } else {
      return;
    }
    setEditor({
      get title() {
        return tx(item ? 'pages.admin.editEntity' : 'pages.admin.createEntity', {
          entity: names[kind],
        });
      },
      endpoint: `/admin/${kind}`,
      fields,
      id: item?.id,
      values,
      serialize: (input) => {
        const body = { ...input };
        if (kind === 'courses') body.grade = Number(body.grade);
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
        aria-label={tx('pages.admin.users.edit', {
          value1: 'title' in item ? item.title : tx('pages.admin.question'),
        })}
        onClick={() => createContent(kind, item)}
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="ghost"
        aria-label={tx('notifications.remove')}
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
            {
              key: 'number',
              get label() {
                return tx('pages.admin.levelNumber');
              },
              kind: 'number',
              min: 1,
              max: 1000,
            },
            titleField,
            {
              key: 'threshold',
              get label() {
                return tx('pages.admin.startingXpThreshold');
              },
              kind: 'number',
              min: 0,
            },
          ]
        : [
            titleField,
            {
              key: 'slug',
              get label() {
                return tx('pages.admin.shortName');
              },
              schema: z.string().regex(/^[a-z][a-z0-9-]{1,59}$/),
            },
            {
              key: 'description',
              get label() {
                return tx('pages.admin.howToEarnIt');
              },
              kind: 'textarea',
              min: 3,
              max: 500,
            },
            {
              key: 'criterion',
              get label() {
                return tx('pages.admin.criterion');
              },
              kind: 'select',
              options: criterions,
            },
            {
              key: 'threshold',
              get label() {
                return tx('pages.admin.requiredNumberOfResults');
              },
              kind: 'number',
              min: 1,
              max: 100000,
            },
          ];
    setEditor({
      title:
        kind === 'levels' ? tx('pages.admin.configureLevel') : tx('pages.admin.configureBadge'),
      endpoint: `/admin/${kind}`,
      fields,
      id: item?.id,
      values: entityValues(item),
    });
  };
  const editUser = (user?: User) => setUserEditor({ user });
  const editClass = (group?: AdminClass) =>
    setEditor({
      title: group ? tx('pages.admin.classes.editClass') : tx('pages.admin.newClass'),
      endpoint: '/admin/classes',
      id: group?.id,
      values: { ...entityValues(group), grade: String(group?.grade || 6) },
      fields: [
        {
          key: 'name',
          get label() {
            return tx('pages.admin.className');
          },
          min: 2,
          max: 80,
        },
        {
          key: 'grade',
          get label() {
            return tx('pages.admin.gradeLevel');
          },
          kind: 'select',
          options: grades,
        },
        {
          key: 'teacherId',
          get label() {
            return tx('role.TEACHER');
          },
          kind: 'select',
          schema: z.uuid(),
          options: (staff.data?.items || [])
            .filter((u) => (u.role === 'TEACHER' || u.teacherAccess) && u.active)
            .map((u) => ({ value: u.id, label: u.name })),
        },
      ],
      serialize: (values) => ({ ...values, grade: Number(values.grade) }),
    });
  return (
    <>
      <PageHeader
        eyebrow={tx('pages.admin.platformManagement')}
        title={
          {
            get overview() {
              return tx('pages.admin.atAGlance', { value1: brand.name });
            },
            get users() {
              return tx('navigation.users');
            },
            get content() {
              return tx('pages.admin.learningLibrary');
            },
            get gamification() {
              return tx('pages.admin.encourageLearning');
            },
            get classes() {
              return tx('pages.admin.classesAndTeachers');
            },
          }[mode]
        }
        description={
          {
            get overview() {
              return tx('pages.admin.currentActivityContentAndLearningResults');
            },
            get users() {
              return tx('pages.admin.manageStudentAndTeacherAccounts');
            },
            get content() {
              return tx('pages.admin.subjectGradeCourseTopicLessonQuestionPublishContent');
            },
            get gamification() {
              return tx('pages.admin.xpRulesLevelsAndBadges');
            },
            get classes() {
              return tx('pages.admin.createAClassAndAssignItsTeacherAnd');
            },
          }[mode]
        }
        action={
          mode === 'users' ? (
            <Button onClick={() => editUser()}>
              <Plus size={18} />
              {tx('pages.admin.users.user')}
            </Button>
          ) : mode === 'content' ? (
            <Button onClick={() => createContent('subjects')}>
              <Plus size={18} />
              {tx('pages.admin.addSubject')}
            </Button>
          ) : mode === 'classes' ? (
            <Button onClick={() => editClass()}>
              <Plus size={18} />
              {tx('pages.admin.createClass')}
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
          onReset={setResetUser}
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
        open={!!userEditor}
        onOpenChange={(open) => {
          if (!open) setUserEditor(null);
        }}
        title={userEditor?.user ? tx('pages.admin.editUser') : tx('pages.admin.newUser')}
      >
        {userEditor && <UserEditor user={userEditor.user} close={() => setUserEditor(null)} />}
      </Modal>
      <Modal
        open={!!resetUser}
        onOpenChange={(open) => {
          if (!open) setResetUser(null);
        }}
        title={tx('recovery.reset')}
      >
        {resetUser && <AdminPasswordReset key={resetUser.id} user={resetUser} />}
      </Modal>
      <Modal
        open={!!questionEditor}
        onOpenChange={(open) => {
          if (!open) setQuestionEditor(null);
        }}
        title={
          questionEditor?.question
            ? tx('pages.admin.editQuestion')
            : tx('pages.admin.createQuestion')
        }
        wide
      >
        {questionEditor && (
          <QuestionEditor {...questionEditor} close={() => setQuestionEditor(null)} />
        )}
      </Modal>
      <Modal
        open={!!editor}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
        title={localizeText(editor?.title)}
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
        title={tx('pages.admin.confirmAction')}
        description={deletion?.title || ''}
      >
        <p className="delete-notice">
          {tx('pages.admin.linkedContentMayPreventDeletionArchiveTheContent')}
        </p>
        {error && (
          <div className="form-error" role="alert">
            {localizeText(error)}
          </div>
        )}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setDeletion(null)}>
            {tx('common.cancel')}
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
            {tx('pages.admin.confirm')}
          </Button>
        </div>
      </Modal>
      <Modal
        open={!!membership}
        onOpenChange={(open) => {
          if (!open) setMembership(null);
        }}
        title={tx('pages.admin.studentsIn', { value1: membership?.name || '' })}
        description={tx('pages.admin.selectStudentsInTheMatchingGrade')}
      >
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label={tx('pages.admin.searchStudents')}
            placeholder={tx('pages.admin.nameOrEmail')}
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />
        </label>
        <p className="subtle">{tx('pages.admin.selected', { value1: memberIds.length })}</p>
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
            {localizeText(error)}
          </div>
        )}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setMembership(null)}>
            {tx('common.cancel')}
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
            {tx('pages.admin.avatars.save')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
import { brand } from '../lib/brand';
