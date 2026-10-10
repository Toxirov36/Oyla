import { localizeText } from '../i18n';
import { translate as tx } from '../i18n';
import { useI18n } from '../i18n';
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
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { api, errorText } from '../lib/api';
import type { Attempt, Daily, Lesson, Result } from '../lib/types';
import { Button, Card, EmptyState, ErrorState, Loading, PageHeader } from '../components/ui';
import { ContentLanguageNotice } from '../components/content-language-notice';
import { YouTubeVideo } from '../components/video-media';

export function ResultSummary({
  result,
  daily,
  retry,
}: {
  result: Result;
  daily?: boolean;
  retry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="result-page">
      <span className="result-medal">
        <Trophy size={54} />
      </span>
      <span className="eyebrow">{t('lesson.resultEyebrow')}</span>
      <h1>{result.score >= 80 ? t('lesson.greatResult') : t('lesson.practiceResult')}</h1>
      <p>{daily ? t('lesson.dailyDone') : t('lesson.done')}</p>
      <div className="result-score">
        <strong>
          {result.score}
          <span>%</span>
        </strong>
        <p>{t('lesson.correctCount', { correct: result.correct, total: result.total })}</p>
      </div>
      {!daily && (
        <p className={`pill ${(result.mastered ?? result.score >= 70) ? '' : 'warm'}`}>
          {(result.mastered ?? result.score >= 70)
            ? t('lesson.mastered')
            : t('lesson.needsPractice', { score: result.masteryThreshold ?? 70 })}
        </p>
      )}
      <div className="result-stats">
        <div>
          <Zap size={24} />
          <strong>{tx('pages.admin.gamification.xp', { value1: result.earnedXp })}</strong>
          <span>{t('lesson.earned')}</span>
        </div>
        <div>
          <Target size={24} />
          <strong>
            {daily
              ? t('lesson.level', { level: result.level })
              : `${result.masteryBefore}% → ${result.masteryAfter}%`}
          </strong>
          <span>{daily ? t('profile.level') : t('lesson.mastery')}</span>
        </div>
        <div>
          <Flame size={24} />
          <strong>{t('common.days', { count: result.streak })}</strong>
          <span>{t('lesson.streak')}</span>
        </div>
      </div>
      {result.earnedXp === 0 && <p className="subtle">{t('lesson.noXp')}</p>}
      {result.badges.length > 0 && (
        <Card className="unlocked-badges">
          <h3>
            <Sparkles size={19} />
            {t('lesson.newBadges')}
          </h3>
          {result.badges.map((b) => (
            <div key={b.id}>
              <Award size={26} />
              <strong>{localizeText(b.title)}</strong>
              <span>{localizeText(b.description)}</span>
            </div>
          ))}
        </Card>
      )}
      <div className="result-actions">
        {result.nextLesson ? (
          <Link className="btn btn-primary" to={`/lessons/${result.nextLesson.id}`}>
            {t('lesson.next')}
            <ArrowRight size={18} />
          </Link>
        ) : (
          <Link to="/subjects" className="btn btn-primary">
            {t('subjects.back')}
            <ArrowRight size={18} />
          </Link>
        )}
        {retry && (
          <Button variant="secondary" onClick={retry}>
            <RotateCcw size={17} />
            {t('lesson.retry')}
          </Button>
        )}
        <Link to="/dashboard" className="btn btn-ghost">
          {t('navigation.home')}
        </Link>
      </div>
    </div>
  );
}
export default function LessonPage({ daily = false }: { daily?: boolean }) {
  const { t } = useI18n();
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
          setStep(daily ? 2 : query.data?.youtubeId ? 1 : 2);
          if (a.result) setResult(a.result);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e));
      });
    return () => {
      cancelled = true;
    };
  }, [daily, challenge.data?.attemptId, query.data?.attemptId, query.data?.youtubeId]);
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
        setStep(daily ? 2 : query.data?.youtubeId ? 1 : 2);
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
            eyebrow={t('lesson.dailyEyebrow')}
            title={t('lesson.dailyTitle')}
            description={t('lesson.dailyDescription')}
          />
          <ContentLanguageNotice />
          <ExercisePlayer attempt={attempt} setAttempt={setAttempt} onComplete={complete} />
        </>
      );
    if (challenge.data.result) return <ResultSummary result={challenge.data.result} daily />;
    return (
      <>
        <PageHeader
          eyebrow={t('path.daily')}
          title={t('navigation.challenge')}
          description={t('lesson.dailyIntro')}
        />
        <ContentLanguageNotice />
        <Card className="daily-intro">
          <span className="daily-icon">
            <Zap size={55} />
          </span>
          <span className="eyebrow">{t('lesson.todayChallenge')}</span>
          <h2>{t('lesson.fiveQuestions')}</h2>
          <p>{t('lesson.mixedQuestions')}</p>
          <div className="daily-facts">
            <span>
              <BookOpen size={20} />
              {t('lesson.questions')}
            </span>
            <span>
              <Clock3 size={20} />
              {t('lesson.duration')}
            </span>
            <span>
              <Sparkles size={20} />
              {t('dashboard.xpBonus', { count: challenge.data.reward })}
            </span>
          </div>
          {error && (
            <div className="form-error" role="alert">
              {localizeText(error)}
            </div>
          )}
          <Button onClick={() => void start()} busy={busy}>
            {challenge.data.attemptId ? t('path.resume') : t('dashboard.startChallenge')}
            <ArrowRight size={19} />
          </Button>
          <small>{t('lesson.rewardNote')}</small>
        </Card>
      </>
    );
  }
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const lesson = query.data;
  if (!lesson) return <EmptyState title={t('lesson.notFound')} />;
  const videoLesson = Boolean(lesson.youtubeId);
  const practiceStep = videoLesson ? 1 : 2;
  const steps = videoLesson
    ? [
        { label: t('lesson.video'), icon: Play },
        { label: t('lesson.practice'), icon: Target },
      ]
    : [
        { label: t('lesson.explanation'), icon: BookOpen },
        { label: t('lesson.example'), icon: Lightbulb },
        { label: t('lesson.practice'), icon: Target },
      ];
  return (
    <>
      <Link to={`/subjects/${lesson.topic.course.subject.id}`} className="back-link">
        <ArrowLeft size={17} />
        {localizeText(lesson.topic.course.subject.title)} / {localizeText(lesson.topic.title)}
      </Link>
      <PageHeader
        eyebrow={videoLesson
          ? t('lesson.videoMeta', { grade: lesson.topic.course.grade })
          : t('lesson.meta', { grade: lesson.topic.course.grade, duration: lesson.duration })}
        title={localizeText(lesson.title)}
        description={t(videoLesson ? 'lesson.videoDescription' : 'lesson.description')}
      />
      <ContentLanguageNotice />
      <div className="lesson-steps">
        {steps.map(({ label, icon: Icon }, i) => (
          <button
            key={label}
            className={step === i ? 'active' : step > i ? 'completed' : ''}
            disabled={i === practiceStep && !attempt}
            onClick={() => setStep(i)}
          >
            <span>{step > i ? <CheckCircle2 size={18} /> : <Icon size={18} />}</span>
            {label}
          </button>
        ))}
      </div>
      {step === practiceStep && attempt ? (
        <ExercisePlayer attempt={attempt} setAttempt={setAttempt} onComplete={complete} />
      ) : (
        <Card className="lesson-reading">
          {videoLesson ? (
            <YouTubeVideo youtubeId={lesson.youtubeId!} title={localizeText(lesson.title)} />
          ) : (
            <>
              <span className="eyebrow">{step === 0 ? t('lesson.understand') : t('lesson.try')}</span>
              <h2>{step === 0 ? t('lesson.concept') : t('lesson.solve')}</h2>
              <div className={`lesson-prose ${step === 1 ? 'example-prose' : ''}`}>
                {(step === 0 ? lesson.explanation : lesson.example).split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </>
          )}
          {error && (
            <div className="form-error" role="alert">
              {localizeText(error)}
            </div>
          )}
          {(videoLesson || step === 1) && (
            <fieldset className="practice-modes">
              <legend>{t('lesson.mode')}</legend>
              {(
                [
                  ['STANDARD', t('lesson.standard')],
                  ['MINI_GAME', t('lesson.miniGame')],
                  ['BOSS_BATTLE', t('lesson.bossBattle')],
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
                {t('lesson.backExplanation')}
              </Button>
            )}
            <Button
              busy={busy}
              onClick={videoLesson
                ? attempt ? () => setStep(practiceStep) : () => void start()
                : step === 0 ? () => setStep(1) : () => void start()}
            >
              {videoLesson
                ? t(attempt ? 'path.resume' : 'lesson.startPractice')
                : step === 0 ? t('lesson.viewExample') : t('lesson.startPractice')}
              <ArrowRight size={18} />
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
