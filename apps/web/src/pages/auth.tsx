import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, BookOpen, Check, Eye, EyeOff, Sparkles } from 'lucide-react';
import { homeFor, useAuth } from '../lib/auth';
import { errorText } from '../lib/api';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui';
import { Logo } from '../components/shell';
import { LanguageSwitcher } from '../components/language-switcher';
import { useI18n } from '../i18n';

const loginSchema = z.object({
  email: z.email('validation.email'),
  password: z.string().min(10, 'validation.passwordMin').max(128, 'validation.passwordMax'),
});
const authSchema = loginSchema.extend({
  name: z.string().trim().min(2, 'validation.name').max(80, 'validation.nameMax').optional(),
  grade: z.number().int().min(5, 'validation.grade').max(7, 'validation.grade').optional(),
});
type AuthFields = z.infer<typeof authSchema>;
const googleMessages: Record<string, string> = {
  signup: 'auth.googleSignupRequired',
  failed: 'auth.googleFailed',
  cancelled: 'auth.googleCancelled',
  unavailable: 'auth.googleUnavailable',
};
export default function AuthPage({ register = false }: { register?: boolean }) {
  const { t } = useI18n();
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
  const [error, setError] = useState<unknown>(null);
  const schema = authSchema.superRefine((data, context) => {
    if (register && !data.name)
      context.addIssue({ code: 'custom', path: ['name'], message: 'validation.name' });
    if (register && !data.grade)
      context.addIssue({ code: 'custom', path: ['grade'], message: 'validation.grade' });
  });
  const {
    register: field,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AuthFields>({ resolver: zodResolver(schema), defaultValues: { grade: 6 } });
  useEffect(() => {
    field('grade');
  }, [field]);
  const currentGrade = watch('grade') ?? 6;
  const requestedPath = (location.state as { returnTo?: string } | null)?.returnTo;
  const [searchParams] = useSearchParams();
  const googleStatus = searchParams.get('google');
  useEffect(() => {
    if (googleStatus && googleMessages[googleStatus])
      setError(new Error(t(googleMessages[googleStatus])));
  }, [googleStatus, t]);
  const returnTo =
    requestedPath?.startsWith('/') &&
    !requestedPath.startsWith('//') &&
    !/[\\\r\n]/.test(requestedPath)
      ? requestedPath
      : null;
  if (user) return <Navigate to={returnTo || homeFor(user)} replace />;
  const submit = handleSubmit(async (data) => {
    setError('');
    try {
      await signIn(register ? data : { email: data.email, password: data.password }, register);
    } catch (e) {
      setError(e);
    }
  });
  const startGoogle = () => {
    const params = new URLSearchParams({ flow: register ? 'register' : 'login' });
    if (register) params.set('grade', String(getValues('grade') || 6));
    window.location.assign(`/api/v1/auth/google/start?${params.toString()}`);
  };
  return (
    <div className="auth-page">
      <div className="auth-language">
        <LanguageSwitcher />
      </div>
      <section className="auth-story">
        <Logo />
        <div className="auth-story-content">
          <span className="auth-kicker">
            <Sparkles size={16} />
            {t('auth.kicker')}
          </span>
          <h1>
            {t('auth.storyTitle')}
            <br />
            {t('auth.storyLead')} <em>{t('auth.storyEmphasis')}</em>
          </h1>
          <p>{t('auth.storyDescription')}</p>
          <div className="learning-illustration" aria-hidden="true">
            <div className="illustration-orbit orbit-one" />
            <div className="illustration-orbit orbit-two" />
            <div className="illustration-core">
              <BookOpen size={58} />
            </div>
            <div className="floating-label label-one">
              <Check size={18} />
              {t('auth.newKnowledge')}
            </div>
            <div className="floating-label label-two">
              <Sparkles size={18} />
              {t('auth.newOpportunity')}
            </div>
            <span className="illustration-plus plus-one">+</span>
            <span className="illustration-plus plus-two">+</span>
          </div>
          {register && (
            <div className="auth-subjects">
              <span>01 {t('subject.mathematics')}</span>
              <span>02 {t('subject.english')}</span>
              <span>03 {t('subject.informatics')}</span>
            </div>
          )}
        </div>
        {register && (
          <small>
            {brand.name} — {t('brand.tagline')}
          </small>
        )}
      </section>
      <section className="auth-form-side">
        <div className="auth-form">
          <span className="eyebrow">{t('auth.eyebrow')}</span>
          <h2>{register ? t('auth.welcome', { brand: brand.name }) : t('auth.welcomeBack')}</h2>
          <p>{register ? t('auth.registerDescription') : t('auth.loginDescription')}</p>
          <form onSubmit={submit} noValidate>
            {register && (
              <>
                <label>
                  {t('auth.name')}
                  <input
                    autoComplete="name"
                    placeholder={t('auth.namePlaceholder')}
                    {...field('name')}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <small className="field-error">{t(errors.name.message!)}</small>}
                </label>
                <label>
                  {t('auth.grade')}
                  <Select
                    value={String(currentGrade)}
                    onValueChange={(val) => {
                      setValue('grade', Number(val), { shouldValidate: true, shouldDirty: true });
                    }}
                  >
                    <SelectTrigger
                      aria-label={t('auth.grade')}
                      aria-invalid={!!errors.grade}
                    >
                      <SelectValue placeholder={t('common.grade', { grade: currentGrade })}>
                        {t('common.grade', { grade: currentGrade })}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {[5, 6, 7].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {t('common.grade', { grade: n })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.grade && (
                    <small className="field-error">{t(errors.grade.message!)}</small>
                  )}
                </label>
              </>
            )}
            <label>
              {t('auth.email')}
              <input
                type="email"
                autoComplete="email"
                placeholder="siz@example.uz"
                {...field('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && <small className="field-error">{t(errors.email.message!)}</small>}
            </label>
            <label>
              {t('auth.password')}
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder={t('auth.passwordPlaceholder')}
                  {...field('password')}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <small className="field-error">{t(errors.password.message!)}</small>
              )}
            </label>
            <Button className="full-width" type="submit" busy={isSubmitting}>
              {t(register ? 'auth.createAccount' : 'auth.signIn')}
              <ArrowRight size={18} />
            </Button>
          </form>
          <div className="auth-divider"><span>{t('auth.or')}</span></div>
          <button className="google-auth-button" type="button" onClick={startGoogle}>
            <span className="google-auth-mark" aria-hidden="true">G</span>
            {t('auth.googleContinue')}
          </button>
          {!!error && (
            <div className="form-error google-auth-error" role="alert">
              {errorText(error)}
            </div>
          )}
          <p className="auth-switch">
            {t(register ? 'auth.haveAccount' : 'auth.noAccount')}{' '}
            <Link to={register ? '/login' : '/register'} state={location.state}>
              {t(register ? 'auth.signInLink' : 'auth.signUp')}
            </Link>
          </p>
          {!register && (
            <p className="auth-switch">
              <Link to="/forgot-password">{t('auth.forgotPassword')}</Link>
            </p>
          )}
          {notice && (
            <p className="profile-success" role="status">
              {t(notice)}
            </p>
          )}
          {register && (
            <div className="auth-trust">
              <Check size={15} />
              {t('auth.trust')}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
import { brand } from '../lib/brand';
