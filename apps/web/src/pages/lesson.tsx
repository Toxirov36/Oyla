import { ExercisePlayer } from '../components/exercises/exercise-player';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  Flame,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { api, errorText } from '../lib/api';
import type { Attempt, Daily, Lesson, Result } from '../lib/types';
import { Button, Card, EmptyState, ErrorState, Loading, PageHeader } from '../components/ui';

export function ResultSummary({
  result,
  daily,
  retry,
}: {
  result: Result;
  daily?: boolean;
  retry?: () => void;
}) {
  return (
    <div className="result-page">
      <span className="result-medal">
        <Trophy size={54} />
      </span>
      <span className="eyebrow">YANA BIR QADAM OLDINGA</span>
      <h1>{result.score >= 80 ? 'Ajoyib natija!' : 'Har bir mashq — yangi bilim.'}</h1>
      <p>
        {daily ? 'Bugungi challengeni yakunladingiz.' : 'Dars yakunlandi. O‘rganishda davom eting!'}
      </p>
      <div className="result-score">
        <strong>
          {result.score}
          <span>%</span>
        </strong>
        <p>
          {result.correct} / {result.total} to‘g‘ri javob
        </p>
      </div>
      {!daily && (
        <p className={`pill ${(result.mastered ?? result.score >= 70) ? '' : 'warm'}`}>
          {(result.mastered ?? result.score >= 70)
            ? 'Dars yakunlandi · O‘zlashtirildi'
            : `Dars yakunlandi · Mustahkamlash kerak (${result.masteryThreshold ?? 70}% maqsad)`}
        </p>
      )}
      <div className="result-stats">
        <div>
          <Zap size={24} />
          <strong>+{result.earnedXp} XP</strong>
          <span>Qo‘lga kiritildi</span>
        </div>
        <div>
          <Target size={24} />
          <strong>
            {daily
              ? `Daraja ${result.level}`
              : `${result.masteryBefore}% → ${result.masteryAfter}%`}
          </strong>
          <span>{daily ? 'Bilim darajangiz' : 'Mavzuni o‘zlashtirish'}</span>
        </div>
        <div>
          <Flame size={24} />
          <strong>{result.streak} kun</strong>
          <span>O‘rganish streaki</span>
        </div>
      </div>
      {result.earnedXp === 0 && (
        <p className="subtle">
          Bu dars uchun XP avval olingan. Yangi natija o‘zlashtirish ko‘rsatkichingizni yaxshilashi
          mumkin.
        </p>
      )}
      {result.badges.length > 0 && (
        <Card className="unlocked-badges">
          <h3>
            <Sparkles size={19} />
            Yangi nishonlar ochildi!
          </h3>
          {result.badges.map((b) => (
            <div key={b.id}>
              <Award size={26} />
              <strong>{b.title}</strong>
              <span>{b.description}</span>
            </div>
          ))}
        </Card>
      )}
      <div className="result-actions">
        {result.nextLesson ? (
          <Link className="btn btn-primary" to={`/lessons/${result.nextLesson.id}`}>
            Keyingi dars
            <ArrowRight size={18} />
          </Link>
        ) : (
          <Link to="/subjects" className="btn btn-primary">
            Fanlarga qaytish
            <ArrowRight size={18} />
          </Link>
        )}
        {retry && (
          <Button variant="secondary" onClick={retry}>
            <RotateCcw size={17} />
            Qayta mashq qilish
          </Button>
        )}
        <Link to="/dashboard" className="btn btn-ghost">
          Bosh sahifa
        </Link>
      </div>
    </div>
  );
}
export default function LessonPage({ daily = false }: { daily?: boolean }) {
  const { id } = useParams();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => api<Lesson>(`/lessons/${id}`),
    enabled: !daily && !!id,
  });
  const challenge = useQuery({
    queryKey: ['daily'],
    queryFn: () => api<Daily>('/daily-challenge'),
    enabled: daily,
  });
  const [mode, setMode] = useState<'STANDARD' | 'MINI_GAME' | 'BOSS_BATTLE'>('STANDARD');
  const [step, setStep] = useState(0);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setStep(0);
    setAttempt(null);
    setResult(null);
    setError('');
  }, [id, daily]);
  useEffect(() => {
    const attemptId = daily ? challenge.data?.attemptId : query.data?.attemptId;
    if (!attemptId) return;
    let cancelled = false;
    void api<Attempt>(`/attempts/${attemptId}`)
      .then((a) => {
        if (!cancelled) {
          setAttempt(a);
          setStep(2);
          if (a.result) setResult(a.result);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e));
      });
    return () => {
      cancelled = true;
    };
  }, [daily, challenge.data?.attemptId, query.data?.attemptId]);
  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const a = await api<Attempt>('/attempts', {
        method: 'POST',
        body: daily ? { mode } : { lessonId: id, mode },
      });
      if (a.result) setResult(a.result);
      else {
        setAttempt(a);
        setStep(2);
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const complete = (r: Result) => {
    setResult(r);
    void cache.invalidateQueries();
  };
  if (result)
    return (
      <ResultSummary
        result={result}
        daily={daily}
        retry={
          daily
            ? undefined
            : () => {
                setResult(null);
                setAttempt(null);
                void start();
              }
        }
      />
    );
  if (daily) {
    if (challenge.isPending) return <Loading />;
    if (challenge.error)
      return <ErrorState error={challenge.error} retry={() => void challenge.refetch()} />;
    if (attempt)
      return (
        <>
          <PageHeader
            eyebrow="KUNLIK CHALLENGE"
            title="Bugungi bilim sinovi"
            description="Har bir savol — o‘zingizni sinash imkoniyati."
          />
          <ExercisePlayer attempt={attempt} setAttempt={setAttempt} onComplete={complete} />
        </>
      );
    if (challenge.data.result) return <ResultSummary result={challenge.data.result} daily />;
    return (
      <>
        <PageHeader
          eyebrow="HAR KUNI BIR QADAM"
          title="Kunlik challenge"
          description="Bugun yangi bilimlar bilan o‘zingizni sinang."
        />
        <Card className="daily-intro">
          <span className="daily-icon">
            <Zap size={55} />
          </span>
          <span className="eyebrow">BUGUNGI CHALLENGE</span>
          <h2>5 ta savol. Bitta yangi imkoniyat.</h2>
          <p>
            Matematika, ingliz tili va informatika bo‘yicha aralash savollar. Shoshilmang, o‘ylang
            va javob bering.
          </p>
          <div className="daily-facts">
            <span>
              <BookOpen size={20} />5 ta savol
            </span>
            <span>
              <Clock3 size={20} />
              Taxminan 5 daqiqa
            </span>
            <span>
              <Sparkles size={20} />+{challenge.data.reward} XP bonus
            </span>
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <Button onClick={() => void start()} busy={busy}>
            {challenge.data.attemptId ? 'Davom ettirish' : 'Challengeni boshlash'}
            <ArrowRight size={19} />
          </Button>
          <small>Mukofot kuniga bir marta beriladi.</small>
        </Card>
      </>
    );
  }
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const lesson = query.data;
  if (!lesson) return <EmptyState title="Dars topilmadi" />;
  return (
    <>
      <Link to={`/subjects/${lesson.topic.course.subject.id}`} className="back-link">
        <ArrowLeft size={17} />
        {lesson.topic.course.subject.title} / {lesson.topic.title}
      </Link>
      <PageHeader
        eyebrow={`${lesson.topic.course.grade}-SINF · ${lesson.duration} DAQIQA`}
        title={lesson.title}
        description="Tushuning. Mashq qiling. Bilimingizni mustahkamlang."
      />
      <div className="lesson-steps">
        {[
          { label: 'Tushuntirish', icon: BookOpen },
          { label: 'Misol', icon: Lightbulb },
          { label: 'Mashq va challenge', icon: Target },
        ].map(({ label, icon: Icon }, i) => (
          <button
            key={label}
            className={step === i ? 'active' : step > i ? 'completed' : ''}
            disabled={i === 2 && !attempt}
            onClick={() => setStep(i)}
          >
            <span>{step > i ? <CheckCircle2 size={18} /> : <Icon size={18} />}</span>
            {label}
          </button>
        ))}
      </div>
      {step === 2 && attempt ? (
        <ExercisePlayer attempt={attempt} setAttempt={setAttempt} onComplete={complete} />
      ) : (
        <Card className="lesson-reading">
          <span className="eyebrow">{step === 0 ? 'KELING, TUSHUNAMIZ' : 'AMALDA KO‘RAMIZ'}</span>
          <h2>{step === 0 ? 'Asosiy tushuncha' : 'Birgalikda yechamiz'}</h2>
          <div className={`lesson-prose ${step === 1 ? 'example-prose' : ''}`}>
            {(step === 0 ? lesson.explanation : lesson.example).split('\n\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          {step === 1 && (
            <fieldset className="practice-modes">
              <legend>Mashq usuli</legend>
              {(
                [
                  ['STANDARD', 'Oddiy mashq'],
                  ['MINI_GAME', 'Bilim parvozi'],
                  ['BOSS_BATTLE', 'Mavzu sinovi'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className={mode === value ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="practice-mode"
                    value={value}
                    checked={mode === value}
                    onChange={() => setMode(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          )}
          <div className="reading-actions">
            {step === 1 && (
              <Button variant="ghost" onClick={() => setStep(0)}>
                <ArrowLeft size={17} />
                Tushuntirishga qaytish
              </Button>
            )}
            <Button busy={busy} onClick={step === 0 ? () => setStep(1) : () => void start()}>
              {step === 0 ? 'Misolni ko‘rish' : 'Mashqni boshlash'}
              <ArrowRight size={18} />
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
