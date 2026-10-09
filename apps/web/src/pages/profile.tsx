import { translate as tx, localizeText } from '../i18n';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Flame,
  GraduationCap,
  Mail,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { api, ApiError, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Profile } from '../lib/types';
import { formatNumber, tashkentDate } from '../lib/locale';
import { useI18n } from '../i18n';
import { ChangePasswordForm } from '../components/change-password';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { AvatarPicker } from '../components/avatar-picker';
import { ProfilePhoto } from '../components/profile-photo';
import { brand } from '../lib/brand';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  ProgressBar,
  Stat,
  dateLabel,
} from '../components/ui';

const schema = z.object({
  name: z.string().trim().min(2, 'validation.nameMin').max(80, 'validation.nameMax'),
});

function ProfileForm({ profile }: { profile: Profile }) {
  const { t } = useI18n();
  const { reloadUser } = useAuth();
  const cache = useQueryClient();
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError: fieldError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: profile.user.name },
  });
  useEffect(() => {
    reset({ name: profile.user.name });
  }, [profile.user.name, reset]);
  const submit = handleSubmit(async (values) => {
    setError('');
    setSaved(false);
    try {
      const updated = await api<Profile>('/users/me/profile', { method: 'PATCH', body: values });
      cache.setQueryData(['profile'], updated);
      reset({ name: updated.user.name });
      await reloadUser();
      await cache.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'profile' });
      setSaved(true);
    } catch (e) {
      setError(e);
      if (e instanceof ApiError)
        for (const field of e.fields)
          if (field.field === 'name') fieldError('name', { message: field.messages.join(' ') });
    }
  });
  return (
    <Card className="profile-details">
      <h2>{t('profile.account')}</h2>
      <p className="card-subtitle">{t('profile.nameHelp')}</p>
      <form onSubmit={submit} className="profile-form" noValidate>
        <label htmlFor="profile-name">{t('profile.name')}</label>
        <input
          id="profile-name"
          autoComplete="name"
          {...register('name', { onChange: () => setSaved(false) })}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'profile-name-error' : undefined}
        />
        {errors.name && (
          <small id="profile-name-error" className="field-error" role="alert">
            {t(errors.name.message!)}
          </small>
        )}
        <label htmlFor="profile-email">{t('profile.email')}</label>
        <input id="profile-email" type="email" value={profile.user.email} readOnly />
        <p className="field-help">{t('profile.emailHelp')}</p>
        {profile.user.role === 'STUDENT' && profile.user.student && (
          <>
            <label htmlFor="profile-grade">{t('auth.grade')}</label>
            <input
              id="profile-grade"
              value={t('common.grade', { grade: profile.user.student.grade })}
              readOnly
            />
            <p className="field-help">{t('profile.gradeHelp')}</p>
          </>
        )}
        {!!error && (
          <div className="form-error" role="alert">
            {errorText(error)}
          </div>
        )}
        {saved && (
          <p className="profile-success" role="status">
            <CheckCircle2 size={18} />
            {t('profile.saved')}
          </p>
        )}
        <div className="profile-save">
          <Button type="submit" busy={isSubmitting} disabled={!isDirty}>
            {t('profile.save')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function ProfilePage() {
  const { t } = useI18n();
  const location = useLocation();
  const query = useQuery({
    queryKey: ['profile'],
    queryFn: () => api<Profile>('/users/me/profile'),
  });
  useEffect(() => {
    if (location.hash !== '#settings' || !query.data) return;
    const section = document.getElementById('profile-settings');
    section?.scrollIntoView({ block: 'start' });
    section?.focus({ preventScroll: true });
  }, [location.hash, query.data]);
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const profile = query.data;
  const student = profile.student;
  const teacher = profile.teacher;
  const initial = profile.user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
  const levelProgress =
    student && student.nextLevelThreshold !== null
      ? ((student.totalXp - student.levelThreshold) /
          (student.nextLevelThreshold - student.levelThreshold)) *
        100
      : 100;
  return (
    <>
      <PageHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.description')}
      />
      <div className="profile-layout">
        <div className="profile-main">
          <Card className="profile-identity">
            <div className="profile-identity-avatar-wrap">
              <Avatar size="2xl" className="profile-avatar" aria-hidden="true">
                {profile.user.avatar && <AvatarImage src={profile.user.avatar.imageUrl} alt="" />}
                <AvatarFallback variant="gradient">{initial}</AvatarFallback>
              </Avatar>
            </div>
            <div className="profile-identity-info">
              <div className="profile-identity-header">
                <span className={`pill role-${profile.user.role.toLowerCase()}`}>
                  {t(`role.${profile.user.role}`)}
                </span>
                <h2>{profile.user.name}</h2>
              </div>
              <div className="profile-identity-meta">
                <p>
                  <Mail size={15} className="profile-meta-icon" />
                  <span>{profile.user.email}</span>
                </p>
                <p>
                  <CalendarDays size={15} className="profile-meta-icon" />
                  <span>
                    {dateLabel(profile.user.createdAt)}{' '}
                    {t('profile.memberSince', {
                      year: tashkentDate(profile.user.createdAt).getUTCFullYear(),
                      brand: brand.name,
                    })}
                  </span>
                </p>
              </div>
              <div className="profile-identity-actions">
                <AvatarPicker profile={profile} />
                <ProfilePhoto profile={profile} />
              </div>
            </div>
          </Card>
          <section
            id="profile-settings"
            className="profile-settings-section"
            tabIndex={-1}
            aria-label={t('profile.settings')}
          >
            <ProfileForm profile={profile} />
            <ChangePasswordForm />
          </section>
          {student && (
            <div className="stats-grid profile-stats">
              <Stat
                label={t('profile.completedLessons')}
                value={student.completedLessons}
                icon={<BookOpen size={24} />}
              />
              <Stat
                label={t('profile.earnedBadges')}
                value={student.badges}
                icon={<Award size={24} />}
              />
              <Stat
                label={t('profile.longestStreak')}
                value={t('common.days', { count: student.longestStreak })}
                icon={<Flame size={24} />}
              />
            </div>
          )}
          {teacher && (
            <div className="stats-grid profile-stats">
              <Stat
                label={t('navigation.classes')}
                value={teacher.classes.length}
                icon={<GraduationCap size={24} />}
              />
              <Stat
                label={t('profile.students')}
                value={teacher.students}
                icon={<Users size={24} />}
              />
              <Stat
                label={t('profile.assignments')}
                value={teacher.assignments}
                icon={<BookOpen size={24} />}
              />
            </div>
          )}
        </div>
        <aside className="profile-side">
          {student && (
            <Card>
              <div className="card-heading">
                <h3>{t('profile.level')}</h3>
                <Zap size={22} className="purple-text" />
              </div>
              <div className="profile-level">
                <span className="level-circle">
                  <span>{t('profile.levelLabel')}</span>
                  <strong>{student.level}</strong>
                </span>
                <div>
                  <strong>{localizeText(student.levelTitle)}</strong>
                  <p>
                    {tx('pages.admin.gamification.xpVariant60', {
                      value1: formatNumber(student.totalXp),
                    })}
                  </p>
                </div>
              </div>
              <ProgressBar value={levelProgress} tone="purple" />
              <p className="card-subtitle">
                {student.nextLevelThreshold === null
                  ? t('profile.maxLevel')
                  : t('profile.nextLevel', { count: student.nextLevelThreshold - student.totalXp })}
              </p>
              <Link className="btn btn-primary full-width" to="/subjects">
                {t('profile.continue')}
              </Link>
            </Card>
          )}
          {(student || teacher) && (
            <Card>
              <h3>{t(teacher ? 'navigation.classes' : 'navigation.class')}</h3>
              {student ? (
                student.classes.length ? (
                  student.classes.map((group) => (
                    <Link
                      className="profile-class"
                      key={group.id}
                      to={`/my-class?classId=${group.id}`}
                    >
                      <GraduationCap size={22} />
                      <div>
                        <strong>{group.name}</strong>
                        <small>{group.teacher.name}</small>
                      </div>
                    </Link>
                  ))
                ) : (
                  <EmptyState title={t('profile.noClass')} description={t('profile.noClassHelp')} />
                )
              ) : teacher?.classes.length ? (
                teacher.classes.map((group) => (
                  <Link
                    className="profile-class"
                    key={group.id}
                    to={`/teacher/classes/${group.id}`}
                  >
                    <GraduationCap size={22} />
                    <div>
                      <strong>{group.name}</strong>
                      <small>
                        {t('profile.classSummary', {
                          count: group._count.students,
                          grade: group.grade,
                        })}
                      </small>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState title={t('profile.noTeacherClass')} />
              )}
            </Card>
          )}
          <Card className="profile-security">
            <ShieldCheck size={27} />
            <h3>{t('profile.secure')}</h3>
            <p>{t('profile.secureHelp')}</p>
          </Card>
        </aside>
      </div>
    </>
  );
}
