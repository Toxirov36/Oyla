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
  Sparkles,
  Trophy,
  Zap,
  Calculator,
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/locale';
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
    ? { tone: 'blue', icon: Calculator, label: 'MATEMATIKA' }
    : slug === 'english'
      ? { tone: 'mint', icon: Globe, label: 'INGLIZ TILI' }
      : { tone: 'purple', icon: Code2, label: 'INFORMATIKA' };
export function LeaderboardPreview({ rows }: { rows: Ranking[] }) {
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
            {row.isMe && <small> (siz)</small>}
          </strong>
          <span className="ranking-xp">
            {row.xp.toLocaleString()} <small>XP</small>
          </span>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState
      title="Birinchi o‘rinni siz oling"
      description="Dars yakunlang — XPingiz reytingda ko‘rinadi."
    />
  );
}
export default function DashboardPage() {
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
        eyebrow="BUGUN YANGI IMKONIYATLAR KUNI"
        title={`Salom, ${d.user.name.split(' ')[0]}! 👋`}
        description="Keling, bugun ham birgalikda yangi narsalarni o‘rganamiz."
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
                BILIM SAYOHATINGIZ DAVOM ETADI
              </div>
              <h2>{next ? 'Keyingi katta qadam.' : 'Siz ajoyib natijaga erishdingiz!'}</h2>
              <p>
                {next
                  ? `${next.subject} · ${next.topic}`
                  : 'Barcha darslar yakunlandi. Mashqlar bilan bilimni mustahkamlang.'}
              </p>
              {next && (
                <>
                  <h3>{next.title}</h3>
                  <div className="hero-meta">
                    <span>
                      <Clock3 size={15} />
                      {next.duration} daqiqa
                    </span>
                    <span>
                      <BookOpen size={15} />
                      Tushunish + mashq
                    </span>
                  </div>
                  <Link className="btn btn-white" to={`/lessons/${next.id}`}>
                    O‘rganishni davom ettirish
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
                Yangi bilim
                <br />
                <strong>yangi imkoniyat</strong>
              </div>
            </div>
          </Card>
          <div className="section-title">
            <h2>Mening fanlarim</h2>
            <Link to="/subjects">
              <TextLink>Barcha darslar</TextLink>
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
                    <h3>{subject.title}</h3>
                    <ChevronRight size={17} />
                  </div>
                  <p>
                    {subject.completed} / {subject.total} dars yakunlandi
                  </p>
                  <div className="progress-label">
                    <span>O‘rganish progressi</span>
                    <strong>{subject.progress}%</strong>
                  </div>
                  <ProgressBar value={subject.progress} tone={tone} />
                </Link>
              );
            })}
          </div>
          <div className="section-title">
            <h2>Bugungi imkoniyatlar</h2>
            <span className="subtle">Bir qadam oldinga</span>
          </div>
          <div className="opportunity-grid">
            <Card className="challenge-card">
              <span className="square-icon orange">
                <Zap size={24} />
              </span>
              <span className="pill warm">HAR KUNI YANGI</span>
              <h3>Kunlik challenge</h3>
              <p>5 ta savol. Turli fanlar. O‘zingizni sinash uchun ajoyib imkoniyat.</p>
              <div className="challenge-reward">
                <Sparkles size={16} />
                {challenge.data ? `+${challenge.data.reward} XP bonus` : 'Yuklanmoqda...'}
              </div>
              <Link
                className={`btn ${d.dailyCompleted ? 'btn-secondary' : 'btn-primary'}`}
                to="/challenge"
              >
                {d.dailyCompleted ? (
                  <>
                    <Check size={17} />
                    Natijani ko‘rish
                  </>
                ) : (
                  <>
                    Challengeni boshlash
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
                <span className="pill">{pending.length} ta yangi</span>
              </div>
              <h3>O‘qituvchi topshirig‘i</h3>
              {pending[0] ? (
                <>
                  <p>{pending[0].title}</p>
                  <div className="assignment-meta">
                    <Clock3 size={16} />
                    {dateLabel(pending[0].deadline)} gacha · {pending[0].class.name}
                  </div>
                  <Link className="btn btn-secondary" to={`/lessons/${pending[0].lesson.id}`}>
                    Topshiriqni bajarish
                    <ArrowRight size={17} />
                  </Link>
                </>
              ) : (
                <>
                  <p>Hozircha yangi topshiriq yo‘q. Mustaqil o‘rganishni davom ettiring.</p>
                  <Link to="/assignments" className="text-link">
                    Topshiriqlarni ko‘rish
                    <ArrowRight size={17} />
                  </Link>
                </>
              )}
            </Card>
          </div>
          <Card className="tip-card">
            <Lightbulb size={24} />
            <div>
              <strong>Kichik odat, katta natija.</strong>
              <p>
                Har kuni bitta darsni yakunlash ham bilimingizni mustahkamlaydi. Muhimi — davom
                etish.
              </p>
            </div>
          </Card>
        </div>
        <aside className="dashboard-side">
          <Card className="journey-card">
            <div className="card-heading">
              <h3>Sizning rivojlanishingiz</h3>
              <Sparkles size={18} className="purple-text" />
            </div>
            <div className="level-orbit">
              <div className="level-circle">
                <span>DARAJA</span>
                <strong>{d.level.number}</strong>
              </div>
              <div className="level-caption">
                <strong>{d.level.title}</strong>
                <span>O‘rganish davom etmoqda</span>
              </div>
            </div>
            <div className="progress-label">
              <strong>{d.totalXp.toLocaleString()} XP</strong>
              <span>
                {d.nextLevel ? `${d.nextLevel.threshold.toLocaleString()} XP` : 'Eng yuqori daraja'}
              </span>
            </div>
            <ProgressBar value={currentLevelProgress} tone="purple" />
            <p className="xp-until">
              {d.nextLevel
                ? `Keyingi darajaga ${d.nextLevel.threshold - d.totalXp} XP qoldi`
                : 'Yangi bilimlar sari davom eting!'}
            </p>
            <div className="journey-stats">
              <div>
                <span className="stat-mini orange">
                  <Flame size={21} />
                </span>
                <strong>
                  {d.streak}
                  <small>kunlik streak</small>
                </strong>
              </div>
              <div>
                <span className="stat-mini mint">
                  <Check size={21} />
                </span>
                <strong>
                  {d.completedLessons}
                  <small>tugallangan dars</small>
                </strong>
              </div>
            </div>
          </Card>
          <Card className="leaderboard-card">
            <div className="card-heading">
              <h3>Hafta bilimdonlari</h3>
              <Trophy size={18} className="orange-text" />
            </div>
            <p className="card-subtitle">Bilim yo‘lida birga o‘samiz.</p>
            {ranking.error ? (
              <ErrorState error={ranking.error} retry={() => void ranking.refetch()} />
            ) : (
              <LeaderboardPreview rows={(ranking.data || []).slice(0, 4)} />
            )}
            <Link to="/leaderboard" className="card-bottom-link">
              To‘liq reyting
              <ChevronRight size={16} />
            </Link>
          </Card>
          <Card className="badges-preview">
            <div className="card-heading">
              <h3>Yutuqlarim</h3>
              <Link to="/badges" aria-label="Barcha nishonlar">
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
                  <p>Birinchi darsni yakunlang va ilk nishoningizni oching.</p>
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
