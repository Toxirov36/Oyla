import { LessonPath } from '../components/lesson-path';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import type { Dashboard, Subject } from '../lib/types';
import { EmptyState, ErrorState, Loading, PageHeader, ProgressBar } from '../components/ui';
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
        <LessonPath subject={subject} dashboard={progress.data} />
      </>
    );
  }
  return (
    <div className="subject-selection">
      <PageHeader
        className="subject-selection-header"
        eyebrow="BILIM UCHUN VAQT"
        title="Mening fanlarim"
        description="Fanni tanlang va o‘rganishni boshlang."
      />
      <div className="subject-picker-grid">
        {query.data.map((subject) => {
          const { tone, icon: Icon } = subjectStyle(subject.slug);
          const lessons = subject.courses.flatMap((c) => c.topics.flatMap((t) => t.lessons));
          const p = progress.data?.subjects.find((s) => s.id === subject.id);
          const grade = progress.data?.user.student?.grade ?? subject.courses[0]?.grade;
          return (
            <Link
              key={subject.id}
              to={`/subjects/${subject.id}`}
              className={`subject-tile ${tone}`}
              aria-label={`${subject.title}. Darslarni ko‘rish`}
            >
              <ArrowRight className="subject-tile-arrow" size={16} aria-hidden="true" />
              <span className={`subject-icon ${tone}`} aria-hidden="true">
                <Icon size={32} />
              </span>
              <h2>{subject.title}</h2>
              <span className="subject-tile-meta">
                {grade ? `${grade}-sinf · ` : ''}
                {lessons.length} ta dars
              </span>
              <div className="subject-tile-progress">
                <div className="subject-tile-progress-label">
                  <span>{p?.completed || 0} ta yakunlangan</span>
                  <strong>{p?.progress || 0}%</strong>
                </div>
                <ProgressBar value={p?.progress || 0} tone={tone} />
              </div>
            </Link>
          );
        })}
      </div>
      {!query.data.length && <EmptyState title="Fanlar tayyorlanmoqda" />}
    </div>
  );
}
