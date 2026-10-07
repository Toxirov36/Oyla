import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock3 } from 'lucide-react';
import type { Assignment } from '../lib/types';
import { tashkentDate } from '../lib/locale';
import { Card, EmptyState, dateLabel } from './ui';

export function StudentAssignments({ assignments }: { assignments: Assignment[] }) {
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
                  ? 'Bajarilgan'
                  : new Date(a.deadline) < new Date()
                    ? 'Muddat o‘tgan'
                    : 'Bajarish kerak'}
              </span>
            </div>
            <h3>{a.title}</h3>
            <p>{a.lesson.title}</p>
            <div className="assignment-meta">
              <Clock3 size={16} />
              <time dateTime={a.deadline}>
                {dateLabel(a.deadline)}, {time} gacha
              </time>{' '}
              · {a.class.name}
            </div>
            {a.submissions[0] && (
              <p className="submission-score">
                Natija: <strong>{a.submissions[0].score}%</strong>
                {a.submissions[0].late ? ' · kech topshirilgan' : ''}
              </p>
            )}
            <Link
              to={`/lessons/${a.lesson.id}`}
              className={`btn ${a.submissions.length ? 'btn-secondary' : 'btn-primary'}`}
            >
              {a.submissions.length ? 'Darsni takrorlash' : 'Topshiriqni boshlash'}
            </Link>
          </Card>
        );
      })}
    </div>
  ) : (
    <Card>
      <EmptyState
        title="Hozircha topshiriqlar yo‘q"
        description="O‘qituvchingiz topshiriq berganda shu yerda ko‘rinadi."
        action={
          <Link to="/subjects" className="btn btn-primary">
            Mustaqil o‘rganish
          </Link>
        }
      />
    </Card>
  );
}
