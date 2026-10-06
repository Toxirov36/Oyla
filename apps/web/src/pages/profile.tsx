import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { tashkentDate } from '../lib/locale';
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
  name: z
    .string()
    .trim()
    .min(2, 'Ism kamida 2 ta belgidan iborat bo‘lsin.')
    .max(80, 'Ism 80 ta belgidan oshmasin.'),
});
const roles = { STUDENT: 'O‘quvchi', TEACHER: 'O‘qituvchi', ADMIN: 'Administrator' };

function ProfileForm({ profile }: { profile: Profile }) {
  const { reloadUser } = useAuth();
  const cache = useQueryClient();
  const [error, setError] = useState('');
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
      setError(errorText(e));
      if (e instanceof ApiError)
        for (const field of e.fields)
          if (field.field === 'name') fieldError('name', { message: field.messages.join(' ') });
    }
  });
  return (
    <Card className="profile-details">
      <h2>Hisob ma’lumotlari</h2>
      <p className="card-subtitle">Ismingiz sinfingiz va o‘quv natijalaringizda ko‘rinadi.</p>
      <form onSubmit={submit} className="profile-form" noValidate>
        <label htmlFor="profile-name">Ism va familiya</label>
        <input
          id="profile-name"
          autoComplete="name"
          {...register('name', { onChange: () => setSaved(false) })}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'profile-name-error' : undefined}
        />
        {errors.name && (
          <small id="profile-name-error" className="field-error" role="alert">
            {errors.name.message}
          </small>
        )}
        <label htmlFor="profile-email">Email manzili</label>
        <input id="profile-email" type="email" value={profile.user.email} readOnly />
        <p className="field-help">
          Email hisob identifikatori sifatida ishlatiladi. O‘zgartirish uchun administratorga
          murojaat qiling.
        </p>
        {profile.user.student && (
          <>
            <label htmlFor="profile-grade">Sinfingiz</label>
            <input id="profile-grade" value={`${profile.user.student.grade}-sinf`} readOnly />
            <p className="field-help">
              Sinfni administrator boshqaradi, shunda darslar va topshiriqlar mos keladi.
            </p>
          </>
        )}
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <p className="profile-success" role="status">
            <CheckCircle2 size={18} />
            Profilingiz saqlandi.
          </p>
        )}
        <div className="profile-save">
          <Button type="submit" busy={isSubmitting} disabled={!isDirty}>
            O‘zgarishlarni saqlash
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function ProfilePage() {
  const query = useQuery({
    queryKey: ['profile'],
    queryFn: () => api<Profile>('/users/me/profile'),
  });
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
        eyebrow="SIZNING SHAXSIY MAYDONINGIZ"
        title="Mening profilim"
        description="Hisobingiz, o‘rganish yo‘lingiz va qo‘lga kiritgan natijalaringiz."
      />
      <div className="profile-layout">
        <div className="profile-main">
          <Card className="profile-identity">
            <span className="profile-avatar" aria-hidden="true">
              {initial}
            </span>
            <div>
              <span className="pill">{roles[profile.user.role]}</span>
              <h2>{profile.user.name}</h2>
              <p>
                <Mail size={15} />
                {profile.user.email}
              </p>
              <p>
                <CalendarDays size={15} />
                {dateLabel(profile.user.createdAt)}{' '}
                {tashkentDate(profile.user.createdAt).getUTCFullYear()} dan beri OYLAda
              </p>
            </div>
          </Card>
          <ProfileForm profile={profile} />
          {student && (
            <div className="stats-grid profile-stats">
              <Stat
                label="Yakunlangan darslar"
                value={student.completedLessons}
                icon={<BookOpen size={24} />}
              />
              <Stat
                label="Qo‘lga kiritilgan nishonlar"
                value={student.badges}
                icon={<Award size={24} />}
              />
              <Stat
                label="Eng uzun streak"
                value={`${student.longestStreak} kun`}
                icon={<Flame size={24} />}
              />
            </div>
          )}
          {teacher && (
            <div className="stats-grid profile-stats">
              <Stat
                label="Mening sinflarim"
                value={teacher.classes.length}
                icon={<GraduationCap size={24} />}
              />
              <Stat label="O‘quvchilarim" value={teacher.students} icon={<Users size={24} />} />
              <Stat
                label="Berilgan topshiriqlar"
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
                <h3>Bilim darajangiz</h3>
                <Zap size={22} className="purple-text" />
              </div>
              <div className="profile-level">
                <span className="level-circle">
                  <span>DARAJA</span>
                  <strong>{student.level}</strong>
                </span>
                <div>
                  <strong>{student.levelTitle}</strong>
                  <p>{student.totalXp.toLocaleString()} XP</p>
                </div>
              </div>
              <ProgressBar value={levelProgress} tone="purple" />
              <p className="card-subtitle">
                {student.nextLevelThreshold === null
                  ? 'Eng yuqori darajaga yetdingiz!'
                  : `Keyingi darajaga ${student.nextLevelThreshold - student.totalXp} XP qoldi.`}
              </p>
              <Link className="btn btn-primary full-width" to="/subjects">
                O‘rganishda davom etish
              </Link>
            </Card>
          )}
          {(student || teacher) && (
            <Card>
              <h3>{teacher ? 'Mening sinflarim' : 'Mening sinfim'}</h3>
              {student ? (
                student.classes.length ? (
                  student.classes.map((group) => (
                    <div className="profile-class" key={group.id}>
                      <GraduationCap size={22} />
                      <div>
                        <strong>{group.name}</strong>
                        <small>{group.teacher.name}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="Hali sinfga biriktirilmagansiz"
                    description="Administrator sinfga qo‘shganda shu yerda ko‘rinadi."
                  />
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
                        {group._count.students} o‘quvchi · {group.grade}-sinf
                      </small>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState title="Hali sinf biriktirilmagan" />
              )}
            </Card>
          )}
          <Card className="profile-security">
            <ShieldCheck size={27} />
            <h3>Hisobingiz himoyalangan</h3>
            <p>
              Parol va sessiya ma’lumotlari profil sahifasida ko‘rsatilmaydi. Foydalanib bo‘lgach,
              umumiy qurilmada hisobdan chiqing.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
