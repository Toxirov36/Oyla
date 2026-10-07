import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, clearSession, errorText } from '../lib/api';
import { Button, Card } from '../components/ui';
import { Logo } from '../components/shell';
import { newPasswordSchema } from '../components/change-password';

const requestSchema = z.object({ email: z.email('Email manzilini to‘g‘ri kiriting.') });
const resetSchema = z
  .object({ newPassword: newPasswordSchema, confirmPassword: z.string() })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Parollar bir xil bo‘lsin.',
  });
export default function PasswordRecoveryPage({ reset = false }: { reset?: boolean }) {
  const navigate = useNavigate();
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') || '',
  );
  const [error, setError] = useState('');
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
      const response = await api<{ message: string }>('/auth/password-reset/request', {
        method: 'POST',
        body: values,
      });
      setMessage(response.message);
    } catch (e) {
      setError(errorText(e));
    }
  });
  const confirm = resetForm.handleSubmit(async ({ newPassword }) => {
    setError('');
    try {
      await api('/auth/password-reset/confirm', { method: 'POST', body: { token, newPassword } });
      clearSession('Parolingiz tiklandi. Yangi parol bilan tizimga kiring.');
      navigate('/login', {
        replace: true,
        state: { message: 'Parolingiz tiklandi. Yangi parol bilan tizimga kiring.' },
      });
    } catch (e) {
      setError(errorText(e));
    }
  });
  return (
    <main className="recovery-page">
      <Link to="/login" className="brand">
        <Logo />
      </Link>
      <Card>
        <span className="eyebrow">HISOBINGIZGA QAYTING</span>
        <h1>{reset ? 'Yangi parol yarating' : 'Parolni unutdingizmi?'}</h1>
        <p className="card-subtitle">
          {reset
            ? 'Yangi parol kamida 10 ta belgidan iborat bo‘lsin.'
            : 'Emailingizni kiriting. Administrator shaxsingizni tekshirib, bir martalik tiklash havolasini beradi.'}
        </p>
        {reset ? (
          token ? (
            <form className="profile-form" onSubmit={confirm} noValidate>
              <label htmlFor="reset-password">Yangi parol</label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                {...resetForm.register('newPassword')}
                aria-invalid={!!resetForm.formState.errors.newPassword}
              />
              {resetForm.formState.errors.newPassword && (
                <small className="field-error" role="alert">
                  {resetForm.formState.errors.newPassword.message}
                </small>
              )}
              <label htmlFor="reset-confirm">Yangi parolni takrorlang</label>
              <input
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                {...resetForm.register('confirmPassword')}
                aria-invalid={!!resetForm.formState.errors.confirmPassword}
              />
              {resetForm.formState.errors.confirmPassword && (
                <small className="field-error" role="alert">
                  {resetForm.formState.errors.confirmPassword.message}
                </small>
              )}
              <Button type="submit" busy={resetForm.formState.isSubmitting}>
                Parolni tiklash
              </Button>
            </form>
          ) : (
            <p className="form-error" role="alert">
              Tiklash havolasi mavjud emas. Administrator bergan havolani qayta oching.
            </p>
          )
        ) : message ? (
          <p role="status" className="profile-success">
            {message}
          </p>
        ) : (
          <form className="profile-form" onSubmit={request} noValidate>
            <label htmlFor="recovery-email">Email manzilingiz</label>
            <input
              id="recovery-email"
              type="email"
              autoComplete="email"
              {...requestForm.register('email')}
              aria-invalid={!!requestForm.formState.errors.email}
            />
            {requestForm.formState.errors.email && (
              <small className="field-error" role="alert">
                {requestForm.formState.errors.email.message}
              </small>
            )}
            <Button type="submit" busy={requestForm.formState.isSubmitting}>
              Tiklashni so‘rash
            </Button>
          </form>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p className="auth-switch">
          <Link to="/login">Tizimga kirishga qaytish</Link>
        </p>
      </Card>
    </main>
  );
}
