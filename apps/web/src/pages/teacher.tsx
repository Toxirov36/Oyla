import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Plus,
  Users,
} from 'lucide-react';
import { api, errorText } from '../lib/api';
import { ComboboxField } from '../components/combobox-field';
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
  classId: z.string().min(1, 'Sinfni tanlang.'),
  lessonId: z.string().min(1, 'Darsni tanlang.'),
  title: z.string().trim().min(2, 'Nomini kiriting.').max(100),
  deadline: z.string().min(1, 'Muddatni belgilang.'),
});
function AssignmentForm({ classes, close }: { classes: Classroom[]; close: () => void }) {
  const cache = useQueryClient();
  const [error, setError] = useState('');
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
    defaultValues: { classId: classes[0]?.id || '', lessonId: '', title: '', deadline: '' },
  });
  const selectedClass = classes.find((c) => c.id === watch('classId'));
  const lessons =
    content.data?.flatMap((s) =>
      s.courses
        .filter((c) => c.grade === selectedClass?.grade)
        .flatMap((c) =>
          c.topics.flatMap((t) =>
            t.lessons.map((l) => ({ ...l, label: `${s.title} / ${t.title} / ${l.title}` })),
          ),
        ),
    ) || [];
  return (
    <form
      className="editor-form"
      onSubmit={handleSubmit(async (values) => {
        setError('');
        try {
          await api('/teacher/assignments', {
            method: 'POST',
            body: { ...values, deadline: new Date(values.deadline).toISOString() },
          });
          await cache.invalidateQueries({ queryKey: ['teacher'] });
          close();
        } catch (e) {
          setError(errorText(e));
        }
      })}
    >
      <label>
        Sinf
        <Controller
          name="classId"
          control={control}
          render={({ field, fieldState }) => (
            <ComboboxField
              options={classes.map((c) => ({ value: c.id, label: `${c.name} · ${c.grade}-sinf` }))}
              value={field.value}
              onChange={(value) => {
                if (value !== field.value) setValue('lessonId', '', { shouldDirty: true });
                field.onChange(value);
              }}
              onBlur={field.onBlur}
              inputRef={field.ref}
              name={field.name}
              label="Sinf"
              invalid={fieldState.invalid}
            />
          )}
        />
        {errors.classId && (
          <small className="field-error" role="alert">
            {errors.classId.message}
          </small>
        )}
      </label>
      <label>
        Topshiriq nomi
        <input placeholder="Masalan, kasrlarni mustahkamlaymiz" {...register('title')} />
        {errors.title && <small className="field-error">{errors.title.message}</small>}
      </label>
      <label>
        Dars
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
              label="Dars"
              placeholder="Darsni tanlang yoki qidiring…"
              disabled={content.isPending || !selectedClass}
              invalid={fieldState.invalid}
            />
          )}
        />
        {errors.lessonId && <small className="field-error">{errors.lessonId.message}</small>}
      </label>
      {content.error && <ErrorState error={content.error} />}
      <label>
        Topshirish muddati
        <input type="datetime-local" {...register('deadline')} />
        {errors.deadline && <small className="field-error">{errors.deadline.message}</small>}
      </label>
      {error && (
        <div role="alert" className="form-error">
          {error}
        </div>
      )}
      <div className="modal-actions">
        <Button variant="secondary" type="button" onClick={close}>
          Bekor qilish
        </Button>
        <Button busy={isSubmitting} type="submit">
          Topshiriq berish
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
  if (!assignments.length)
    return (
      <EmptyState
        title="Hali topshiriq berilmagan"
        description="Darsni tanlab, sinfingizga birinchi topshiriqni bering."
      />
    );
  return (
    <div className="teacher-assignments">
      {assignments.map((a) => {
        const count = studentCount ?? a.class?._count?.students ?? 0;
        return (
          <Card key={a.id}>
            <div className="card-heading">
              <div>
                <span className="eyebrow">
                  {a.class?.name || 'TOPSHIRIQ'} · {dateLabel(a.deadline)} GACHA
                </span>
                <h3>{a.title}</h3>
                <p>{a.lesson.title}</p>
              </div>
              <span className="square-icon blue">
                <ClipboardList size={23} />
              </span>
            </div>
            <div className="progress-label">
              <span>Bajarilish holati</span>
              <strong>
                {a.submissions.length} / {count}
              </strong>
            </div>
            <ProgressBar value={count ? (a.submissions.length / count) * 100 : 0} tone="mint" />
            {a.submissions.length ? (
              <details className="submission-details">
                <summary>Natijalarni ko‘rish</summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>O‘quvchi</th>
                        <th>Natija</th>
                        <th>Topshirish</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.submissions.map((s) => (
                        <tr key={s.user?.id || s.createdAt}>
                          <td>{s.user?.name}</td>
                          <td>
                            <strong>{s.score}%</strong>
                          </td>
                          <td>{s.late ? 'Kech topshirilgan' : 'O‘z vaqtida'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : (
              <p className="subtle">Hali natijalar yo‘q.</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
export default function TeacherPage({ assignmentsOnly = false }: { assignmentsOnly?: boolean }) {
  const { id } = useParams();
  const [open, setOpen] = useState(false);
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
  const struggling = students.filter((s) => s.completed > 0 && s.mastery < 60);
  return (
    <>
      {id && (
        <Link to="/teacher" className="back-link">
          <ArrowLeft size={17} />
          Mening sinflarim
        </Link>
      )}
      <PageHeader
        eyebrow="O‘QITUVCHI MAYDONI"
        title={
          id
            ? `${detail.data?.name} sinfi`
            : assignmentsOnly
              ? 'Topshiriqlar va natijalar'
              : 'Har bir o‘quvchi e’tiborda.'
        }
        description={
          id
            ? 'O‘quvchilar, mavzular va topshiriqlar natijalari.'
            : 'Sinfingizning o‘rganish jarayonini kuzating va keyingi qadamni belgilang.'
        }
        action={
          <Button onClick={() => setOpen(true)} disabled={!groups.length}>
            <Plus size={18} />
            Topshiriq berish
          </Button>
        }
      />
      {!id && !assignmentsOnly && (
        <>
          <div className="stats-grid">
            <Stat
              label="Mening sinflarim"
              value={groups.length}
              icon={<GraduationCap size={26} />}
            />
            <Stat
              label="O‘quvchilar"
              value={new Set(students.map((s) => s.id)).size}
              icon={<Users size={26} />}
            />
            <Stat
              label="Yordam kerak"
              value={new Set(struggling.map((s) => s.id)).size}
              icon={<BookOpen size={26} />}
              detail="O‘zlashtirish 60% dan past"
            />
          </div>
          <div className="section-title">
            <h2>Sinflarim</h2>
            <span className="subtle">Haqiqiy o‘quv natijalari asosida</span>
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
                    {group.students.length} o‘quvchi · {group.grade}-sinf
                  </p>
                  <div className="class-metrics">
                    <div>
                      <span className="metric-dot mint" />
                      80% dan yuqori<strong>{learned.filter((s) => s.mastery > 80).length}</strong>
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
                      60% dan past<strong>{learned.filter((s) => s.mastery < 60).length}</strong>
                    </div>
                    <div>
                      <span className="metric-dot gray" />
                      Hali boshlamagan<strong>{group.students.length - learned.length}</strong>
                    </div>
                  </div>
                  <Link to={`/teacher/classes/${group.id}`} className="btn btn-secondary">
                    Sinfni ko‘rish
                    <ArrowRight size={17} />
                  </Link>
                </Card>
              );
            })}
          </div>
          {!groups.length && (
            <Card>
              <EmptyState
                title="Hali sinflar biriktirilmagan"
                description="Administrator sizga sinf biriktirganda shu yerda ko‘rinadi."
              />
            </Card>
          )}
        </>
      )}
      {id && detail.data && (
        <>
          <Card>
            <div className="card-heading">
              <h2>O‘quvchilar</h2>
              <span className="pill">{detail.data.students.length} o‘quvchi</span>
            </div>
            {detail.data.students.length ? (
              <div className="student-list">
                {detail.data.students.map((student) => (
                  <details key={student.id} className="student-performance">
                    <summary>
                      <span className="avatar">{student.name[0]}</span>
                      <div>
                        <strong>{student.name}</strong>
                        <small>{student.completed} ta dars yakunlangan</small>
                      </div>
                      <span
                        className={`pill ${student.mastery >= 80 ? 'status-completed' : student.completed && student.mastery < 60 ? 'warm' : ''}`}
                      >
                        {student.completed ? `${student.mastery}%` : 'Boshlamagan'}
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
                        <p>O‘quvchi hali dars yakunlamagan.</p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <EmptyState title="Sinfda hali o‘quvchilar yo‘q" />
            )}
          </Card>
          <div className="section-title">
            <h2>Sinf topshiriqlari</h2>
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
        title="Yangi topshiriq"
        description="Sinf, dars va muddatni tanlang."
      >
        <AssignmentForm classes={groups} close={() => setOpen(false)} />
      </Modal>
    </>
  );
}
