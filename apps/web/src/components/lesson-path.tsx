import { Link } from 'react-router-dom';
import { ArrowRight, Check, Flame, LockKeyhole, Play, Sparkles, Star, Zap } from 'lucide-react';
import type { Dashboard, Subject } from '../lib/types';
import { Card, ProgressBar } from './ui';

export function LessonPath({ subject, dashboard }: { subject: Subject; dashboard?: Dashboard }) {
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
            <span className="eyebrow">SIZNING O‘QUV YO‘LINGIZ</span>
            <strong>
              {completed} / {all.length} dars
            </strong>
          </div>
          <ProgressBar value={all.length ? (completed / all.length) * 100 : 0} tone="mint" />
          <p className="subtle">
            {completed} ta yakunlangan · {mastered} ta o‘zlashtirilgan
          </p>
        </div>
        {subject.courses.map((course) => (
          <section key={course.id} className="path-course">
            <div className="section-title">
              <h2>{course.title}</h2>
              <span className="pill">{course.grade}-sinf</span>
            </div>
            {course.topics.map((topic, ti) => (
              <section className="path-topic" key={topic.id}>
                <header>
                  <span>{String(ti + 1).padStart(2, '0')}</span>
                  <div>
                    <small>MAVZU</small>
                    <h3>{topic.title}</h3>
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
                          <h4>{lesson.title}</h4>
                          <small>
                            {state === 'LOCKED'
                              ? `Oldingi darsdan ${lesson.unlockScore ?? 70}% oling`
                              : state === 'COMPLETED'
                                ? `Yakunlangan · ${lesson.bestScore ?? 0}% · ${lesson.mastered ? 'O‘zlashtirildi' : 'Mustahkamlash kerak'}`
                                : state === 'IN_PROGRESS'
                                  ? 'Davom ettirish'
                                  : `${lesson.duration} daqiqa · ${active ? 'Boshlash' : 'Mashq qilish'}`}
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
                {!topic.lessons.length && <p className="subtle">Darslar tayyorlanmoqda.</p>}
              </section>
            ))}
          </section>
        ))}
      </div>
      <aside className="journey-sidebar" aria-label="O‘quv ko‘rsatkichlari">
        <Card className="journey-motivation">
          <span className="eyebrow">HAR KUNI BIR QADAM</span>
          <h2>
            Kichik qadamlar.
            <br />
            Katta natijalar.
          </h2>
          <p>Bugungi darsingizni yakunlang va bilim yo‘lingizda davom eting.</p>
          <div className="journey-stats">
            <div>
              <Flame size={24} />
              <strong>{dashboard?.streak ?? 0}</strong>
              <span>kunlik streak</span>
            </div>
            <div>
              <Zap size={24} />
              <strong>{dashboard?.totalXp ?? 0}</strong>
              <span>jami XP</span>
            </div>
          </div>
        </Card>
        <Card>
          <span className="journey-challenge-icon">
            <Sparkles size={25} />
          </span>
          <h3>Kunlik challenge</h3>
          <p>Uch fandan 5 ta savol bilan bilimingizni sinang.</p>
          <Link to="/challenge" className="btn btn-primary">
            {dashboard?.dailyCompleted ? 'Natijani ko‘rish' : 'Challengeni boshlash'}
            <ArrowRight size={17} />
          </Link>
        </Card>
        <p className="journey-note">
          Har bir xato — o‘rganish imkoniyati. Yakunlangan darslarni yana mashq qilishingiz mumkin.
        </p>
      </aside>
    </div>
  );
}
