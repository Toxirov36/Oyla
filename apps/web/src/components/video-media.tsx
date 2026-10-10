import { localizeText } from '../i18n';
import { translate as tx, useI18n as usePageLocale } from '../i18n';
import { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import type { VideoLesson } from '../lib/play';
import { Button, ProgressBar } from './ui';
import { AnimationScene } from './animation-scene';

export function YouTubeVideo({ youtubeId, title }: { youtubeId: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="youtube-lesson">
      {open ? (
        <iframe
          title={title}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="video-poster">
          <Play size={54} />
          <h2>{title}</h2>
          <Button onClick={() => setOpen(true)}>{tx('pages.video-media.openVideo')}</Button>
        </div>
      )}
      <a
        className="text-link"
        href={`https://www.youtube.com/watch?v=${youtubeId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {tx('pages.video-media.openOnYoutube')}
      </a>
    </div>
  );
}

export function VideoMedia({ video }: { video: VideoLesson }) {
  usePageLocale();
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const chapters = video.animation?.chapters ?? [];
  const duration = chapters.length * 12000;
  const index = Math.min(chapters.length - 1, Math.floor(elapsed / 12000));
  const chapter = chapters[index];
  useEffect(() => {
    if (!playing || video.kind !== 'ANIMATION') return;
    const start = performance.now() - elapsed;
    const timer = setInterval(() => {
      const next = Math.min(duration, performance.now() - start);
      setElapsed(next);
      if (next >= duration) setPlaying(false);
    }, 100);
    return () => clearInterval(timer);
  }, [playing, video.id, duration]);
  useEffect(
    () => () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [index],
  );
  if (video.kind === 'YOUTUBE')
    return <YouTubeVideo youtubeId={video.youtubeId!} title={localizeText(video.title)} />;
  if (!chapter) return <p>{tx('pages.video-media.theLessonIsBeingPrepared')}</p>;
  return (
    <div className={`animated-video ${playing ? 'is-playing' : 'is-paused'}`}>
      <AnimationScene key={index} visual={chapter.visual} />
      <div className="video-chapter">
        <span className="eyebrow">
          {tx('pages.video-media.part', { value1: index + 1, value2: chapters.length })}
        </span>
        <h2>{chapter.title}</h2>
        <p aria-live="polite">{chapter.text}</p>
      </div>
      <ProgressBar value={duration ? (elapsed / duration) * 100 : 0} />
      <div className="video-controls">
        <Button
          onClick={() => {
            if (elapsed >= duration) setElapsed(0);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}{' '}
          {playing ? tx('pages.video-media.pause') : tx('pages.video-media.startWatching')}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setElapsed(0);
            setPlaying(false);
          }}
          aria-label={tx('pages.video-media.watchFromTheStart')}
        >
          <RotateCcw size={18} />
        </Button>
        {'speechSynthesis' in window && (
          <Button
            variant="ghost"
            onClick={() => {
              window.speechSynthesis.cancel();
              const speech = new SpeechSynthesisUtterance(chapter.text);
              speech.lang = 'uz-UZ';
              speech.rate = 0.85;
              window.speechSynthesis.speak(speech);
            }}
          >
            <Volume2 size={18} />
            {tx('pages.video-media.listenToTheText')}
          </Button>
        )}
        <span>
          {tx('pages.video-media.s', {
            value1: Math.floor(elapsed / 1000),
            value2: duration / 1000,
          })}
        </span>
      </div>
      <div className="video-chapters">
        {chapters.map((part, i) => (
          <Button
            key={i}
            variant={index === i ? 'primary' : 'secondary'}
            onClick={() => {
              setElapsed(i * 12000);
              setPlaying(false);
            }}
          >
            {i + 1}. {part.title}
          </Button>
        ))}
      </div>
      {elapsed >= duration && (
        <p role="status" className="video-complete">
          {tx('pages.video-media.greatNowTryTheExercises')}
        </p>
      )}
    </div>
  );
}
