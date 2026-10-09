import { localizeText } from '../../i18n';
import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  Settings2,
  ArrowRight,
} from 'lucide-react';
import type { Analytics } from '../../lib/types';
import { Card, EmptyState, Stat, dateLabel } from '../../components/ui';
import { formatNumber } from '../../lib/locale';
export function AdminOverview({ data }: { data: Analytics }) {
  usePageLocale();
  return (
    <>
      <div className="stats-grid four">
        <Stat
          label={tx('navigation.users')}
          value={data.users}
          detail={tx('pages.admin.overview.studentsTeachers', {
            value1: data.students,
            value2: data.teachers,
          })}
          icon={<Users size={24} />}
        />
        <Stat
          label={tx('pages.admin.overview.publishedLessons')}
          value={data.published}
          detail={tx('pages.admin.overview.draftsarchived', { value1: data.draft })}
          icon={<BookOpen size={24} />}
        />
        <Stat
          label={tx('pages.admin.overview.completedExercises')}
          value={data.completedAttempts}
          icon={<CheckCircle2 size={24} />}
        />
        <Stat
          label={tx('pages.admin.overview.averageScore')}
          value={`${data.averageScore}%`}
          icon={<GraduationCap size={24} />}
        />
      </div>
      <div className="admin-quick-links">
        <Link to="/admin/content">
          <Layers size={27} />
          <div>
            <h3>{tx('navigation.content')}</h3>
            <p>
              {tx('pages.admin.overview.subjectsLessons', {
                value1: data.subjects,
                value2: data.lessons,
              })}
            </p>
          </div>
          <ArrowRight size={20} />
        </Link>
        <Link to="/admin/gamification">
          <Settings2 size={27} />
          <div>
            <h3>{tx('navigation.gamification')}</h3>
            <p>
              {tx('pages.admin.overview.totalXpAwarded', { value1: formatNumber(data.totalXp) })}
            </p>
          </div>
          <ArrowRight size={20} />
        </Link>
      </div>
      <Card>
        <h2>{tx('pages.admin.overview.recentLearningActivity')}</h2>
        {data.recent.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{tx('role.STUDENT')}</th>
                  <th>{tx('pages.admin.overview.activity')}</th>
                  <th>{tx('pages.admin.overview.result')}</th>
                  <th>XP</th>
                  <th>{tx('pages.admin.overview.date')}</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((row) => (
                  <tr key={row.id}>
                    <td>{row.user.name}</td>
                    <td>{localizeText(row.lesson?.title) || tx('navigation.challenge')}</td>
                    <td>{row.score}%</td>
                    <td>+{row.earnedXp}</td>
                    <td>{dateLabel(row.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title={tx('pages.admin.overview.waitingForLearningActivity')}
            description={tx(
              'pages.admin.overview.activityAppearsHereWhenStudentsCompleteExercises',
            )}
          />
        )}
      </Card>
    </>
  );
}
