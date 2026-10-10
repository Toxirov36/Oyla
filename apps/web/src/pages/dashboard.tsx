import { localizeText } from '../i18n';
import { translate as tx } from '../i18n';
import { translate, useI18n } from '../i18n';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Flame,
  Globe,
  Lightbulb,
  Plus,
  Play,
  Sparkles,
  Trophy,
  Zap,
  Calculator,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, formatNumber } from '../lib/locale';
import type { Daily, Dashboard, Ranking } from '../lib/types';
import {
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  ProgressBar,
  dateLabel,
  TextLink,
} from '../components/ui';

export const subjectStyle = (slug: string) =>
  slug === 'mathematics'
    ? { tone: 'blue', icon: Calculator, label: translate('subject.mathematics').toUpperCase() }
    : slug === 'english'
      ? { tone: 'mint', icon: Globe, label: translate('subject.english').toUpperCase() }
      : { tone: 'purple', icon: Code2, label: translate('subject.informatics').toUpperCase() };
export function LeaderboardPreview({ rows }: { rows: Ranking[] }) {
  const { t } = useI18n();
  return rows.length ? (
    <div className="ranking-list">
      {rows.map((row) => (
        <div className={`ranking-row ${row.isMe ? 'is-me' : ''}`} key={row.userId}>
          <span className={`rank rank-${row.rank}`}>
            {row.rank <= 3 ? <Trophy size={17} /> : row.rank}
          </span>
          <UserAvatar name={row.name} avatar={row.avatar} size="sm" />
          <strong>
            {row.name}
            {row.isMe && <small> {t('dashboard.me')}</small>}
          </strong>
          <span className="ranking-xp">
            {formatNumber(row.xp)} <small>XP</small>
          </span>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState title={t('dashboard.firstRank')} description={t('dashboard.rankHelp')} />
  );
}
export default function DashboardPage() {
  const { t } = useI18n();
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<Dashboard>('/students/me'),
  });
  const ranking = useQuery({
    queryKey: ['ranking', 'weekly'],
    queryFn: () => api<Ranking[]>('/leaderboards?scope=weekly'),
  });
  const challenge = useQuery({
    queryKey: ['daily'],
    queryFn: () => api<Daily>('/daily-challenge'),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const d = query.data;
  const next = d.continueLesson;
  const currentLevelProgress = d.nextLevel
    ? ((d.totalXp - d.level.threshold) / (d.nextLevel.threshold - d.level.threshold)) * 100
    : 100;
  const pending = d.assignments.filter((a) => !a.submissions.length);
  return (
    <>
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.hello', { name: d.user.name.split(' ')[0] })}
        description={t('dashboard.description')}
        action={
          <div className="date-chip">
            <span className="live-dot" />
            {formatDate(new Date(), true)}
          </div>
        }
      />
      <div className="dashboard-layout">
        <div className="dashboard-main">
          <Card className="continue-card">
            <div className="continue-copy">
              <div className="hero-kicker">
                <span className="hero-dot" />
                {t('dashboard.journey')}
              </div>
              <h2>{next ? t('dashboard.nextStep') : t('dashboard.great')}</h2>
              <p>
                {next
                  ? `${localizeText(next.subject)} · ${localizeText(next.topic)}`
                  : t('dashboard.allDone')}
              </p>
              {next && (
                <>
                  <h3>{localizeText(next.title)}</h3>
                  <div className="hero-meta">
                    <span>
                      {next.duration > 0 ? <Clock3 size={15} /> : <Play size={15} />}
                      {next.duration > 0
                        ? t('common.minutes', { count: next.duration })
                        : t('lesson.video')}
                    </span>
                    <span>
                      <BookOpen size={15} />
                      {t(next.duration > 0 ? 'dashboard.understandPractice' : 'dashboard.videoPractice')}
                    </span>
                  </div>
                  <Link className="btn btn-white" to={`/lessons/${next.id}`}>
                    {t('dashboard.continue')}
                    <ArrowRight size={18} />
                  </Link>
                </>
              )}
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="hero-art-grid" />
              <div className="hero-art-book">
                <BookOpen size={74} />
              </div>
              <span className="hero-art-spark">
                <Sparkles size={22} />
              </span>
              <span className="hero-art-plus">+</span>
              <div className="hero-art-bubble">
                {t('auth.newKnowledge')}
                <br />
                <strong>{t('dashboard.newOpportunity')}</strong>
              </div>
            </div>
          </Card>
          <div className="section-title">
            <h2>{t('navigation.subjects')}</h2>
            <Link to="/subjects">
              <TextLink>{t('dashboard.allLessons')}</TextLink>
            </Link>
          </div>
          <div className="subject-grid">
            {d.subjects.map((subject) => {
              const { tone, icon: Icon } = subjectStyle(subject.slug);
              return (
                <Link
                  to={`/subjects/${subject.id}`}
                  key={subject.id}
                  className={`subject-card card ${tone}`}
                >
                  <span className="subject-icon">
                    <Icon size={26} />
                  </span>
                  <div className="subject-card-top">
                    <h3>{localizeText(subject.title)}</h3>
                    <ChevronRight size={17} />
                  </div>
                  <p>
                    {t('dashboard.lessonsDone', {
                      completed: subject.completed,
                      total: subject.total,
                    })}
                  </p>
                  <div className="progress-label">
                    <span>{t('dashboard.learningProgress')}</span>
                    <strong>{subject.progress}%</strong>
                  </div>
                  <ProgressBar value={subject.progress} tone={tone} />
                </Link>
              );
            })}
          </div>
          <div className="section-title">
            <h2>{t('dashboard.opportunities')}</h2>
            <span className="subtle">{t('dashboard.oneStep')}</span>
          </div>
          <div className="opportunity-grid">
            <Card className="challenge-card">
              <span className="square-icon orange">
                <Zap size={24} />
              </span>
              <span className="pill warm">{t('dashboard.everyDay')}</span>
              <h3>{t('navigation.challenge')}</h3>
              <p>{t('dashboard.challengeHelp')}</p>
              <div className="challenge-reward">
                <Sparkles size={16} />
                {challenge.data
                  ? t('dashboard.xpBonus', { count: challenge.data.reward })
                  : t('common.loadingDots')}
              </div>
              <Link
                className={`btn ${d.dailyCompleted ? 'btn-secondary' : 'btn-primary'}`}
                to="/challenge"
              >
                {d.dailyCompleted ? (
                  <>
                    <Check size={17} />
                    {t('dashboard.viewResult')}
                  </>
                ) : (
                  <>
                    {t('dashboard.startChallenge')}
                    <ArrowRight size={17} />
                  </>
                )}
              </Link>
            </Card>
            <Card className="assignment-preview">
              <div className="card-heading">
                <span className="square-icon blue">
                  <BookOpen size={22} />
                </span>
                <span className="pill">
                  {t('dashboard.newAssignments', { count: pending.length })}
                </span>
              </div>
              <h3>{t('dashboard.teacherAssignment')}</h3>
              {pending[0] ? (
                <>
                  <p>{pending[0].title}</p>
                  <div className="assignment-meta">
                    <Clock3 size={16} />
                    {t('dashboard.deadline', {
                      date: dateLabel(pending[0].deadline),
                      class: pending[0].class.name,
                    })}
                  </div>
                  <Link className="btn btn-secondary" to={`/lessons/${pending[0].lesson.id}`}>
                    {t('dashboard.doAssignment')}
                    <ArrowRight size={17} />
                  </Link>
                </>
              ) : (
                <>
                  <p>{t('dashboard.noAssignment')}</p>
                  <Link to="/assignments" className="text-link">
                    {t('dashboard.viewAssignments')}
                    <ArrowRight size={17} />
                  </Link>
                </>
              )}
            </Card>
          </div>
          <Card className="tip-card">
            <Lightbulb size={24} />
            <div>
              <strong>{t('dashboard.habit')}</strong>
              <p>{t('dashboard.habitHelp')}</p>
            </div>
          </Card>
        </div>
        <aside className="dashboard-side">
          <Card className="journey-card">
            <div className="card-heading">
              <h3>{t('dashboard.growth')}</h3>
              <Sparkles size={18} className="purple-text" />
            </div>
            <div className="level-orbit">
              <div className="level-circle">
                <span>{t('profile.levelLabel')}</span>
                <strong>{d.level.number}</strong>
              </div>
              <div className="level-caption">
                <strong>{localizeText(d.level.title)}</strong>
                <span>{t('dashboard.learning')}</span>
              </div>
            </div>
            <div className="progress-label">
              <strong>
                {tx('pages.admin.gamification.xpVariant60', { value1: formatNumber(d.totalXp) })}
              </strong>
              <span>
                {d.nextLevel
                  ? tx('pages.admin.gamification.xpVariant60', {
                      value1: formatNumber(d.nextLevel.threshold),
                    })
                  : t('dashboard.maxLevel')}
              </span>
            </div>
            <ProgressBar value={currentLevelProgress} tone="purple" />
            <p className="xp-until">
              {d.nextLevel
                ? t('dashboard.nextLevel', { count: d.nextLevel.threshold - d.totalXp })
                : t('dashboard.keepGoing')}
            </p>
            <div className="journey-stats">
              <div>
                <span className="stat-mini orange">
                  <Flame size={21} />
                </span>
                <strong>
                  {d.streak}
                  <small>{t('dashboard.streak')}</small>
                </strong>
              </div>
              <div>
                <span className="stat-mini mint">
                  <Check size={21} />
                </span>
                <strong>
                  {d.completedLessons}
                  <small>{t('dashboard.completed')}</small>
                </strong>
              </div>
            </div>
          </Card>
          <Card className="leaderboard-card">
            <div className="card-heading">
              <h3>{t('dashboard.weekLeaders')}</h3>
              <Trophy size={18} className="orange-text" />
            </div>
            <p className="card-subtitle">{t('dashboard.growTogether')}</p>
            {ranking.error ? (
              <ErrorState error={ranking.error} retry={() => void ranking.refetch()} />
            ) : (
              <LeaderboardPreview rows={(ranking.data || []).slice(0, 4)} />
            )}
            <Link to="/leaderboard" className="card-bottom-link">
              {t('dashboard.fullRanking')}
              <ChevronRight size={16} />
            </Link>
          </Card>
          <Card className="badges-preview">
            <div className="card-heading">
              <h3>{t('dashboard.achievements')}</h3>
              <Link to="/badges" aria-label={t('dashboard.allBadges')}>
                <Plus size={19} />
              </Link>
            </div>
            <div className="mini-badges">
              {d.badges.length ? (
                d.badges.map(({ badge }) => (
                  <Link key={badge.id} to="/badges" title={badge.title}>
                    <span className="badge-medal">
                      <Award size={29} />
                    </span>
                    <small>{badge.title}</small>
                  </Link>
                ))
              ) : (
                <div className="first-badge">
                  <Award size={34} />
                  <p>{t('dashboard.firstBadge')}</p>
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}
import { UserAvatar } from '../components/user-avatar';
