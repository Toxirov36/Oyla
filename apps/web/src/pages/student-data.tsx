import { localizeText } from '../i18n';
import { formatNumber } from '../lib/locale';
import { translate as tx, useI18n as usePageLocale } from '../i18n';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Award, BookOpen, Flame, LockKeyhole, Target, Trophy, Zap } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../lib/api';
import type { Assignment, Badge, Dashboard, Ranking } from '../lib/types';
import {
  Button,
  Card,
  ErrorState,
  Loading,
  PageHeader,
  ProgressBar,
  Stat,
  dateLabel,
} from '../components/ui';
import { LeaderboardPreview, subjectStyle } from './dashboard';
import { StudentAssignments } from '../components/student-assignments';

export default function StudentDataPage({
  mode,
}: {
  mode: 'progress' | 'badges' | 'leaderboard' | 'assignments';
}) {
  usePageLocale();
  const [params, setParams] = useSearchParams();
  const scope =
    params.get('scope') === 'friends'
      ? 'friends'
      : params.get('scope') === 'class'
        ? 'class'
        : 'weekly';
  const classId = scope === 'class' ? params.get('classId') : null;
  const setScope = (next: 'weekly' | 'class' | 'friends') =>
    setParams(next === 'class' && classId ? { scope: next, classId } : { scope: next });
  const progress = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<Dashboard>('/students/me'),
    enabled: mode === 'progress',
  });
  const badges = useQuery({
    queryKey: ['badges'],
    queryFn: () => api<Badge[]>('/badges'),
    enabled: mode === 'badges',
  });
  const ranking = useQuery({
    queryKey: ['ranking', scope, classId],
    queryFn: () =>
      api<Ranking[]>(
        `/leaderboards?scope=${scope}${classId ? `&classId=${encodeURIComponent(classId)}` : ''}`,
      ),
    enabled: mode === 'leaderboard',
  });
  const assignments = useQuery({
    queryKey: ['assignments'],
    queryFn: () => api<Assignment[]>('/students/me/assignments'),
    enabled: mode === 'assignments',
  });
  const active =
    mode === 'progress'
      ? progress
      : mode === 'badges'
        ? badges
        : mode === 'leaderboard'
          ? ranking
          : assignments;
  if (active.isPending) return <Loading />;
  if (active.error) return <ErrorState error={active.error} retry={() => void active.refetch()} />;
  if (mode === 'progress' && progress.data) {
    const d = progress.data;
    return (
      <>
        <PageHeader
          eyebrow={tx('pages.student-data.everyStepCounts')}
          title={tx('navigation.progress')}
          description={tx('pages.student-data.yourRealResultsFromWhereYouStartedTo')}
        />
        <div className="stats-grid">
          <Stat
            label={tx('profile.completedLessons')}
            value={`${d.completedLessons} / ${d.totalLessons}`}
            icon={<BookOpen size={25} />}
          />
          <Stat
            label={tx('pages.student-data.totalXp')}
            value={formatNumber(d.totalXp)}
            icon={<Zap size={25} />}
          />
          <Stat
            label={tx('pages.student-data.currentStreak')}
            value={tx('pages.student-data.days', { value1: d.streak })}
            icon={<Flame size={25} />}
            detail={tx('pages.student-data.longestStreakDays', { value1: d.longestStreak })}
          />
        </div>
        <div className="two-column">
          <Card>
            <div className="card-heading">
              <h2>{tx('pages.student-data.bySubject')}</h2>
              <Target size={22} />
            </div>
            {d.subjects.map((s) => (
              <div className="subject-progress-row" key={s.id}>
                <div className="progress-label">
                  <strong>{localizeText(s.title)}</strong>
                  <span>
                    {tx('pages.student-data.lessonProgress', {
                      completed: s.completed,
                      total: s.total,
                      progress: s.progress,
                    })}
                  </span>
                </div>
                <ProgressBar value={s.progress} tone={subjectStyle(s.slug).tone} />
                <small>{tx('pages.student-data.mastery', { value1: s.mastery })}</small>
              </div>
            ))}
          </Card>
          <Card>
            <h2>{tx('pages.student-data.last7Days')}</h2>
            <p className="card-subtitle">{tx('pages.student-data.xpEarnedThroughLearning')}</p>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.activity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(day) => String(day).slice(8)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(day) => String(day)}
                    formatter={(v) => [
                      tx('pages.admin.gamification.xpVariant60', { value1: String(v ?? '') }),
                      tx('pages.student-data.activity'),
                    ]}
                  />
                  <Bar dataKey="xp" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <div className="section-title">
          <h2>{tx('pages.student-data.topicMastery')}</h2>
          <span className="subtle">{tx('pages.student-data.basedOnYourBestResults')}</span>
        </div>
        <div className="topic-progress-grid">
          {d.topics.map((t) => (
            <Card key={t.id}>
              <span className="eyebrow">{localizeText(t.subject)}</span>
              <h3>{localizeText(t.title)}</h3>
              <div className="progress-label">
                <span>{tx('pages.student-data.masteryVariant348')}</span>
                <strong>{t.mastery}%</strong>
              </div>
              <ProgressBar value={t.mastery} tone="mint" />
              <p className="subtle">
                {tx('pages.student-data.lessonsCompleted', {
                  value1: t.completed,
                  value2: t.total,
                })}
              </p>
            </Card>
          ))}
        </div>
        <p className="formula-note">
          {tx('pages.student-data.lessonsCompletedMasteryTargetReached', {
            value1: d.completedLessons,
            value2: d.masteredLessons ?? 0,
          })}
        </p>
        <p className="formula-note">
          {tx('pages.student-data.progressIsTheShareOfCompletedLessonsMastery')}
        </p>
      </>
    );
  }
  if (mode === 'badges')
    return (
      <>
        <PageHeader
          eyebrow={tx('pages.student-data.yourEffortYourSuccess')}
          title={tx('pages.student-data.myBadges')}
          description={tx('pages.student-data.yourSmallAndBigVictoriesOnTheLearning')}
        />
        <div className="badge-grid">
          {badges.data?.map((b) => (
            <Card key={b.id} className={`badge-card ${b.unlockedAt ? 'unlocked' : 'locked'}`}>
              <div className="badge-art">
                {b.unlockedAt ? <Award size={53} /> : <LockKeyhole size={45} />}
              </div>
              <span className={`pill ${b.unlockedAt ? 'status-completed' : ''}`}>
                {b.unlockedAt ? tx('pages.student-data.earned') : tx('pages.student-data.nextGoal')}
              </span>
              <h3>{localizeText(b.title)}</h3>
              <p>{localizeText(b.description)}</p>
              <small>
                {b.unlockedAt
                  ? dateLabel(b.unlockedAt)
                  : tx(
                      b.criterion === 'STREAK' ? 'common.days' : 'pages.student-data.resultCount',
                      { count: b.threshold },
                    )}
              </small>
            </Card>
          ))}
        </div>
      </>
    );
  if (mode === 'leaderboard')
    return (
      <>
        <PageHeader
          eyebrow={tx('pages.student-data.learnTogetherGrowTogether')}
          title={tx('pages.student-data.learnerRankings')}
          description={tx('pages.student-data.rankingsUseXpCalculatedByTheServerEvery')}
        />
        <div className="segmented">
          <Button
            variant={scope === 'weekly' ? 'primary' : 'ghost'}
            onClick={() => setScope('weekly')}
          >
            <Trophy size={17} />
            {tx('pages.student-data.weekly')}
          </Button>
          <Button
            variant={scope === 'class' ? 'primary' : 'ghost'}
            onClick={() => setScope('class')}
          >
            {tx('navigation.class')}
          </Button>
          <Button
            variant={scope === 'friends' ? 'primary' : 'ghost'}
            onClick={() => setScope('friends')}
          >
            {tx('pages.student-data.friends')}
          </Button>
        </div>
        <Card className="full-leaderboard">
          <div className="leaderboard-heading">
            <span>{tx('role.STUDENT')}</span>
            <span>{tx('pages.student-data.earnedXp')}</span>
          </div>
          <LeaderboardPreview rows={ranking.data || []} />
        </Card>
        <p className="formula-note">
          {scope === 'class'
            ? tx('pages.student-data.classRankingsUseTheAlltimeXpOfActive')
            : tx('pages.student-data.weeklyRankingsStartOnMondayTashkentTimePrevious')}
        </p>
        {scope === 'friends' && (
          <p className="formula-note">
            {tx('pages.student-data.theRankingIncludesYouAndYourAcceptedActive')}
            <Link to="/friends">{tx('pages.student-data.manageMyFriends')}</Link>
          </p>
        )}
      </>
    );
  return (
    <>
      <PageHeader
        eyebrow={tx('pages.student-data.fromYourTeacher')}
        title={tx('pages.student-data.myAssignments')}
        description={tx('pages.student-data.completeLessonsPracticeWhatYouLearnAndSee')}
      />
      <StudentAssignments assignments={assignments.data || []} />
    </>
  );
}
