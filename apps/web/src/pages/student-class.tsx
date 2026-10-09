import { localizeText } from '../i18n';
import { translate as tx, useI18n as usePageLocale } from '../i18n';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, GraduationCap, Trophy, UserPlus, Users } from 'lucide-react';
import { api, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Classmate, StudentClass, StudentClassSummary } from '../lib/types';
import { Button, Card, EmptyState, ErrorState, Loading, PageHeader } from '../components/ui';
import { ComboboxField } from '../components/combobox-field';
import { StudentAssignments } from '../components/student-assignments';

export default function StudentClassPage() {
  usePageLocale();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const cache = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const classes = useQuery({
    queryKey: ['student-classes', user!.id],
    queryFn: () => api<StudentClassSummary[]>('/students/me/classes'),
  });
  const classId = params.get('classId') || classes.data?.[0]?.id || '';
  const detail = useQuery({
    queryKey: ['student-class', user!.id, classId],
    queryFn: () => api<StudentClass>(`/students/me/classes/${encodeURIComponent(classId)}`),
    enabled: !!classId && !!classes.data?.length,
    refetchInterval: 30000,
  });
  const friendshipAction = async (member: Classmate) => {
    setBusy(member.id);
    setError('');
    setMessage('');
    try {
      if (member.friendship?.state === 'INCOMING') {
        await api(`/friends/requests/${member.friendship.id}/accept`, {
          method: 'PATCH',
          body: {},
        });
        setMessage(tx('pages.student-class.youAreNowFriendsWith', { value1: member.name }));
      } else {
        const result = await api<{ state: string }>('/friends/classmates', {
          method: 'POST',
          body: { classId, userId: member.id },
        });
        setMessage(
          result.state === 'ACCEPTED'
            ? tx('pages.student-class.isAlreadyYourFriend', { value1: member.name })
            : result.state === 'INCOMING'
              ? tx('pages.student-class.youCanAcceptThisClassmatesRequest')
              : tx('pages.student-class.friendRequestSentTo', { value1: member.name }),
        );
      }
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['student-class', user!.id] }),
        cache.invalidateQueries({ queryKey: ['friends', user!.id] }),
        cache.invalidateQueries({ queryKey: ['ranking'] }),
        cache.invalidateQueries({ queryKey: ['notifications', user!.id] }),
      ]);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  };
  if (classes.isPending) return <Loading />;
  if (classes.error)
    return <ErrorState error={classes.error} retry={() => void classes.refetch()} />;
  return (
    <>
      <PageHeader
        eyebrow={tx('pages.student-class.oneClassLearningTogether')}
        title={tx('navigation.class')}
        description={tx('pages.student-class.yourClassClassmatesAndTeachersAssignments')}
      />
      {!classes.data.length ? (
        <Card>
          <EmptyState
            title={tx('profile.noClass')}
            description={tx('pages.student-class.yourClassDetailsWillAppearHereOnceAn')}
            action={
              <Link className="btn btn-primary" to="/subjects">
                {tx('pages.student-class.independentLearning')}
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {classes.data.length > 1 && (
            <div className="student-class-picker">
              <ComboboxField
                label={tx('pages.student-class.selectClass')}
                disabled={!!busy}
                options={classes.data.map((group) => ({
                  value: group.id,
                  get label() {
                    return tx('pages.admin.classes.grade', {
                      value1: group.name,
                      value2: group.grade,
                    });
                  },
                }))}
                value={classId}
                onChange={(id) => {
                  setParams(id ? { classId: id } : {});
                  setError('');
                  setMessage('');
                }}
              />
            </div>
          )}
          {detail.isPending ? (
            <Loading />
          ) : detail.error ? (
            <ErrorState error={detail.error} retry={() => void detail.refetch()} />
          ) : (
            detail.data && (
              <>
                <Card className="student-class-summary">
                  <span className="square-icon blue">
                    <GraduationCap size={28} />
                  </span>
                  <div className="student-class-info">
                    <span className="eyebrow">{tx('pages.student-class.aboutTheClass')}</span>
                    <h2>{detail.data.name}</h2>
                    <p>
                      {tx('pages.student-class.gradeStudents', {
                        value1: detail.data.grade,
                        value2: detail.data.studentCount,
                      })}
                    </p>
                    <p>
                      {tx('pages.student-class.teacher')}
                      <strong>{detail.data.teacher.name}</strong>
                    </p>
                  </div>
                  <Link
                    className="btn btn-secondary"
                    to={`/leaderboard?scope=class&classId=${detail.data.id}`}
                  >
                    <Trophy size={18} />
                    {tx('pages.student-class.classRanking')}
                  </Link>
                </Card>
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
                  <h2>{tx('pages.student-class.classmates')}</h2>
                  <span className="pill">
                    <Users size={15} />
                    {tx('pages.admin.classes.students', { value1: detail.data.studentCount })}
                  </span>
                </div>
                <Card className="classmate-list">
                  {detail.data.members.map((member) => (
                    <div className="friend-row" key={member.id}>
                      <UserAvatar name={member.name} avatar={member.avatar} />
                      <div className="friend-person">
                        <strong>
                          {member.name}
                          {member.isMe && (
                            <small className="classmate-me">{tx('pages.student-class.you')}</small>
                          )}
                        </strong>
                      </div>
                      {!member.isMe && (
                        <div className="friend-actions">
                          {member.friendship?.state === 'FRIENDS' ? (
                            <span className="pill status-completed">
                              <Check size={15} />
                              {tx('pages.brain-ring.yourFriend')}
                            </span>
                          ) : member.friendship?.state === 'OUTGOING' ? (
                            <span className="pill">{tx('pages.student-class.requestSent')}</span>
                          ) : (
                            <Button
                              variant="secondary"
                              disabled={!!busy}
                              busy={busy === member.id}
                              onClick={() => void friendshipAction(member)}
                              aria-label={`${member.name}: ${member.friendship?.state === 'INCOMING' ? tx('pages.student-class.acceptRequest') : tx('pages.student-class.sendFriendRequestVariant331')}`}
                            >
                              {member.friendship?.state === 'INCOMING' ? (
                                <Check size={16} />
                              ) : (
                                <UserPlus size={16} />
                              )}
                              {member.friendship?.state === 'INCOMING'
                                ? tx('pages.brain-ring.accept')
                                : tx('pages.student-class.sendFriendRequest')}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <Link to="/friends" className="text-link classmates-manage">
                    {tx('pages.student-class.manageFriendRequests')}
                  </Link>
                </Card>
                <div className="section-title">
                  <h2>{tx('pages.student-class.classAssignments')}</h2>
                  <span className="subtle">
                    {tx('pages.student-class.yourProgressTashkentTime')}
                  </span>
                </div>
                <StudentAssignments assignments={detail.data.assignments} />
              </>
            )
          )}
        </>
      )}
    </>
  );
}
import { UserAvatar } from '../components/user-avatar';
