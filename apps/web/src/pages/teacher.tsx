import { translate as tx, useI18n as usePageLocale } from '../i18n';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Plus,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { TeacherAnalysis } from '../components/teacher-analysis';
import type { Assignment, Classroom } from '../lib/types';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageHeader,
  Stat,
} from '../components/ui';
import { AssignmentForm } from './teacher/assignment-form';
import { AssignmentResults } from './teacher/assignment-results';

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
