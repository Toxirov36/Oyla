import { localizeText } from '../i18n';
import { translate as tx, useI18n as usePageLocale } from '../i18n';
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
    .regex(/^[A-Za-z0-9_-]{16}$/, tx('pages.friends.enterThe16characterInvitationCode')),
});
export default function FriendsPage() {
  usePageLocale();
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
      cache.invalidateQueries({ queryKey: ['student-class', user!.id] }),
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
          ? tx('pages.friends.thisStudentIsAlreadyYourFriend')
          : result.state === 'INCOMING'
            ? tx('pages.friends.youHaveARequestFromThisStudentYou')
            : tx('pages.friends.friendRequestSent'),
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
        <UserAvatar name={entry.user.name} avatar={entry.user.avatar} />
        <div className="friend-person">
          <strong>{entry.user.name}</strong>
          <small>
            {entry.user.grade
              ? tx('common.grade', { grade: entry.user.grade })
              : tx('role.STUDENT')}
            {!entry.user.active ? tx('pages.friends.inactive') : ''}
          </small>
        </div>
        <div className="friend-actions">
          {kind === 'incoming' && (
            <Button
              variant="secondary"
              disabled={busy || !entry.user.active}
              onClick={() => void action(entry, true)}
              aria-label={tx('pages.friends.acceptRequestFrom', { value1: entry.user.name })}
            >
              <Check size={16} />
              {tx('pages.brain-ring.accept')}
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => void action(entry)}
            aria-label={`${entry.user.name}: ${kind === 'friends' ? tx('pages.friends.removeFriendVariant226') : kind === 'incoming' ? tx('pages.friends.decline') : tx('pages.friends.cancelRequest')}`}
          >
            <X size={16} />
            {kind === 'friends'
              ? tx('pages.friends.removeFriend')
              : kind === 'incoming'
                ? tx('pages.brain-ring.decline')
                : tx('common.cancel')}
          </Button>
        </div>
      </div>
    ));
  return (
    <>
      <PageHeader
        eyebrow={tx('pages.friends.learnTogether')}
        title={tx('navigation.friends')}
        description={tx('pages.friends.shareYourInvitationCodeAcceptRequestsAndTest')}
        action={
          <Link to="/leaderboard?scope=friends" className="btn btn-secondary">
            <Trophy size={18} />
            {tx('pages.friends.friendsRanking')}
          </Link>
        }
      />
      <div className="two-column">
        <Card>
          <h2>{tx('pages.friends.myInvitationCode')}</h2>
          <p className="card-subtitle">
            {tx('pages.friends.shareYourCodeOnlyWithStudentsYouWant')}
          </p>
          <label htmlFor="friend-code">{tx('pages.friends.invitationCode')}</label>
          <div className="friend-code">
            <input
              id="friend-code"
              readOnly
              value={data.inviteCode}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant="secondary"
              aria-label={tx('pages.friends.copyInvitationCode')}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(data.inviteCode);
                  setMessage(tx('pages.friends.invitationCodeCopied'));
                } catch {
                  setError(tx('pages.friends.selectTheCodeAndCopyItWithCtrlc'));
                }
              }}
            >
              <Copy size={17} />
            </Button>
          </div>
        </Card>
        <Card>
          <h2>{tx('pages.friends.addFriend')}</h2>
          <form className="profile-form" onSubmit={submit} noValidate>
            <label htmlFor="friend-invite">{tx('pages.friends.yourFriendsInvitationCode')}</label>
            <input
              id="friend-invite"
              maxLength={16}
              autoComplete="off"
              {...register('code')}
              aria-invalid={!!errors.code}
            />
            {errors.code && (
              <small className="field-error" role="alert">
                {localizeText(errors.code.message)}
              </small>
            )}
            <Button type="submit" busy={isSubmitting}>
              <UserPlus size={17} />
              {tx('pages.friends.sendRequest')}
            </Button>
          </form>
        </Card>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {localizeText(error)}
        </p>
      )}
      {message && (
        <p className="profile-success" role="status">
          {message}
        </p>
      )}
      <div className="section-title">
        <h2>{tx('pages.friends.incomingRequests')}</h2>
        <span className="pill">{data.incoming.length}</span>
      </div>
      <Card>
        {data.incoming.length ? (
          rows(data.incoming, 'incoming')
        ) : (
          <EmptyState title={tx('pages.friends.noIncomingRequests')} />
        )}
      </Card>
      <div className="section-title">
        <h2>{tx('pages.friends.myFriends')}</h2>
        <span className="pill">{data.friends.length}</span>
      </div>
      <Card>
        {data.friends.length ? (
          rows(data.friends, 'friends')
        ) : (
          <EmptyState
            title={tx('pages.friends.noFriendsAddedYet')}
            description={tx('pages.friends.enterAStudentsInvitationCodeOrShareYour')}
          />
        )}
      </Card>
      <div className="section-title">
        <h2>{tx('pages.friends.sentRequests')}</h2>
        <Users size={20} />
      </div>
      <Card>
        {data.outgoing.length ? (
          rows(data.outgoing, 'outgoing')
        ) : (
          <EmptyState title={tx('pages.friends.noSentRequests')} />
        )}
      </Card>
    </>
  );
}
import { UserAvatar } from '../components/user-avatar';
