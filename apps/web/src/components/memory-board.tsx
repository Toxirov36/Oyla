import { useEffect, useRef, useState } from 'react';
import { Brain, Trophy } from 'lucide-react';
import { translate as tx, useI18n } from '../i18n';
import { api, errorText } from '../lib/api';
import { Button, Card, ProgressBar } from './ui';

type MemoryRound = {
  id: string;
  grade: number;
  subject: string;
  stage: number;
  status: 'ACTIVE' | 'COMPLETED';
  cards: { id: string; text: string }[];
  matchedIds: string[];
  pairCount: number;
  moves: number;
  completedAt: string | null;
  correct?: boolean;
};

export function MemoryBoard({ subject }: { subject: string }) {
  const { locale } = useI18n();
  const [round, setRound] = useState<MemoryRound | null>(null);
  const [open, setOpen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reported, setReported] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function begin(stage?: number) {
    setLoading(true);
    setError('');
    setOpen([]);
    setReported(false);
    try {
      const next = await api<MemoryRound>('/memory/rounds', {
        method: 'POST', body: { subject, ...(stage ? { stage } : {}) },
      });
      if (mounted.current) setRound(next);
    } catch (cause) {
      if (mounted.current) setError(errorText(cause));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }
  useEffect(() => { void begin(); }, [subject]);

  async function choose(id: string) {
    if (!round || busy || open.includes(id) || round.matchedIds.includes(id)) return;
    if (!open.length) {
      setOpen([id]);
      return;
    }
    const firstId = open[0]!;
    setOpen([firstId, id]);
    setBusy(true);
    setError('');
    try {
      const updated = await api<MemoryRound>(`/memory/rounds/${round.id}/guesses`, {
        method: 'POST', body: { requestId: crypto.randomUUID(), firstId, secondId: id },
      });
      if (!mounted.current) return;
      setRound(updated);
      timer.current = setTimeout(() => {
        setOpen([]);
        setBusy(false);
      }, updated.correct ? 350 : 900);
    } catch (cause) {
      if (!mounted.current) return;
      setError(errorText(cause));
      setOpen([]);
      setBusy(false);
    }
  }
  async function report() {
    if (!round || reported) return;
    try {
      await api(`/memory/rounds/${round.id}/report`, {
        method: 'POST', body: { reason: 'WRONG_PAIR' },
      });
      setReported(true);
    } catch (cause) {
      setError(errorText(cause));
    }
  }

  if (loading) return <Card className="memory-board"><p role="status">{tx('pages.games.loadingRound')}</p></Card>;
  if (!round) return <Card className="memory-board"><p role="alert">{error}</p><Button onClick={() => void begin()}>{tx('pages.games.retry')}</Button></Card>;
  const matchedCount = round.matchedIds.length / 2;
  return (
    <Card className="memory-board">
      <div className="play-round-heading">
        <span>{tx('pages.games.stage', { value1: round.stage })}</span>
        <span>{tx('pages.games.pairsProgress', { value1: matchedCount, value2: round.pairCount })}</span>
        <span>{tx('pages.games.moves', { value1: round.moves })}</span>
      </div>
      <ProgressBar value={Math.round(matchedCount / round.pairCount * 100)} tone="mint" />
      <div className="memory-garden" aria-hidden="true">
        {Array.from({ length: round.pairCount }, (_, i) => (
          <span key={i} className={i < matchedCount ? 'garden-grown' : ''}>{i < matchedCount ? '🌻' : '🌱'}</span>
        ))}
      </div>
      {locale !== 'uz' && <p className="play-note">{tx('pages.games.uzbekCardsNotice')}</p>}
      {error && <p role="alert" className="play-note">{error}</p>}
      {round.status === 'COMPLETED' ? (
        <div className="memory-result" role="status">
          <Trophy size={50} />
          <h2>{tx('pages.games.yourKnowledgeGardenHasBloomed')}</h2>
          <p>{tx('pages.games.youFoundAllPairsInMoves', { value1: round.moves })}</p>
          {round.moves > round.pairCount * 2 && <p>{tx('pages.games.practiceSuggestion')}</p>}
          <div className="play-actions">
            <Button onClick={() => void begin()}>{tx('pages.games.nextRound')}</Button>
            <Button variant="secondary" onClick={() => void begin(round.stage)}>{tx('pages.games.repeatStage')}</Button>
          </div>
        </div>
      ) : (
        <div className="memory-grid">
          {round.cards.map((card, i) => {
            const matched = round.matchedIds.includes(card.id);
            const visible = matched || open.includes(card.id);
            return (
              <button
                key={card.id}
                className={`memory-card ${visible ? 'is-open' : ''} ${matched ? 'is-matched' : ''}`}
                aria-label={visible ? card.text : tx('pages.games.hiddenCard', { value1: i + 1 })}
                disabled={busy || visible}
                onClick={() => void choose(card.id)}
              >
                {visible ? <span>{card.text}</span> : <Brain size={32} />}
              </button>
            );
          })}
        </div>
      )}
      <div className="memory-report">
        <Button variant="secondary" disabled={reported} onClick={() => void report()}>
          {reported ? tx('pages.games.reported') : tx('pages.games.reportPair')}
        </Button>
      </div>
    </Card>
  );
}
