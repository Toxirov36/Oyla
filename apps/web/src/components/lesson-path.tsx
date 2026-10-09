import { localizeText } from '../i18n';
import { useI18n } from '../i18n';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Flame, LockKeyhole, Play, Sparkles, Star, Zap } from 'lucide-react';
import type { Dashboard, Subject } from '../lib/types';
import { Card, ProgressBar } from './ui';

export function LessonPath({ subject, dashboard }: { subject: Subject; dashboard?: Dashboard }) {
  const { t } = useI18n();
  const all = subject.courses.flatMap((c) => c.topics.flatMap((t) => t.lessons));
  const completed = all.filter((l) => l.bestScore != null || l.state === 'COMPLETED').length;
  const mastered = all.filter((l) => l.mastered).length;
  const current =
    all.find((l) => l.state === 'IN_PROGRESS') ??
    all.find((l) => l.state !== 'LOCKED' && l.state !== 'COMPLETED');
  return (
    <div className="learning-journey">
      <div className="lesson-path">
        <div className="journey-overview">
          <div>
            <span className="eyebrow">{t('path.eyebrow')}</span>
            <strong>{t('path.lessons', { completed, total: all.length })}</strong>
          </div>
          <ProgressBar value={all.length ? (completed / all.length) * 100 : 0} tone="mint" />
          <p className="subtle">{t('path.summary', { completed, mastered })}</p>
        </div>
        {subject.courses.map((course) => (
          <section key={course.id} className="path-course">
            <div className="section-title">
              <h2>{localizeText(course.title)}</h2>
              <span className="pill">{t('common.grade', { grade: course.grade })}</span>
            </div>
            {course.topics.map((topic, ti) => (
              <section className="path-topic" key={topic.id}>
                <header>
                  <span>{String(ti + 1).padStart(2, '0')}</span>
                  <div>
                    <small>{t('path.topic')}</small>
                    <h3>{localizeText(topic.title)}</h3>
                  </div>
                  <Sparkles size={22} />
                </header>
                <ol>
                  {topic.lessons.map((lesson, i) => {
                    const state = lesson.state ?? 'AVAILABLE';
                    const active = lesson.id === current?.id;
                    const Icon =
                      state === 'LOCKED'
                        ? LockKeyhole
                        : state === 'COMPLETED'
                          ? Check
                          : active
                            ? Play
                            : Star;
                    const body = (
                      <>
                        <span className={`path-node ${active ? 'current' : ''}`}>
                          <Icon size={26} />
                        </span>
                        <span className="path-lesson-copy">
                          <h4>{localizeText(lesson.title)}</h4>
                          <small>
                            {state === 'LOCKED'
                              ? t('path.locked', { score: lesson.unlockScore ?? 70 })
                              : state === 'COMPLETED'
                                ? t('path.completed', {
                                    score: lesson.bestScore ?? 0,
                                    state: t(
                                      lesson.mastered ? 'path.mastered' : 'path.needsPractice',
                                    ),
                                  })
                                : state === 'IN_PROGRESS'
                                  ? t('path.resume')
                                  : t('path.available', {
                                      count: lesson.duration,
                                      action: t(active ? 'path.start' : 'path.practice'),
                                    })}
                          </small>
                        </span>
                        {active && <ArrowRight size={18} />}
                      </>
                    );
                    return (
                      <li
                        key={lesson.id}
                        className={`path-step state-${state.toLowerCase()} ${state === 'COMPLETED' && !lesson.mastered ? 'needs-practice' : ''} offset-${i % 3}`}
                        aria-current={active ? 'step' : undefined}
                      >
                        {state === 'LOCKED' ? (
                          <div className="path-link" aria-disabled="true">
                            {body}
                          </div>
                        ) : (
                          <Link className="path-link" to={`/lessons/${lesson.id}`}>
                            {body}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ol>
                {!topic.lessons.length && <p className="subtle">{t('path.preparing')}</p>}
              </section>
            ))}
          </section>
        ))}
      </div>
      <aside className="journey-sidebar" aria-label={t('path.metrics')}>
        <Card className="journey-motivation">
          <span className="eyebrow">{t('path.daily')}</span>
          <h2>
            {t('path.smallSteps')}
            <br />
            {t('path.bigResults')}
          </h2>
          <p>{t('path.motivation')}</p>
          <div className="journey-stats">
            <div>
              <Flame size={24} />
              <strong>{dashboard?.streak ?? 0}</strong>
              <span>{t('dashboard.streak')}</span>
            </div>
            <div>
              <Zap size={24} />
              <strong>{dashboard?.totalXp ?? 0}</strong>
              <span>{t('path.totalXp')}</span>
            </div>
          </div>
        </Card>
        <Card>
          <span className="journey-challenge-icon">
            <Sparkles size={25} />
          </span>
          <h3>{t('navigation.challenge')}</h3>
          <p>{t('path.challengeHelp')}</p>
          <Link to="/challenge" className="btn btn-primary">
            {dashboard?.dailyCompleted ? t('dashboard.viewResult') : t('dashboard.startChallenge')}
            <ArrowRight size={17} />
          </Link>
        </Card>
        <p className="journey-note">{t('path.note')}</p>
      </aside>
    </div>
  );
}
