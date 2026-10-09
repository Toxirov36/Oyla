import { localizeText } from '../i18n';
import { translate as tx, useI18n as usePageLocale } from '../i18n';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock3 } from 'lucide-react';
import type { Assignment } from '../lib/types';
import { tashkentDate } from '../lib/locale';
import { Card, EmptyState, dateLabel } from './ui';
import { AssignmentAttachments } from './assignment-attachments';

export function StudentAssignments({ assignments }: { assignments: Assignment[] }) {
  usePageLocale();
  return assignments.length ? (
    <div className="assignment-grid">
      {assignments.map((a) => {
        const date = tashkentDate(a.deadline);
        const time = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
        return (
          <Card key={a.id} className="assignment-card">
            <div className="card-heading">
              <span className={`square-icon ${a.submissions.length ? 'mint' : 'blue'}`}>
                {a.submissions.length ? <CheckCircle2 size={24} /> : <BookOpen size={24} />}
              </span>
              <span className={`pill ${a.submissions.length ? 'status-completed' : ''}`}>
                {a.submissions.length
                  ? tx('common.completed')
                  : new Date(a.deadline) < new Date()
                    ? tx('pages.student-assignments.overdue')
                    : tx('pages.student-assignments.toDo')}
              </span>
            </div>
            <h3>{a.title}</h3>
            <p>{localizeText(a.lesson.title)}</p>
            <AssignmentAttachments attachments={a.attachments} />
            <div className="assignment-meta">
              <Clock3 size={16} />
              <time dateTime={a.deadline}>
                {tx('pages.student-assignments.due', {
                  value1: dateLabel(a.deadline),
                  value2: time,
                })}
              </time>{' '}
              · {a.class.name}
            </div>
            {a.submissions[0] && (
              <p className="submission-score">
                {tx('pages.student-assignments.result')}
                <strong>{a.submissions[0].score}%</strong>
                {a.submissions[0].late ? tx('pages.student-assignments.submittedLate') : ''}
              </p>
            )}
            <Link
              to={`/lessons/${a.lesson.id}`}
              className={`btn ${a.submissions.length ? 'btn-secondary' : 'btn-primary'}`}
            >
              {a.submissions.length
                ? tx('pages.student-assignments.reviewLesson')
                : tx('pages.student-assignments.startAssignment')}
            </Link>
          </Card>
        );
      })}
    </div>
  ) : (
    <Card>
      <EmptyState
        title={tx('pages.student-assignments.noAssignmentsYet')}
        description={tx(
          'pages.student-assignments.assignmentsAppearHereWhenYourTeacherAssignsThem',
        )}
        action={
          <Link to="/subjects" className="btn btn-primary">
            {tx('pages.student-class.independentLearning')}
          </Link>
        }
      />
    </Card>
  );
}
