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
          {d.completedLessons} ta dars yakunlangan, {d.masteredLessons ?? 0} tasi belgilangan
          o‘zlashtirish maqsadiga yetgan.
        </p>
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
          <Button
            variant={scope === 'friends' ? 'primary' : 'ghost'}
            onClick={() => setScope('friends')}
          >
            Do‘stlar
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
          {scope === 'class'
            ? 'Sinf reytingi shu sinfning faol o‘quvchilari barcha davrda to‘plagan XP asosida hisoblanadi.'
            : 'Haftalik reyting dushanbadan boshlanadi (Toshkent vaqti). Avvalgi XP tarixi saqlanadi.'}
        </p>
        {scope === 'friends' && (
          <p className="formula-note">
            Reytingga siz va faqat qabul qilingan faol do‘stlaringiz kiradi.{' '}
            <Link to="/friends">Do‘stlarimni boshqarish</Link>
          </p>
        )}
      </>
    );
  return (
    <>
      <PageHeader
        eyebrow="O‘QITUVCHINGIZDAN SIZ UCHUN"
        title="Mening topshiriqlarim"
        description="Darslarni yakunlang, bilimni mustahkamlang va natijangizni ko‘ring."
      />
      <StudentAssignments assignments={assignments.data || []} />
    </>
  );
}
