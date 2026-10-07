import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, BookOpen, Check, Eye, EyeOff, Sparkles } from 'lucide-react';
import { homeFor, useAuth } from '../lib/auth';
import { errorText } from '../lib/api';
import { Button } from '../components/ui';
import { Logo } from '../components/shell';

const loginSchema = z.object({
  email: z.email('Email manzilini to‘g‘ri kiriting.'),
  password: z.string().min(10, 'Parol kamida 10 ta belgidan iborat.').max(128),
});
const authSchema = loginSchema.extend({
  name: z.string().trim().min(2, 'Ismingizni kiriting.').max(80).optional(),
  grade: z.number().int().min(5).max(7).optional(),
});
type AuthFields = z.infer<typeof authSchema>;
export default function AuthPage({ register = false }: { register?: boolean }) {
  const { user, signIn } = useAuth();
  const location = useLocation();
  const [notice] = useState(
    () =>
      (location.state as { message?: string } | null)?.message ||
      sessionStorage.getItem('oyla-auth-notice'),
  );
  useEffect(() => {
    sessionStorage.removeItem('oyla-auth-notice');
  }, []);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const schema = authSchema.superRefine((data, context) => {
    if (register && !data.name)
      context.addIssue({ code: 'custom', path: ['name'], message: 'Ismingizni kiriting.' });
    if (register && !data.grade)
      context.addIssue({ code: 'custom', path: ['grade'], message: 'Sinfingizni tanlang.' });
  });
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFields>({ resolver: zodResolver(schema), defaultValues: { grade: 6 } });
  if (user) return <Navigate to={homeFor(user)} replace />;
  const submit = handleSubmit(async (data) => {
    setError('');
    try {
      await signIn(register ? data : { email: data.email, password: data.password }, register);
    } catch (e) {
      setError(errorText(e));
    }
  });
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Logo />
        <div className="auth-story-content">
          <span className="auth-kicker">
            <Sparkles size={16} />
            BILIMGA QIZIQISH SHU YERDAN BOSHLANADI
          </span>
          <h1>
            Katta g‘oyalar
            <br />
            kichik <em>qadamlardan.</em>
          </h1>
          <p>
            O‘rganing, o‘zingizni sinang va har kuni bir qadam oldinga yuring. Kelajagingizni bugun
            yarating.
          </p>
          <div className="learning-illustration" aria-hidden="true">
            <div className="illustration-orbit orbit-one" />
            <div className="illustration-orbit orbit-two" />
            <div className="illustration-core">
              <BookOpen size={58} />
            </div>
            <div className="floating-label label-one">
              <Check size={18} />
              Yangi bilim
            </div>
            <div className="floating-label label-two">
              <Sparkles size={18} />
              Yangi imkoniyat
            </div>
            <span className="illustration-plus plus-one">+</span>
            <span className="illustration-plus plus-two">+</span>
          </div>
          <div className="auth-subjects">
            <span>01 Matematika</span>
            <span>02 Ingliz tili</span>
            <span>03 Informatika</span>
          </div>
        </div>
        <small>OYLA — O‘rgan. O‘yla. Yarat.</small>
      </section>
      <section className="auth-form-side">
        <div className="auth-form">
          <span className="eyebrow">SIZNING YANGI BOSHLANISHINGIZ</span>
          <h2>{register ? 'OYLAga xush kelibsiz!' : 'Yana ko‘rishganimizdan xursandmiz.'}</h2>
          <p>
            {register
              ? 'Bilim sayohatingiz uchun hisob yarating.'
              : 'Bilim sayohatingizni davom ettirish uchun kiring.'}
          </p>
          <form onSubmit={submit} noValidate>
            {register && (
              <>
                <label>
                  Ismingiz
                  <input
                    autoComplete="name"
                    placeholder="Ism va familiya"
                    {...field('name')}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <small className="field-error">{errors.name.message}</small>}
                </label>
                <label>
                  Sinfingiz
                  <select {...field('grade', { valueAsNumber: true })}>
                    {[5, 6, 7].map((n) => (
                      <option value={n} key={n}>
                        {n}-sinf
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label>
              Email manzilingiz
              <input
                type="email"
                autoComplete="email"
                placeholder="siz@example.uz"
                {...field('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && <small className="field-error">{errors.email.message}</small>}
            </label>
            <label>
              Parolingiz
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder="Kamida 10 ta belgi"
                  {...field('password')}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <small className="field-error">{errors.password.message}</small>}
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <Button className="full-width" type="submit" busy={isSubmitting}>
              {register ? 'Hisob yaratish' : 'Tizimga kirish'}
              <ArrowRight size={18} />
            </Button>
          </form>
          <p className="auth-switch">
            {register ? 'Hisobingiz bormi?' : 'Hali hisobingiz yo‘qmi?'}{' '}
            <Link to={register ? '/login' : '/register'}>
              {register ? 'Kirish' : 'Ro‘yxatdan o‘tish'}
            </Link>
          </p>
          {!register && (
            <p className="auth-switch">
              <Link to="/forgot-password">Parolni unutdingizmi?</Link>
            </p>
          )}
          {notice && (
            <p className="profile-success" role="status">
              {notice}
            </p>
          )}
          <div className="auth-trust">
            <Check size={15} />
            Bilimingiz va natijalaringiz xavfsiz saqlanadi.
          </div>
        </div>
      </section>
    </div>
  );
}
