import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Copy, UserPlus, Users, X, Trophy } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { FriendConnection, FriendsData } from '../lib/types';
import { Button, Card, EmptyState, ErrorState, Loading, PageHeader } from '../components/ui';

const schema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{16}$/, '16 belgili taklif kodini kiriting.'),
});
export default function FriendsPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const cache = useQueryClient();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ['friends', user!.id],
    queryFn: () => api<FriendsData>('/friends'),
    refetchInterval: 30000,
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { code: params.get('code') || '' },
  });
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ['friends', user!.id] }),
      cache.invalidateQueries({ queryKey: ['ranking'] }),
      cache.invalidateQueries({ queryKey: ['notifications', user!.id] }),
    ]);
  };
  const submit = handleSubmit(async (values) => {
    setError('');
    setMessage('');
    try {
      const result = await api<{ state: string }>('/friends/requests', {
        method: 'POST',
        body: values,
      });
      setMessage(
        result.state === 'ACCEPTED'
          ? 'Bu o‘quvchi allaqachon do‘stingiz.'
          : result.state === 'INCOMING'
            ? 'Bu o‘quvchidan kelgan so‘rov bor. Uni quyida qabul qilishingiz mumkin.'
            : 'Do‘stlik so‘rovi yuborildi.',
      );
      reset({ code: '' });
      await refresh();
    } catch (e) {
      setError(errorText(e));
    }
  });
  const action = async (entry: FriendConnection, accept = false) => {
    setBusy(true);
    setError('');
    try {
      await api(accept ? `/friends/requests/${entry.id}/accept` : `/friends/${entry.id}`, {
        method: accept ? 'PATCH' : 'DELETE',
        ...(accept ? { body: {} } : {}),
      });
      await refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const data = query.data;
  const rows = (entries: FriendConnection[], kind: 'incoming' | 'outgoing' | 'friends') =>
    entries.map((entry) => (
      <div className="friend-row" key={entry.id}>
        <span className="avatar">{entry.user.name[0]}</span>
        <div className="friend-person">
          <strong>{entry.user.name}</strong>
          <small>
            {entry.user.grade ? `${entry.user.grade}-sinf` : 'O‘quvchi'}
            {!entry.user.active ? ' · faolsiz' : ''}
          </small>
        </div>
        <div className="friend-actions">
          {kind === 'incoming' && (
            <Button
              variant="secondary"
              disabled={busy || !entry.user.active}
              onClick={() => void action(entry, true)}
              aria-label={`${entry.user.name} so‘rovini qabul qilish`}
            >
              <Check size={16} />
              Qabul qilish
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void action(entry)}
            aria-label={`${entry.user.name}: ${kind === 'friends' ? 'do‘stlikni tugatish' : kind === 'incoming' ? 'rad etish' : 'so‘rovni bekor qilish'}`}
          >
            <X size={16} />
            {kind === 'friends'
              ? 'Do‘stlikni tugatish'
              : kind === 'incoming'
                ? 'Rad etish'
                : 'Bekor qilish'}
          </Button>
        </div>
      </div>
    ));
  return (
    <>
      <PageHeader
        eyebrow="BIRGA O‘RGANAMIZ"
        title="Do‘stlarim"
        description="Taklif kodini ulashing, so‘rovni qabul qiling va haftalik reytingda bilimlaringizni sinang."
        action={
          <Link to="/leaderboard?scope=friends" className="btn btn-secondary">
            <Trophy size={18} />
            Do‘stlar reytingi
          </Link>
        }
      />
      <div className="two-column">
        <Card>
          <h2>Taklif kodim</h2>
          <p className="card-subtitle">Kodingizni faqat bog‘lanishni istagan o‘quvchiga bering.</p>
          <label htmlFor="friend-code">Taklif kodi</label>
          <div className="friend-code">
            <input
              id="friend-code"
              readOnly
              value={data.inviteCode}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant="secondary"
              aria-label="Taklif kodini nusxalash"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(data.inviteCode);
                  setMessage('Taklif kodi nusxalandi.');
                } catch {
                  setError('Kodni tanlab, Ctrl+C bilan nusxalang.');
                }
              }}
            >
              <Copy size={17} />
            </Button>
          </div>
        </Card>
        <Card>
          <h2>Do‘st qo‘shish</h2>
          <form className="profile-form" onSubmit={submit} noValidate>
            <label htmlFor="friend-invite">Do‘stingizning taklif kodi</label>
            <input
              id="friend-invite"
              maxLength={16}
              autoComplete="off"
              {...register('code')}
              aria-invalid={!!errors.code}
            />
            {errors.code && (
              <small className="field-error" role="alert">
                {errors.code.message}
              </small>
            )}
            <Button type="submit" busy={isSubmitting}>
              <UserPlus size={17} />
              So‘rov yuborish
            </Button>
          </form>
        </Card>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="profile-success" role="status">
          {message}
        </p>
      )}
      <div className="section-title">
        <h2>Kelgan so‘rovlar</h2>
        <span className="pill">{data.incoming.length}</span>
      </div>
      <Card>
        {data.incoming.length ? (
          rows(data.incoming, 'incoming')
        ) : (
          <EmptyState title="Kelgan so‘rovlar yo‘q" />
        )}
      </Card>
      <div className="section-title">
        <h2>Mening do‘stlarim</h2>
        <span className="pill">{data.friends.length}</span>
      </div>
      <Card>
        {data.friends.length ? (
          rows(data.friends, 'friends')
        ) : (
          <EmptyState
            title="Hali do‘stlar qo‘shilmagan"
            description="O‘quvchining taklif kodini kiriting yoki o‘z kodingizni ulashing."
          />
        )}
      </Card>
      <div className="section-title">
        <h2>Yuborilgan so‘rovlar</h2>
        <Users size={20} />
      </div>
      <Card>
        {data.outgoing.length ? (
          rows(data.outgoing, 'outgoing')
        ) : (
          <EmptyState title="Yuborilgan so‘rovlar yo‘q" />
        )}
      </Card>
    </>
  );
}
