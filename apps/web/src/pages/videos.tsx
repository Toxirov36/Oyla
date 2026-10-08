import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Play, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { subjectNames, type VideoLesson } from '../lib/play';
import { Card, EmptyState, ErrorState, Loading, PageHeader, Button } from '../components/ui';
import { VideoMedia } from '../components/video-media';
export default function VideosPage() {
  const { id } = useParams();
  const [subject, setSubject] = useState('all');
  const list = useQuery({
    queryKey: ['video-lessons'],
    queryFn: () => api<VideoLesson[]>('/video-lessons'),
    enabled: !id,
  });
  const detail = useQuery({
    queryKey: ['video-lessons', id],
    queryFn: () => api<VideoLesson>(`/video-lessons/${id}`),
    enabled: !!id,
  });
  if (id) {
    if (detail.isPending) return <Loading />;
    if (detail.error)
      return <ErrorState error={detail.error} retry={() => void detail.refetch()} />;
    return (
      <div className="play-space">
        <Link className="back-link" to="/videos">
          ← Videodarslarga qaytish
        </Link>
        <PageHeader
          title={detail.data.title}
          eyebrow={`${detail.data.grade}-SINF · ${subjectNames[detail.data.subject]}`}
          description={detail.data.description}
        />
        <Card>
          <VideoMedia key={id} video={detail.data} />
        </Card>
        <Link className="btn btn-secondary" to="/subjects">
          Mashqlar uchun fan tanlash →
        </Link>
      </div>
    );
  }
  if (list.isPending) return <Loading />;
  if (list.error) return <ErrorState error={list.error} retry={() => void list.refetch()} />;
  const rows = list.data.filter((video) => subject === 'all' || video.subject === subject);
  return (
    <div className="play-space">
      <PageHeader
        title="Videodarslar"
        description="Qisqa animatsiyalar bilan tushuning, keyin mashqlarda sinab ko‘ring."
      />
      <div className="play-tabs">
        {[['all', 'Barchasi'], ...Object.entries(subjectNames)].map(([value, label]) => (
          <Button
            key={value}
            variant={subject === value ? 'primary' : 'secondary'}
            onClick={() => setSubject(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="video-grid">
        {rows.map((video) => (
          <Link
            className={`video-card subject-${video.subject}`}
            to={`/videos/${video.id}`}
            key={video.id}
          >
            <div className="video-card-art">
              {video.kind === 'ANIMATION' ? <Sparkles size={40} /> : <Play size={40} />}
              <span>{video.kind === 'ANIMATION' ? 'Animatsiya' : 'YouTube'}</span>
            </div>
            <div className="video-card-copy">
              <small>
                {video.grade}-sinf · {subjectNames[video.subject]}
              </small>
              <h2>{video.title}</h2>
              <p>{video.description}</p>
              <strong>Ko‘rish →</strong>
            </div>
          </Link>
        ))}
      </div>
      {!rows.length && <EmptyState title="Bu fanda videodarslar tayyorlanmoqda" />}
    </div>
  );
}
