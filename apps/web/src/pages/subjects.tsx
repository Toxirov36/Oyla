import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3 } from 'lucide-react';
import { api } from '../lib/api';
import type { Dashboard, Subject } from '../lib/types';
import { Card, EmptyState, ErrorState, Loading, PageHeader, ProgressBar } from '../components/ui';
import { subjectStyle } from './dashboard';
export default function SubjectsPage() {
  const { id } = useParams();
  const query = useQuery({ queryKey: ['subjects'], queryFn: () => api<Subject[]>('/subjects') });
  const progress = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<Dashboard>('/students/me'),
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  if (id) {
    const subject = query.data.find((s) => s.id === id);
    if (!subject)
      return (
        <EmptyState
          title="Fan topilmadi"
          action={
            <Link to="/subjects" className="btn btn-primary">
              Fanlarga qaytish
            </Link>
          }
        />
      );
    const { tone, icon: Icon } = subjectStyle(subject.slug);
    return (
      <>
        <Link to="/subjects" className="back-link">
          <ArrowLeft size={17} />
          Mening fanlarim
        </Link>
        <PageHeader
          eyebrow="BILIM SAYOHATI"
          title={subject.title}
          description={subject.description}
          action={
            <span className={`subject-icon large ${tone}`}>
              <Icon size={34} />
            </span>
          }
        />
        {subject.courses.length ? (
          subject.courses.map((course) => (
            <section key={course.id} className="course-section">
              <div className="section-title">
                <h2>{course.title}</h2>
                <span className="pill">{course.topics.length} ta mavzu</span>
              </div>
              {course.topics.map((topic, ti) => (
                <Card className="topic-card" key={topic.id}>
                  <header>
                    <span className={`topic-number ${tone}`}>
                      {String(ti + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <span className="eyebrow">MAVZU</span>
                      <h3>{topic.title}</h3>
                    </div>
                  </header>
                  <div className="lesson-list">
                    {topic.lessons.length ? (
                      topic.lessons.map((lesson) => {
                        const mastered = progress.data?.completedLessonIds.includes(lesson.id);
                        return (
                          <Link to={`/lessons/${lesson.id}`} className="lesson-row" key={lesson.id}>
                            <span className={`lesson-row-icon ${mastered ? 'mint' : tone}`}>
                              {mastered ? <CheckCircle2 size={22} /> : <BookOpen size={22} />}
                            </span>
                            <div>
                              <h4>{lesson.title}</h4>
                              <span>
                                <Clock3 size={13} />
                                {lesson.duration} daqiqa · Tushuntirish, mashq va challenge
                              </span>
                            </div>
                            <ArrowRight size={19} />
                          </Link>
                        );
                      })
                    ) : (
                      <EmptyState title="Bu mavzuda hali darslar yo‘q" />
                    )}
                  </div>
                </Card>
              ))}
            </section>
          ))
        ) : (
          <EmptyState
            title="Kurslar tayyorlanmoqda"
            description="Yangi darslar chop etilganda shu yerda ko‘rinadi."
          />
        )}
      </>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="BILIM UCHUN VAQT"
        title="Mening fanlarim"
        description="Qiziqishingizga ergashing. Bugun nimani o‘rganamiz?"
      />
      <div className="subject-browser-grid">
        {query.data.map((subject) => {
          const { tone, icon: Icon } = subjectStyle(subject.slug);
          const lessons = subject.courses.flatMap((c) => c.topics.flatMap((t) => t.lessons));
          const p = progress.data?.subjects.find((s) => s.id === subject.id);
          return (
            <Card key={subject.id} className={`subject-browser ${tone}`}>
              <div className="subject-browser-art">
                <Icon size={58} />
                <span className="art-plus">+</span>
                <span className="art-circle" />
              </div>
              <div className="subject-browser-copy">
                <span className="eyebrow">
                  {progress.data?.user.student?.grade}-SINF · {lessons.length} TA DARS
                </span>
                <h2>{subject.title}</h2>
                <p>{subject.description}</p>
                <div className="progress-label">
                  <span>{p?.completed || 0} ta dars yakunlangan</span>
                  <strong>{p?.progress || 0}%</strong>
                </div>
                <ProgressBar value={p?.progress || 0} tone={tone} />
                <Link to={`/subjects/${subject.id}`} className="btn btn-secondary">
                  Darslarni ko‘rish
                  <ArrowRight size={17} />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
      {!query.data.length && <EmptyState title="Fanlar tayyorlanmoqda" />}
    </>
  );
}
