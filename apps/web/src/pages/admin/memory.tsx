import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { translate as tx, useI18n } from '../../i18n';
import { api, errorText } from '../../lib/api';
import { subjectNames } from '../../lib/play';
import { Button, Card, ErrorState, Loading, PageHeader } from '../../components/ui';

type Deck = {
  id: string; grade: number; subject: string; stage: number; source: string;
  status: 'READY' | 'ARCHIVED'; modelId: string | null; createdAt: string;
  pairs: { left: string; right: string }[];
};
type Job = {
  key: string; status: string; attempts: number; lastError: string | null; updatedAt: string;
};
type Report = {
  id: string; reason: string; createdAt: string;
  round: { deckId: string; grade: number; subject: string; stage: number; deck: { source: string; status: string } };
  user: { name: string };
};

export default function AdminMemory() {
  useI18n();
  const cache = useQueryClient();
  const decks = useQuery({ queryKey: ['admin', 'memory', 'decks'], queryFn: () => api<Deck[]>('/admin/memory/decks') });
  const jobs = useQuery({ queryKey: ['admin', 'memory', 'jobs'], queryFn: () => api<Job[]>('/admin/memory/jobs') });
  const reports = useQuery({ queryKey: ['admin', 'memory', 'reports'], queryFn: () => api<Report[]>('/admin/memory/reports') });
  const setting = useQuery({ queryKey: ['admin', 'memory', 'settings'], queryFn: () => api<{ aiEnabled: boolean; configured: boolean }>('/admin/memory/settings') });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (decks.isPending || jobs.isPending || reports.isPending || setting.isPending) return <Loading />;
  if (decks.error || jobs.error || reports.error || setting.error)
    return <ErrorState error={decks.error || jobs.error || reports.error || setting.error} retry={() => {
      void Promise.all([decks.refetch(), jobs.refetch(), reports.refetch(), setting.refetch()]);
    }} />;

  async function mutate(path: string, body?: object) {
    setBusy(true);
    setError('');
    try {
      await api(path, { method: 'PATCH', ...(body ? { body } : {}) });
      await cache.invalidateQueries({ queryKey: ['admin', 'memory'] });
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="play-space">
      <PageHeader title={tx('pages.admin.memory.title')} description={tx('pages.admin.memory.description')} />
      {error && <p role="alert">{error}</p>}
      <Card>
        <div className="memory-admin-row">
          <div>
            <h2>{tx('pages.admin.memory.autoGeneration')}</h2>
            <p>{!setting.data.configured ? tx('pages.admin.memory.noKey') : setting.data.aiEnabled ? tx('pages.admin.memory.enabled') : tx('pages.admin.memory.paused')}</p>
          </div>
          <Button disabled={busy || !setting.data.configured} variant="secondary" onClick={() => void mutate('/admin/memory/settings', { aiEnabled: !setting.data.aiEnabled })}>
            {setting.data.aiEnabled ? tx('pages.admin.memory.pause') : tx('pages.admin.memory.resume')}
          </Button>
        </div>
      </Card>
      <h2>{tx('pages.admin.memory.reports', { value1: reports.data.length })}</h2>
      {reports.data.length === 0 && <p>{tx('pages.admin.memory.noReports')}</p>}
      <div className="memory-admin-list">
        {reports.data.map((report) => (
          <Card key={report.id}>
            <div className="memory-admin-row">
              <div>
                <strong>{report.user.name} · {report.reason}</strong>
                <p>{tx('pages.admin.memory.gradeStage', { value1: report.round.grade, value2: subjectNames[report.round.subject], value3: report.round.stage })}</p>
              </div>
              <div className="play-actions">
                {report.round.deck.source === 'GEMINI' && report.round.deck.status === 'READY' && (
                  <Button disabled={busy} variant="secondary" onClick={() => void mutate(`/admin/memory/decks/${report.round.deckId}/archive`)}>{tx('pages.admin.memory.archive')}</Button>
                )}
                <Button disabled={busy} onClick={() => void mutate(`/admin/memory/reports/${report.id}/resolve`)}>{tx('pages.admin.memory.resolve')}</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <h2>{tx('pages.admin.memory.jobs', { value1: jobs.data.length })}</h2>
      <div className="memory-admin-list">
        {jobs.data.map((job) => (
          <Card key={job.key}>
            <strong>{job.key} · {job.status}</strong>
            <p>{tx('pages.admin.memory.attempts', { value1: job.attempts })}</p>
            {job.lastError && <p>{job.lastError}</p>}
          </Card>
        ))}
      </div>
      <h2>{tx('pages.admin.memory.decks', { value1: decks.data.length })}</h2>
      <div className="memory-admin-list">
        {decks.data.map((deck) => (
          <Card key={deck.id}>
            <div className="memory-admin-row">
              <div>
                <strong>{tx('pages.admin.memory.gradeStage', { value1: deck.grade, value2: subjectNames[deck.subject], value3: deck.stage })} · {deck.status}</strong>
                <p>{deck.source}{deck.modelId ? ` · ${deck.modelId}` : ''}</p>
                <p>{deck.pairs.map((pair) => `${pair.left} ↔ ${pair.right}`).join(' · ')}</p>
              </div>
              {deck.source === 'GEMINI' && deck.status === 'READY' && (
                <Button disabled={busy} variant="secondary" onClick={() => void mutate(`/admin/memory/decks/${deck.id}/archive`)}>{tx('pages.admin.memory.archive')}</Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
