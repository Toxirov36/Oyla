import { localizeText } from '../i18n';
import { translate as tx, useI18n as usePageLocale } from '../i18n';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  Plus,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { api, errorText } from '../lib/api';
import { ComboboxField } from '../components/combobox-field';
import { AssignmentAttachments } from '../components/assignment-attachments';
import { TeacherAnalysis } from '../components/teacher-analysis';
import type { Assignment, Classroom, Subject } from '../lib/types';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageHeader,
  ProgressBar,
  Stat,
  dateLabel,
} from '../components/ui';

const schema = z.object({
  classId: z.string().min(1, tx('pages.teacher.selectAClass')),
  lessonId: z.string().min(1, tx('pages.teacher.selectALesson')),
  title: z.string().trim().min(2, tx('pages.teacher.enterATitle')).max(100),
});
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assignmentDeadlineLabel(deadline: string): string {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tashkent',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(deadline));
  return `${dateLabel(deadline)}, ${time}`;
}

function AssignmentForm({
  classes,
  close,
  initialClassId,
  initialLessonId,
}: {
  classes: Classroom[];
  close: () => void;
  initialClassId?: string;
  initialLessonId?: string;
}) {
  usePageLocale();
  const cache = useQueryClient();
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: File[]) => {
    if (files.length > 5) {
      setError(tx('pages.teacher.tooManyAssignmentFiles'));
      return;
    }
    if (files.some((file) => file.size > 15 * 1024 * 1024)) {
      setError(tx('pages.teacher.assignmentFileTooLarge'));
      return;
    }
    setError('');
    setSelectedFiles(files);
  };
  const content = useQuery({
    queryKey: ['teacher-content'],
    queryFn: () => api<Subject[]>('/subjects'),
  });
  const {
    register,
    control,
    setValue,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      classId: initialClassId || classes[0]?.id || '',
      lessonId: initialLessonId || '',
      title: '',
    },
  });
  const selectedClass = classes.find((c) => c.id === watch('classId'));
  const lessons =
    content.data?.flatMap((s) =>
      s.courses
        .filter((c) => c.grade === selectedClass?.grade)
        .flatMap((c) =>
          c.topics.flatMap((t) =>
            t.lessons.map((l) => ({
              ...l,
              label: `${localizeText(s.title)} / ${localizeText(t.title)} / ${localizeText(l.title)}`,
            })),
          ),
        ),
    ) || [];
  return (
    <form
      className="editor-form"
      onSubmit={handleSubmit(async (values) => {
        setError('');
        try {
          const body = new FormData();
          body.append('classId', values.classId);
          body.append('lessonId', values.lessonId);
          body.append('title', values.title);
          selectedFiles.forEach((file) => body.append('attachments', file));
          await api('/teacher/assignments', {
            method: 'POST',
            body,
          });
          await cache.invalidateQueries({ queryKey: ['teacher'] });
          close();
        } catch (e) {
          setError(errorText(e));
        }
      })}
    >
      <label>
        {tx('pages.admin.users.grade')}
        <Controller
          name="classId"
          control={control}
          render={({ field, fieldState }) => (
            <ComboboxField
              options={classes.map((c) => ({
                value: c.id,
                get label() {
                  return tx('pages.admin.classes.grade', { value1: c.name, value2: c.grade });
                },
              }))}
              value={field.value}
              onChange={(value) => {
                if (value !== field.value) setValue('lessonId', '', { shouldDirty: true });
                field.onChange(value);
              }}
              onBlur={field.onBlur}
              inputRef={field.ref}
              name={field.name}
              label={tx('pages.admin.users.grade')}
              invalid={fieldState.invalid}
            />
          )}
        />
        {errors.classId && (
          <small className="field-error" role="alert">
            {localizeText(errors.classId.message)}
          </small>
        )}
      </label>
      <label>
        {tx('pages.teacher.assignmentTitle')}
        <input
          placeholder={tx('pages.teacher.forExamplePracticingFractions')}
          {...register('title')}
        />
        {errors.title && (
          <small className="field-error">{localizeText(errors.title.message)}</small>
        )}
      </label>
      <label>
        {tx('pages.admin.content.lesson')}
        <Controller
          name="lessonId"
          control={control}
          render={({ field, fieldState }) => (
            <ComboboxField
              options={lessons.map((lesson) => ({ value: lesson.id, label: lesson.label }))}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              name={field.name}
              label={tx('pages.admin.content.lesson')}
              placeholder={tx('pages.teacher.selectOrSearchForALesson')}
              disabled={content.isPending || !selectedClass}
              invalid={fieldState.invalid}
            />
          )}
        />
        {errors.lessonId && (
          <small className="field-error">{localizeText(errors.lessonId.message)}</small>
        )}
      </label>
      {content.error && <ErrorState error={content.error} />}
      <p className="text-sm text-[var(--muted)]">{tx('pages.teacher.automaticDeadline')}</p>
      <div className="assignment-files-group">
        <label htmlFor="assignment-file-input">
          {tx('pages.teacher.assignmentFiles')}
        </label>
        <div
          role="button"
          tabIndex={0}
          className={`assignment-dropzone ${isDragging ? 'is-dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length) handleFiles(files);
          }}
          aria-label={tx('pages.teacher.chooseFiles')}
        >
          <input
            id="assignment-file-input"
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,image/jpeg,image/png,image/webp"
            className="assignment-file-hidden-input"
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files || []);
              event.currentTarget.value = '';
              if (files.length) handleFiles(files);
            }}
          />
          <div className="assignment-dropzone-icon">
            <Upload size={20} strokeWidth={2.2} />
          </div>
          <div className="assignment-dropzone-content">
            <span className="assignment-dropzone-title">
              {tx('pages.teacher.chooseFiles')}
            </span>
            <span className="assignment-dropzone-help">
              {tx('pages.teacher.assignmentFilesHelp')}
            </span>
          </div>
        </div>

        {!selectedFiles.length ? (
          <p className="assignment-files-status">
            {tx('pages.teacher.noFilesChosen')}
          </p>
        ) : (
          <ul className="assignment-file-selection">
            {selectedFiles.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`}>
                <div className="assignment-file-item-info">
                  <FileText size={16} className="assignment-file-icon" />
                  <span className="assignment-file-name" title={file.name}>{file.name}</span>
                  <span className="assignment-file-size">{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  className="assignment-file-remove"
                  aria-label={tx('pages.teacher.removeAssignmentFile', { value1: file.name })}
                  title={tx('pages.teacher.removeAssignmentFile', { value1: file.name })}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFiles((current) => current.filter((_, i) => i !== index));
                  }}
                >
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <div role="alert" className="form-error">
          {localizeText(error)}
        </div>
      )}
      <div className="modal-actions">
        <Button variant="secondary" type="button" onClick={close}>
          {tx('common.cancel')}
        </Button>
        <Button busy={isSubmitting} type="submit">
          {tx('pages.teacher.assignTask')}
          <ArrowRight size={17} />
        </Button>
      </div>
    </form>
  );
}
function AssignmentResults({
  assignments,
  studentCount,
}: {
  assignments: Assignment[];
  studentCount?: number;
}) {
  usePageLocale();
  const cache = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const removeAssignment = useMutation({
    mutationFn: (assignmentId: string) =>
      api(`/teacher/assignments/${assignmentId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setDeleteTarget(null);
      setDeleteError('');
      await cache.invalidateQueries({ queryKey: ['teacher'] });
    },
    onError: (error) => setDeleteError(errorText(error)),
  });
  if (!assignments.length)
    return (
      <EmptyState
        title={tx('pages.teacher.noAssignmentsYet')}
        description={tx('pages.teacher.chooseALessonAndGiveYourClassIts')}
      />
    );
  return (
    <div className="teacher-assignments">
      {assignments.map((a) => {
        const count = a.completion?.total ?? studentCount ?? a.class?._count?.students ?? 0;
        const completed = a.completion?.completed ?? a.submissions.length;
        const students = a.students ?? a.submissions.map((submission) => ({
          id: submission.user?.id || submission.createdAt,
          name: submission.user?.name || '',
          submission,
        }));
        const average = students.reduce(
          (sum, student) => sum + (student.submission?.score ?? 0),
          0,
        ) / Math.max(1, students.filter((student) => student.submission).length);
        return (
          <Card key={a.id} className="teacher-assignment-card">
            <div className="assignment-card-top">
              <span className="eyebrow">
                {tx('pages.teacher.due', {
                  value1: a.class?.name || tx('pages.teacher.assignmentHeading'),
                  value2: assignmentDeadlineLabel(a.deadline),
                })}
              </span>
              <button
                type="button"
                className="assignment-delete-button"
                aria-label={tx('pages.teacher.deleteAssignment')}
                title={tx('pages.teacher.deleteAssignment')}
                onClick={() => {
                  setDeleteError('');
                  setDeleteTarget(a);
                }}
              >
                <Trash2 size={13} />
                <span>{tx('pages.teacher.deleteAssignment')}</span>
              </button>
            </div>
            <div className="assignment-card-body">
              <div>
                <h3>{a.title}</h3>
                <p>{localizeText(a.lesson.title)}</p>
                <AssignmentAttachments attachments={a.attachments} />
              </div>
              <span className="square-icon blue">
                <ClipboardList size={22} />
              </span>
            </div>
            <div className="progress-label">
              <span>{tx('pages.teacher.completionStatus')}</span>
              <strong>
                {completed} / {count}
              </strong>
            </div>
            <ProgressBar value={count ? (completed / count) * 100 : 0} tone="mint" />
            {!!a.completion?.historical && (
              <p className="subtle">
                {tx('pages.teacher.submissionsFromFormerMembersRetained', {
                  value1: a.completion.historical,
                })}
              </p>
            )}
            {students.length ? (
              <details className="submission-details">
                <summary>{tx('pages.teacher.analyzeResults')}</summary>
                <div className="assignment-analysis-summary">
                  <span>{tx('pages.teacher.completionStatus')}: <strong>{completed} / {count}</strong></span>
                  <span>{tx('pages.teacher.averageScore')}: <strong>{completed ? Math.round(average) : 0}%</strong></span>
                  <span>{tx('pages.teacher.submittedLateCount')}: <strong>{a.completion?.late ?? students.filter((student) => student.submission?.late).length}</strong></span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{tx('role.STUDENT')}</th>
                        <th>{tx('pages.admin.overview.result')}</th>
                        <th>{tx('pages.teacher.submission')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td>{student.name}</td>
                          <td><strong>{student.submission ? `${student.submission.score}%` : tx('pages.teacher.notSubmitted')}</strong></td>
                          <td>
                            {student.submission
                              ? <>{student.submission.late ? tx('pages.teacher.submittedLate') : tx('pages.teacher.onTime')} · {dateLabel(student.submission.createdAt)}</>
                              : tx('pages.teacher.waitingForSubmission')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : (
              <p className="subtle">{tx('pages.teacher.noResultsYet')}</p>
            )}
          </Card>
        );
      })}
      <Modal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !removeAssignment.isPending) setDeleteTarget(null);
        }}
        title={tx('pages.teacher.deleteAssignment')}
        description={tx('pages.teacher.deleteAssignmentConfirmation')}
      >
        {deleteError && <div role="alert" className="form-error">{localizeText(deleteError)}</div>}
        <div className="modal-actions">
          <Button variant="secondary" disabled={removeAssignment.isPending} onClick={() => setDeleteTarget(null)}>
            {tx('common.cancel')}
          </Button>
          <Button
            variant="danger"
            busy={removeAssignment.isPending}
            onClick={() => deleteTarget && removeAssignment.mutate(deleteTarget.id)}
          >
            <Trash2 size={17} />
            {tx('pages.teacher.deleteAssignment')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
export default function TeacherPage({ assignmentsOnly = false }: { assignmentsOnly?: boolean }) {
  usePageLocale();
  const { id } = useParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ classId?: string; lessonId?: string }>({});
  const query = useQuery({
    queryKey: ['teacher', 'classes'],
    queryFn: () => api<Classroom[]>('/teacher/classes'),
  });
  const detail = useQuery({
    queryKey: ['teacher', 'class', id],
    queryFn: () => api<Classroom>(`/teacher/classes/${id}`),
    enabled: !!id,
  });
  const assignments = useQuery({
    queryKey: ['teacher', 'assignments'],
    queryFn: () => api<Assignment[]>('/teacher/assignments'),
    enabled: assignmentsOnly,
  });
  if (query.isPending || (id && detail.isPending) || (assignmentsOnly && assignments.isPending))
    return <Loading />;
  const error = query.error || (id && detail.error) || (assignmentsOnly && assignments.error);
  if (error)
    return (
      <ErrorState
        error={error}
        retry={() => {
          void query.refetch();
          if (id) void detail.refetch();
          if (assignmentsOnly) void assignments.refetch();
        }}
      />
    );
  const groups = query.data!;
  const students = groups.flatMap((c) => c.students);
  const struggling = students.filter((s) => s.needsHelp);
  return (
    <>
      {id && (
        <Link to="/teacher" className="back-link">
          <ArrowLeft size={17} />
          {tx('navigation.classes')}
        </Link>
      )}
      <PageHeader
        eyebrow={tx('pages.teacher.teacherSpace')}
        title={
          id
            ? tx('pages.teacher.class', { value1: detail.data?.name ?? '' })
            : assignmentsOnly
              ? tx('pages.teacher.assignmentsAndResults')
              : tx('pages.teacher.everyStudentMatters')
        }
        description={
          id
            ? tx('pages.teacher.resultsByStudentTopicAndAssignment')
            : tx('pages.teacher.trackYourClasssLearningAndPlanTheNext')
        }
        action={
          <Button
            onClick={() => {
              setDraft(id ? { classId: id } : {});
              setOpen(true);
            }}
            disabled={!groups.length}
          >
            <Plus size={18} />
            {tx('pages.teacher.assignTask')}
          </Button>
        }
      />
      {!id && !assignmentsOnly && (
        <>
          <div className="stats-grid">
            <Stat
              label={tx('navigation.classes')}
              value={groups.length}
              icon={<GraduationCap size={26} />}
            />
            <Stat
              label={tx('pages.admin.classes.studentsVariant16')}
              value={new Set(students.map((s) => s.id)).size}
              icon={<Users size={26} />}
            />
            <Stat
              label={tx('pages.teacher.needsSupport')}
              value={new Set(struggling.map((s) => s.id)).size}
              icon={<BookOpen size={26} />}
              detail={tx('pages.teacher.below60InAtLeastOneTopic')}
            />
          </div>
          <div className="section-title">
            <h2>{tx('pages.teacher.myClasses')}</h2>
            <span className="subtle">{tx('pages.teacher.basedOnActualLearningResults')}</span>
          </div>
          <div className="class-grid">
            {groups.map((group) => {
              const learned = group.students.filter((s) => s.completed);
              return (
                <Card className="class-card" key={group.id}>
                  <span className="square-icon purple">
                    <GraduationCap size={27} />
                  </span>
                  <h2>{group.name}</h2>
                  <p>
                    {tx('pages.teacher.studentsGrade', {
                      value1: group.students.length,
                      value2: group.grade,
                    })}
                  </p>
                  <div className="class-metrics">
                    <div>
                      <span className="metric-dot mint" />
                      {tx('pages.teacher.above80')}
                      <strong>{learned.filter((s) => s.mastery > 80).length}</strong>
                    </div>
                    <div>
                      <span className="metric-dot orange" />
                      60–80%
                      <strong>
                        {learned.filter((s) => s.mastery >= 60 && s.mastery <= 80).length}
                      </strong>
                    </div>
                    <div>
                      <span className="metric-dot red" />
                      {tx('pages.teacher.below60')}
                      <strong>{learned.filter((s) => s.mastery < 60).length}</strong>
                    </div>
                    <div>
                      <span className="metric-dot gray" />
                      {tx('pages.teacher.notStartedYet')}
                      <strong>{group.students.length - learned.length}</strong>
                    </div>
                  </div>
                  <Link to={`/teacher/classes/${group.id}`} className="btn btn-secondary">
                    {tx('pages.teacher.viewClass')}
                    <ArrowRight size={17} />
                  </Link>
                </Card>
              );
            })}
          </div>
          {!groups.length && (
            <Card>
              <EmptyState
                title={tx('pages.teacher.noClassesAssignedYet')}
                description={tx('pages.teacher.yourClassWillAppearHereOnceAnAdministrator')}
              />
            </Card>
          )}
        </>
      )}
      {id && detail.data && (
        <>
          <TeacherAnalysis
            group={detail.data}
            assign={(lessonId) => {
              setDraft({ classId: detail.data!.id, lessonId });
              setOpen(true);
            }}
          />
          <Card>
            <div className="card-heading">
              <h2>{tx('pages.admin.classes.studentsVariant16')}</h2>
              <span className="pill">
                {tx('pages.admin.classes.students', { value1: detail.data.students.length })}
              </span>
            </div>
            {detail.data.students.length ? (
              <div className="student-list">
                {detail.data.students.map((student) => (
                  <details key={student.id} className="student-performance">
                    <summary>
                      <span className="avatar">{student.name[0]}</span>
                      <div>
                        <strong>{student.name}</strong>
                        <small>
                          {tx('pages.teacher.lessonsProgressMastered', {
                            value1: student.completed,
                            value2: student.totalLessons,
                            value3: student.progressPercent,
                            value4: ' · ',
                            value5: student.mastered ?? 0,
                          })}
                        </small>
                      </div>
                      <span
                        className={`pill ${student.mastery >= 80 ? 'status-completed' : student.completed && student.mastery < 60 ? 'warm' : ''}`}
                      >
                        {student.completed ? `${student.mastery}%` : tx('pages.teacher.notStarted')}
                      </span>
                    </summary>
                    <div className="student-topics">
                      {student.progress.length ? (
                        student.progress.map((p) => (
                          <div key={p.lessonId}>
                            <span>
                              {p.lesson.topic.title} / {p.lesson.title}
                            </span>
                            <strong>{p.bestScore}%</strong>
                          </div>
                        ))
                      ) : (
                        <p>{tx('pages.teacher.theStudentHasNotCompletedALessonYet')}</p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <EmptyState title={tx('pages.teacher.noStudentsInTheClassYet')} />
            )}
          </Card>
          <div className="section-title">
            <h2>{tx('pages.student-class.classAssignments')}</h2>
            <CheckCircle2 size={20} />
          </div>
          <AssignmentResults
            assignments={detail.data.assignments}
            studentCount={detail.data.students.length}
          />
        </>
      )}
      {assignmentsOnly && <AssignmentResults assignments={assignments.data || []} />}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={tx('pages.teacher.newAssignment')}
        description={tx('pages.teacher.chooseAClassLessonAndDeadline')}
      >
        <AssignmentForm
          classes={groups}
          close={() => setOpen(false)}
          initialClassId={draft.classId}
          initialLessonId={draft.lessonId}
        />
      </Modal>
    </>
  );
}
