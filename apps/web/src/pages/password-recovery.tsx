import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, clearSession, errorText } from '../lib/api';
import { Button, Card } from '../components/ui';
import { Logo } from '../components/shell';
import { newPasswordSchema } from '../components/change-password';
import { useI18n } from '../i18n';
import { LanguageSwitcher } from '../components/language-switcher';

const requestSchema = z.object({ email: z.email('validation.email') });
const resetSchema = z
  .object({ newPassword: newPasswordSchema, confirmPassword: z.string() })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'validation.passwordMatch',
  });
export default function PasswordRecoveryPage({ reset = false }: { reset?: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') || '',
  );
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState('');
  const requestForm = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' },
  });
  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });
  useEffect(() => {
    if (reset && window.location.hash)
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search,
      );
  }, [reset]);
  const request = requestForm.handleSubmit(async (values) => {
    setError('');
    try {
      await api('/auth/password-reset/request', {
        method: 'POST',
        body: values,
      });
      setMessage('errors.RECOVERY_REQUESTED');
    } catch (e) {
      setError(e);
    }
  });
  const confirm = resetForm.handleSubmit(async ({ newPassword }) => {
    setError('');
    try {
      await api('/auth/password-reset/confirm', { method: 'POST', body: { token, newPassword } });
      clearSession('password.restored');
      navigate('/login', {
        replace: true,
        state: { message: 'password.restored' },
      });
    } catch (e) {
      setError(e);
    }
  });
  return (
    <main className="recovery-page">
      <div className="recovery-language">
        <LanguageSwitcher />
      </div>
      <Link to="/login" className="brand">
        <Logo />
      </Link>
      <Card>
        <span className="eyebrow">{t('recovery.eyebrow')}</span>
        <h1>{t(reset ? 'recovery.newPassword' : 'auth.forgotPassword')}</h1>
        <p className="card-subtitle">
          {reset ? t('recovery.resetDescription') : t('recovery.requestDescription')}
        </p>
        {reset ? (
          token ? (
            <form className="profile-form" onSubmit={confirm} noValidate>
              <label htmlFor="reset-password">{t('password.new')}</label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                {...resetForm.register('newPassword')}
                aria-invalid={!!resetForm.formState.errors.newPassword}
              />
              {resetForm.formState.errors.newPassword && (
                <small className="field-error" role="alert">
                  {t(resetForm.formState.errors.newPassword.message!)}
                </small>
              )}
              <label htmlFor="reset-confirm">{t('password.confirm')}</label>
              <input
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                {...resetForm.register('confirmPassword')}
                aria-invalid={!!resetForm.formState.errors.confirmPassword}
              />
              {resetForm.formState.errors.confirmPassword && (
                <small className="field-error" role="alert">
                  {t(resetForm.formState.errors.confirmPassword.message!)}
                </small>
              )}
              <Button type="submit" busy={resetForm.formState.isSubmitting}>
                {t('recovery.reset')}
              </Button>
            </form>
          ) : (
            <p className="form-error" role="alert">
              {t('recovery.noToken')}
            </p>
          )
        ) : message ? (
          <p role="status" className="profile-success">
            {t(message)}
          </p>
        ) : (
          <form className="profile-form" onSubmit={request} noValidate>
            <label htmlFor="recovery-email">{t('auth.email')}</label>
            <input
              id="recovery-email"
              type="email"
              autoComplete="email"
              {...requestForm.register('email')}
              aria-invalid={!!requestForm.formState.errors.email}
            />
            {requestForm.formState.errors.email && (
              <small className="field-error" role="alert">
                {t(requestForm.formState.errors.email.message!)}
              </small>
            )}
            <Button type="submit" busy={requestForm.formState.isSubmitting}>
              {t('recovery.request')}
            </Button>
          </form>
        )}
        {!!error && (
          <p className="form-error" role="alert">
            {errorText(error)}
          </p>
        )}
        <p className="auth-switch">
          <Link to="/login">{t('recovery.back')}</Link>
        </p>
      </Card>
    </main>
  );
}
