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
import {
  classEditorSpec,
  contentEditorSpec,
  flattenContent,
  gameEditorSpec,
  type ContentEntity,
  type ContentKind,
} from './admin/editor-specs';
import { ClassMembershipModal, DeleteModal } from './admin/modals';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { brand } from '../lib/brand';
import type {
  AdminClass,
  AdminQuestion,
  AdminSubject,
  Analytics,
  Badge,
  GameConfig,
  Level,
  User,
} from '../lib/types';
import { Button, ErrorState, Loading, Modal, PageHeader, StatusPill } from '../components/ui';
import { EntityEditor, type EditorSpec } from '../components/entity-editor';

type AdminMode = 'overview' | 'users' | 'content' | 'gamification' | 'classes';

export default function AdminPage({ mode = 'overview' }: { mode?: AdminMode }) {
  usePageLocale();
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
  const [search, setSearch] = useState(params.get('search')?.slice(0, 100) || '');
  const [page, setPage] = useState(1);
  const [gradeFilter, setGradeFilter] = useState('6');
  const [membership, setMembership] = useState<AdminClass | null>(null);
  const analytics = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => api<Analytics>('/admin/analytics'),
    enabled: mode === 'overview',
  });
  const users = useQuery({
    queryKey: ['admin', 'users', page, search],
    queryFn: () =>
      api<{ items: User[]; total: number; page: number; limit: number }>(
        `/admin/users?page=${page}&limit=10&search=${encodeURIComponent(search)}`,
      ),
    enabled: mode === 'users',
  });
  useEffect(() => {
    if (mode !== 'users' || !users.data) return;
    const lastPage = Math.max(1, Math.ceil(users.data.total / users.data.limit));
    if (page > lastPage) setPage(lastPage);
  }, [mode, page, users.data]);
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
    if (kind === 'questions') {
      setQuestionEditor({
        question: item as AdminQuestion | undefined,
        lessonId: parentId,
        lessons: flattenContent(tree).lessons.map((l) => ({ id: l.id, title: l.label })),
      });
      return;
    }
    setEditor(contentEditorSpec(kind, tree, gradeFilter, item, parentId));
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
        onClick={() =>
          setDeletion({
            endpoint: `/admin/${kind}/${item.id}`,
            title: 'title' in item ? item.title : item.text,
          })
        }
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
  const editGame = (kind: 'levels' | 'badges', item?: Level | Badge) =>
    setEditor(gameEditorSpec(kind, item));
  const editUser = (user?: User) => setUserEditor({ user });
  const editClass = (group?: AdminClass) =>
    setEditor(classEditorSpec(group, staff.data?.items || []));
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
          onDelete={setDeletion}
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
          onDelete={setDeletion}
        />
      )}{' '}
      {mode === 'classes' && classes.data && (
        <AdminClasses
          data={classes.data}
          onEdit={editClass}
          onMembership={setMembership}
          onDelete={setDeletion}
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
      <DeleteModal deletion={deletion} onClose={() => setDeletion(null)} />
      <ClassMembershipModal group={membership} onClose={() => setMembership(null)} />
    </>
  );
}
