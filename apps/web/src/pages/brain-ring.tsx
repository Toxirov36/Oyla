import { localizeText } from '../i18n';
import { translate as tx, useI18n as usePageLocale } from '../i18n';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Swords, Clock3, Trophy, CheckCircle2 } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { FriendsData, Subject } from '../lib/types';
import type { BrainMatch } from '../lib/play';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  ProgressBar,
} from '../components/ui';
import { ComboboxField } from '../components/combobox-field';
import { UserAvatar } from '../components/user-avatar';
const statusNames: Record<BrainMatch['status'], string> = {
  get INVITED() {
    return tx('pages.brain-ring.invitation');
  },
  get ACTIVE() {
    return tx('pages.brain-ring.inProgress');
  },
  get FINISHED() {
    return tx('pages.brain-ring.completed');
  },
  get DECLINED() {
    return tx('pages.brain-ring.declined');
  },
  get CANCELLED() {
    return tx('pages.brain-ring.cancelled');
  },
  get EXPIRED() {
    return tx('pages.brain-ring.invitationExpired');
  },
};

export default function BrainRing() {
  usePageLocale();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const friends = useQuery({
    queryKey: ['friends'],
    queryFn: () => api<FriendsData>('/friends'),
    enabled: !id,
  });
  const subjects = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api<Subject[]>('/subjects'),
    enabled: !id,
  });
  const matches = useQuery({
    queryKey: ['brain-ring'],
    queryFn: () => api<BrainMatch[]>('/brain-ring'),
    enabled: !id,
    refetchInterval: 5000,
  });
  const room = useQuery({
    queryKey: ['brain-ring', id],
    queryFn: () => api<BrainMatch>(`/brain-ring/${id}`),
    enabled: !!id,
    refetchInterval: (query) =>
      ['INVITED', 'ACTIVE'].includes(query.state.data?.status ?? '') ? 1500 : false,
  });
  const [opponentId, setOpponentId] = useState('');
  const [subjectId, setSubjectId] = useState('all');
  const [choice, setChoice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(0);
  useEffect(() => {
    const handle = setInterval(() => setClock(performance.now()), 250);
    return () => clearInterval(handle);
  }, []);
  useEffect(() => {
    setChoice('');
    setError('');
  }, [id, room.data?.roundIndex]);
  const act = async (action: 'accept' | 'decline' | 'cancel') => {
    setBusy(true);
    setError('');
    try {
      const data = await api<BrainMatch>(`/brain-ring/${id}/actions`, {
        method: 'POST',
        body: { action },
      });
      cache.setQueryData(['brain-ring', id], data);
      await cache.invalidateQueries({ queryKey: ['brain-ring'] });
      await cache.invalidateQueries({ queryKey: ['notifications'] });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  if (id) {
    if (room.isPending) return <Loading />;
    if (room.error) return <ErrorState error={room.error} retry={() => void room.refetch()} />;
    const match = room.data;
    const opponent = match.players.find((player) => player.id !== user!.id)!;
    const deadline = ['COUNTDOWN', 'REVEAL'].includes(match.phase)
      ? match.transitionAt
      : match.roundEndsAt;
    const elapsed = Math.max(0, clock - room.dataUpdatedAt + Date.now() - performance.now());
    const remaining = deadline
      ? Math.max(
          0,
          Math.ceil((Date.parse(deadline) - Date.parse(match.serverNow) - elapsed) / 1000),
        )
      : 0;
    const own = match.players.find((player) => player.id === user!.id)!;
    const options =
      match.question?.type === 'TRUE_FALSE'
        ? [
            {
              value: 'true',
              get text() {
                return tx('exercise.true');
              },
            },
            {
              value: 'false',
              get text() {
                return tx('exercise.false');
              },
            },
          ]
        : (match.question?.options ?? []);
    return (
      <div className="play-space">
        <Link className="back-link" to="/brain-ring">
          {tx('pages.brain-ring.backToMatches')}
        </Link>
        <PageHeader
          title="Brain Ring"
          description={tx('pages.brain-ring.withGradeLevel', {
            value1: opponent.name,
            value2: match.grade,
          })}
        />
        <div className="brain-scoreboard">
          {match.players.map((player) => (
            <Card
              key={player.id}
              className={player.id === user!.id ? 'brain-player me' : 'brain-player'}
            >
              <UserAvatar name={player.name} avatar={player.avatar} size="xl" />
              <strong>{player.name}</strong>
              <span>{tx('pages.brain-ring.points', { value1: player.score })}</span>
              {match.status === 'ACTIVE' && (
                <small>
                  {player.answered
                    ? tx('pages.brain-ring.answered')
                    : tx('pages.brain-ring.thinking')}
                </small>
              )}
            </Card>
          ))}
        </div>
        {match.status === 'INVITED' ? (
          <Card className="brain-waiting">
            <Swords size={42} />
            <h2>
              {match.guestId === user!.id
                ? tx('pages.brain-ring.yourFriendHasInvitedYouToAMatch')
                : tx('pages.brain-ring.waitingForYourFriendsResponse')}
            </h2>
            <p>{tx('pages.brain-ring.5Questions20SecondsPerQuestion10Points')}</p>
            <div className="play-actions">
              {match.guestId === user!.id ? (
                <>
                  <Button busy={busy} onClick={() => void act('accept')}>
                    {tx('pages.brain-ring.accept')}
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={() => void act('decline')}>
                    {tx('pages.brain-ring.decline')}
                  </Button>
                </>
              ) : (
                <Button variant="secondary" busy={busy} onClick={() => void act('cancel')}>
                  {tx('pages.brain-ring.cancelInvitation')}
                </Button>
              )}
            </div>
          </Card>
        ) : match.status === 'ACTIVE' ? (
          <Card className="brain-question">
            <div className="play-round-heading">
              <span>
                {tx('pages.brain-ring.question', {
                  value1: match.roundIndex + 1,
                  value2: match.total,
                })}
              </span>
              <span className="brain-timer">
                <Clock3 size={18} />
                {tx('pages.brain-ring.s', { value1: remaining })}
              </span>
            </div>
            <ProgressBar value={(match.roundIndex / match.total) * 100} />
            {match.phase === 'COUNTDOWN' ? (
              <div className="brain-countdown">
                <strong>{remaining}</strong>
                <h2>{tx('pages.brain-ring.getReady')}</h2>
              </div>
            ) : (
              <>
                <h2>{match.question?.text}</h2>
                <div className="brain-options">
                  {options.map((option) => (
                    <button
                      className={`brain-option ${(match.ownValue ?? choice) === option.value ? 'selected' : ''}`}
                      key={option.value}
                      disabled={busy || !!match.ownValue || match.phase !== 'ANSWERING'}
                      onClick={() => setChoice(option.value)}
                    >
                      {option.text}
                    </button>
                  ))}
                </div>
                {match.phase === 'REVEAL' && match.feedback ? (
                  <div
                    className={`brain-feedback ${match.feedback.correct ? 'right' : 'wrong'}`}
                    role="status"
                  >
                    <strong>
                      {match.feedback.correct
                        ? tx('pages.brain-ring.correct10Points')
                        : tx('pages.brain-ring.noPointsThisTime')}
                    </strong>
                    <p>
                      {tx('pages.admin.content.answer', {
                        value1: match.feedback.correctAnswer ?? '',
                      })}
                    </p>
                    <p>{match.feedback.explanation}</p>
                    <small>{tx('pages.brain-ring.theNextQuestionOpensAutomatically')}</small>
                  </div>
                ) : match.ownValue ? (
                  <p className="brain-saved" role="status">
                    <CheckCircle2 size={20} />
                    {tx('pages.brain-ring.yourAnswerIsSavedWaitingForYourFriend')}
                  </p>
                ) : (
                  <Button
                    busy={busy}
                    disabled={!choice || remaining === 0}
                    onClick={async () => {
                      setBusy(true);
                      setError('');
                      try {
                        await api(`/brain-ring/${id}/answers`, {
                          method: 'POST',
                          body: { roundIndex: match.roundIndex, value: choice },
                        });
                        await room.refetch();
                      } catch (e) {
                        setError(errorText(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {tx('pages.brain-ring.submitAnswer')}
                  </Button>
                )}
              </>
            )}
          </Card>
        ) : (
          <Card className="brain-result">
            <Trophy size={48} />
            <h2>
              {match.status === 'FINISHED'
                ? match.winnerId === user!.id
                  ? tx('pages.brain-ring.youWon')
                  : !match.winnerId
                    ? tx('pages.brain-ring.itsATie')
                    : tx('pages.brain-ring.aGreatMatch')
                : statusNames[match.status]}
            </h2>
            <p>
              {own.score} : {opponent.score}
            </p>
            <Link className="btn btn-primary" to="/brain-ring">
              {tx('pages.brain-ring.newMatch')}
            </Link>
          </Card>
        )}
        {error && (
          <p role="alert" className="form-error">
            {localizeText(error)}
          </p>
        )}
        <p className="play-note">
          {tx('pages.brain-ring.matchPointsAreTrackedSeparatelyYourLessonXp')}
        </p>
      </div>
    );
  }
  if (friends.isPending || matches.isPending) return <Loading />;
  if (friends.error || matches.error)
    return (
      <ErrorState
        error={friends.error ?? matches.error}
        retry={() => {
          void friends.refetch();
          void matches.refetch();
        }}
      />
    );
  const peers = friends.data.friends.filter((entry) => entry.user.active);
  return (
    <div className="play-space">
      <PageHeader
        title="Brain Ring"
        description={tx('pages.brain-ring.chooseAFriendAndChallengeThemOnline')}
      />
      <Card className="brain-invite-form">
        <h2>{tx('pages.brain-ring.whoWillYouChallenge')}</h2>
        {peers.length ? (
          <>
            <ComboboxField
              label={tx('pages.brain-ring.yourFriend')}
              value={opponentId}
              onChange={setOpponentId}
              options={peers.map((entry) => ({
                value: entry.user.id,
                get label() {
                  return tx('pages.admin.classes.grade', {
                    value1: entry.user.name,
                    value2: entry.user.grade ?? '',
                  });
                },
              }))}
            />
            <ComboboxField
              label={tx('pages.admin.videos.subject')}
              value={subjectId}
              onChange={setSubjectId}
              options={[
                {
                  value: 'all',
                  get label() {
                    return tx('pages.brain-ring.mixedQuestions');
                  },
                },
                ...(subjects.data ?? []).map((subject) => ({
                  value: subject.id,
                  label: localizeText(subject.title),
                })),
              ]}
            />
            <Button
              busy={busy}
              disabled={!opponentId}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  const match = await api<BrainMatch>('/brain-ring', {
                    method: 'POST',
                    body: { opponentId, ...(subjectId !== 'all' ? { subjectId } : {}) },
                  });
                  navigate(`/brain-ring/${match.id}`);
                } catch (e) {
                  setError(errorText(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {tx('pages.brain-ring.inviteToAMatch')}
            </Button>
          </>
        ) : (
          <EmptyState
            title={tx('pages.brain-ring.noFriendsYet')}
            description={tx('pages.brain-ring.sendAFriendRequestFirstAndWaitFor')}
          />
        )}
        <Link className="text-link" to="/friends">
          {tx('pages.brain-ring.goToMyFriends')}
        </Link>
        {error && (
          <p role="alert" className="form-error">
            {localizeText(error)}
          </p>
        )}
      </Card>
      <h2 className="play-section-title">{tx('pages.brain-ring.myMatches')}</h2>
      {matches.data.length ? (
        <div className="brain-match-list">
          {matches.data.map((match) => {
            const peer = match.players.find((player) => player.id !== user!.id)!;
            return (
              <Link className="brain-match-row" key={match.id} to={`/brain-ring/${match.id}`}>
                <UserAvatar name={peer.name} avatar={peer.avatar} />
                <strong>{peer.name}</strong>
                <span className="pill">{statusNames[match.status]}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState title={tx('pages.brain-ring.startYourFirstMatch')} />
      )}
    </div>
  );
}
