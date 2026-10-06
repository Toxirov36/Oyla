import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  LockKeyhole,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { api } from '../lib/api';
import type { Assignment, Badge, Dashboard, Ranking } from '../lib/types';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  ProgressBar,
  Stat,
  dateLabel,
} from '../components/ui';
import { LeaderboardPreview, subjectStyle } from './dashboard';

export default function StudentDataPage({
  mode,
}: {
  mode: 'progress' | 'badges' | 'leaderboard' | 'assignments';
}) {
  const [scope, setScope] = useState<'weekly' | 'class'>('weekly');
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
    queryKey: ['ranking', scope],
    queryFn: () => api<Ranking[]>(`/leaderboards?scope=${scope}`),
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
          eyebrow="HAR BIR QADAM HISOBDA"
          title="Mening progressim"
          description="Haqiqiy natijalaringiz. Qayerdan boshladingiz va qayerga yetdingiz."
        />
        <div className="stats-grid">
          <Stat
            label="Yakunlangan darslar"
            value={`${d.completedLessons} / ${d.totalLessons}`}
            icon={<BookOpen size={25} />}
          />
          <Stat label="Jami XP" value={d.totalXp.toLocaleString()} icon={<Zap size={25} />} />
          <Stat
            label="Hozirgi streak"
            value={`${d.streak} kun`}
            icon={<Flame size={25} />}
            detail={`Eng uzun: ${d.longestStreak} kun`}
          />
        </div>
        <div className="two-column">
          <Card>
            <div className="card-heading">
              <h2>Fanlar bo‘yicha</h2>
              <Target size={22} />
            </div>
            {d.subjects.map((s) => (
              <div className="subject-progress-row" key={s.id}>
                <div className="progress-label">
                  <strong>{s.title}</strong>
                  <span>
                    {s.completed}/{s.total} dars · {s.progress}%
                  </span>
                </div>
                <ProgressBar value={s.progress} tone={subjectStyle(s.slug).tone} />
                <small>O‘zlashtirish: {s.mastery}%</small>
              </div>
            ))}
          </Card>
          <Card>
            <h2>Oxirgi 7 kun</h2>
            <p className="card-subtitle">O‘quv faoliyati orqali olingan XP</p>
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
                    formatter={(v) => [`${v} XP`, 'Faollik']}
                  />
                  <Bar dataKey="xp" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <div className="section-title">
          <h2>Mavzularni o‘zlashtirish</h2>
          <span className="subtle">Eng yaxshi natijalar asosida</span>
        </div>
        <div className="topic-progress-grid">
          {d.topics.map((t) => (
            <Card key={t.id}>
              <span className="eyebrow">{t.subject}</span>
              <h3>{t.title}</h3>
              <div className="progress-label">
                <span>O‘zlashtirish</span>
                <strong>{t.mastery}%</strong>
              </div>
              <ProgressBar value={t.mastery} tone="mint" />
              <p className="subtle">
                {t.completed} / {t.total} dars yakunlangan
              </p>
            </Card>
          ))}
        </div>
        <p className="formula-note">
          Progress — yakunlangan darslar ulushi. O‘zlashtirish — har bir yakunlangan darsdagi eng
          yaxshi natijalaringiz o‘rtachasi.
        </p>
      </>
    );
  }
  if (mode === 'badges')
    return (
      <>
        <PageHeader
          eyebrow="HARAKATINGIZ — YUTUG‘INGIZ"
          title="Mening nishonlarim"
          description="Bilim yo‘lidagi kichik va katta g‘alabalaringiz."
        />
        <div className="badge-grid">
          {badges.data?.map((b) => (
            <Card key={b.id} className={`badge-card ${b.unlockedAt ? 'unlocked' : 'locked'}`}>
              <div className="badge-art">
                {b.unlockedAt ? <Award size={53} /> : <LockKeyhole size={45} />}
              </div>
              <span className={`pill ${b.unlockedAt ? 'status-completed' : ''}`}>
                {b.unlockedAt ? 'QO‘LGA KIRITILDI' : 'OLDINDA YANGI MAQSAD'}
              </span>
              <h3>{b.title}</h3>
              <p>{b.description}</p>
              <small>
                {b.unlockedAt
                  ? dateLabel(b.unlockedAt)
                  : `${b.threshold} ${b.criterion === 'STREAK' ? 'kun' : 'ta natija'}`}
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
          eyebrow="BIRGA O‘RGANAMIZ, BIRGA O‘SAMIZ"
          title="Bilimdonlar reytingi"
          description="Reyting serverda hisoblangan XPga asoslanadi. Har bir yangi bilim muhim."
        />
        <div className="segmented">
          <Button
            variant={scope === 'weekly' ? 'primary' : 'ghost'}
            onClick={() => setScope('weekly')}
          >
            <Trophy size={17} />
            Haftalik
          </Button>
          <Button
            variant={scope === 'class' ? 'primary' : 'ghost'}
            onClick={() => setScope('class')}
          >
            Mening sinfim
          </Button>
        </div>
        <Card className="full-leaderboard">
          <div className="leaderboard-heading">
            <span>O‘quvchi</span>
            <span>To‘plangan XP</span>
          </div>
          <LeaderboardPreview rows={ranking.data || []} />
        </Card>
        <p className="formula-note">
          Haftalik reyting dushanbadan boshlanadi (Toshkent vaqti). Avvalgi XP tarixi saqlanadi.
        </p>
      </>
    );
  return (
    <>
      <PageHeader
        eyebrow="O‘QITUVCHINGIZDAN SIZ UCHUN"
        title="Mening topshiriqlarim"
        description="Darslarni yakunlang, bilimni mustahkamlang va natijangizni ko‘ring."
      />
      {assignments.data?.length ? (
        <div className="assignment-grid">
          {assignments.data.map((a) => (
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
                {dateLabel(a.deadline)} gacha · {a.class.name}
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
          ))}
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
      )}
    </>
  );
}
