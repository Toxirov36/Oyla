import { localizeText } from '../../i18n';
import { useI18n } from '../../i18n';
import { useEffect, useRef, useState } from 'react';
import { Mic, Play, Square } from 'lucide-react';
import type { ExerciseConfig } from '../../lib/exercises';
import { Button } from '../ui';

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    ((e: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function AudioPrompt({ config }: { config: ExerciseConfig }) {
  const { t } = useI18n();
  const [error, setError] = useState('');
  useEffect(
    () => () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );
  if (config.audioUrl)
    return (
      <div>
        <audio
          controls
          preload="none"
          src={config.audioUrl}
          aria-label={t('speech.audio')}
          onError={() => setError(t('speech.audioError'))}
        />
        {error && <p role="alert">{localizeText(error)}</p>}
      </div>
    );
  return (
    <div className="audio-prompt">
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          if (!('speechSynthesis' in window)) {
            setError(t('speech.noSynthesis'));
            return;
          }
          window.speechSynthesis.cancel();
          const speech = new SpeechSynthesisUtterance(config.audioText ?? '');
          speech.lang = config.language ?? 'en-US';
          speech.rate = 0.85;
          speech.onerror = () => setError(t('speech.playError'));
          window.speechSynthesis.speak(speech);
        }}
      >
        <Play size={18} />
        {t('speech.listen')}
      </Button>
      {error && <p role="alert">{localizeText(error)}</p>}
    </div>
  );
}
export function SpeechExercise({
  config,
  value,
  onChange,
  disabled,
}: {
  config: ExerciseConfig;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [audio, setAudio] = useState('');
  const recognition = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const url = useRef('');
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recordingTimer.current) clearTimeout(recordingTimer.current);
      recognition.current?.abort();
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, []);
  const stop = () => {
    if (recordingTimer.current) clearTimeout(recordingTimer.current);
    const speech = recognition.current;
    recognition.current = null;
    speech?.stop();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };
  const start = async () => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error(t('speech.requirements'));
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const r = new MediaRecorder(media);
      recorder.current = r;
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = () => {
        if (!mounted.current) return;
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(new Blob(chunks, { type: r.mimeType }));
        setAudio(url.current);
      };
      r.start();
      setRecording(true);
      recordingTimer.current = setTimeout(stop, 60000);
      const Constructor =
        (window as SpeechWindow).SpeechRecognition ??
        (window as SpeechWindow).webkitSpeechRecognition;
      if (Constructor) {
        const speech = new Constructor();
        recognition.current = speech;
        speech.lang = config.language ?? 'en-US';
        speech.continuous = false;
        speech.interimResults = false;
        speech.onresult = (e) => onChange(e.results[0]![0]!.transcript);
        speech.onerror = () => setError(t('speech.recognitionError'));
        speech.onend = () => {
          if (mounted.current) stop();
        };
        speech.start();
      } else setError(t('speech.noRecognition'));
    } catch (e) {
      stop();
      setError(e instanceof Error ? e.message : t('speech.permission'));
    }
  };
  return (
    <div className="speech-exercise">
      <blockquote>{config.audioText}</blockquote>
      <AudioPrompt config={config} />
      <Button
        type="button"
        disabled={disabled}
        variant={recording ? 'secondary' : 'primary'}
        onClick={() => (recording ? stop() : void start())}
      >
        {recording ? <Square size={18} /> : <Mic size={18} />}{' '}
        {recording ? t('speech.stop') : t('speech.speak')}
      </Button>
      {recording && <span role="status">{t('speech.recording')}</span>}
      {audio && <audio controls src={audio} aria-label={t('speech.recorded')} />}
      {error && (
        <p role="status" className="subtle">
          {localizeText(error)}
        </p>
      )}
      <label className="text-answer">
        {t('speech.transcript')}
        <input
          value={value}
          disabled={disabled || recording}
          maxLength={5000}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <p className="subtle">{t('speech.note')}</p>
    </div>
  );
}
