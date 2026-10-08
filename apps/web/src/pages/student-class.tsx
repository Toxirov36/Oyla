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
        setMessage(`${member.name} bilan do‘stlik o‘rnatildi.`);
      } else {
        const result = await api<{ state: string }>('/friends/classmates', {
          method: 'POST',
          body: { classId, userId: member.id },
        });
        setMessage(
          result.state === 'ACCEPTED'
            ? `${member.name} allaqachon do‘stingiz.`
            : result.state === 'INCOMING'
              ? 'Bu sinfdoshingizdan kelgan so‘rovni qabul qilishingiz mumkin.'
              : `${member.name} ga do‘stlik so‘rovi yuborildi.`,
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
        eyebrow="BIR SINFMIZ — BIRGA O‘RGANAMIZ"
        title="Mening sinfim"
        description="Sinfingiz, sinfdoshlaringiz va o‘qituvchingiz bergan topshiriqlar."
      />
      {!classes.data.length ? (
        <Card>
          <EmptyState
            title="Hali sinfga biriktirilmagansiz"
            description="Administrator sizni sinfga qo‘shganda uning ma’lumotlari shu yerda ko‘rinadi."
            action={
              <Link className="btn btn-primary" to="/subjects">
                Mustaqil o‘rganish
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {classes.data.length > 1 && (
            <div className="student-class-picker">
              <ComboboxField
                label="Sinfni tanlash"
                disabled={!!busy}
                options={classes.data.map((group) => ({
                  value: group.id,
                  label: `${group.name} · ${group.grade}-sinf`,
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
                    <span className="eyebrow">SINF HAQIDA</span>
                    <h2>{detail.data.name}</h2>
                    <p>
                      {detail.data.grade}-sinf · {detail.data.studentCount} o‘quvchi
                    </p>
                    <p>
                      O‘qituvchi: <strong>{detail.data.teacher.name}</strong>
                    </p>
                  </div>
                  <Link
                    className="btn btn-secondary"
                    to={`/leaderboard?scope=class&classId=${detail.data.id}`}
                  >
                    <Trophy size={18} />
                    Sinf reytingi
                  </Link>
                </Card>
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
                  <h2>Sinfdoshlar</h2>
                  <span className="pill">
                    <Users size={15} />
                    {detail.data.studentCount} o‘quvchi
                  </span>
                </div>
                <Card className="classmate-list">
                  {detail.data.members.map((member) => (
                    <div className="friend-row" key={member.id}>
                      <UserAvatar name={member.name} avatar={member.avatar} />
                      <div className="friend-person">
                        <strong>
                          {member.name}
                          {member.isMe && <small className="classmate-me">Siz</small>}
                        </strong>
                      </div>
                      {!member.isMe && (
                        <div className="friend-actions">
                          {member.friendship?.state === 'FRIENDS' ? (
                            <span className="pill status-completed">
                              <Check size={15} />
                              Do‘stingiz
                            </span>
                          ) : member.friendship?.state === 'OUTGOING' ? (
                            <span className="pill">So‘rov yuborilgan</span>
                          ) : (
                            <Button
                              variant="secondary"
                              disabled={!!busy}
                              busy={busy === member.id}
                              onClick={() => void friendshipAction(member)}
                              aria-label={`${member.name}: ${member.friendship?.state === 'INCOMING' ? 'so‘rovni qabul qilish' : 'do‘stlikka taklif qilish'}`}
                            >
                              {member.friendship?.state === 'INCOMING' ? (
                                <Check size={16} />
                              ) : (
                                <UserPlus size={16} />
                              )}
                              {member.friendship?.state === 'INCOMING'
                                ? 'Qabul qilish'
                                : 'Do‘stlikka taklif qilish'}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <Link to="/friends" className="text-link classmates-manage">
                    Do‘stlik so‘rovlarini boshqarish
                  </Link>
                </Card>
                <div className="section-title">
                  <h2>Sinf topshiriqlari</h2>
                  <span className="subtle">
                    Sizning bajarish holatingiz · vaqt Toshkent bo‘yicha
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
