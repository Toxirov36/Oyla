import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, clearSession, errorText } from '../lib/api';
import { Button, Card } from './ui';
import { useI18n } from '../i18n';

export const newPasswordSchema = z
  .string()
  .min(10, 'validation.passwordMinForm')
  .max(128, 'validation.passwordMax');
const schema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'validation.currentPassword')
      .max(128, 'validation.passwordMax'),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'validation.passwordMatch',
  });
export function ChangePasswordForm() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setError('');
    try {
      await api('/users/me/password', { method: 'POST', body: { currentPassword, newPassword } });
      clearSession('password.changed');
      navigate('/login', {
        replace: true,
        state: { message: 'password.changed' },
      });
    } catch (e) {
      setError(e);
    }
  });
  return (
    <Card className="profile-details">
      <h2>{t('password.title')}</h2>
      <p className="card-subtitle">{t('password.description')}</p>
      <form className="profile-form" onSubmit={submit} noValidate>
        <label htmlFor="current-password">{t('password.current')}</label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          {...register('currentPassword')}
          aria-invalid={!!errors.currentPassword}
        />
        {errors.currentPassword && (
          <small className="field-error" role="alert">
            {t(errors.currentPassword.message!)}
          </small>
        )}
        <label htmlFor="new-password">{t('password.new')}</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
          aria-invalid={!!errors.newPassword}
        />
        {errors.newPassword && (
          <small className="field-error" role="alert">
            {t(errors.newPassword.message!)}
          </small>
        )}
        <label htmlFor="confirm-password">{t('password.confirm')}</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          aria-invalid={!!errors.confirmPassword}
        />
        {errors.confirmPassword && (
          <small className="field-error" role="alert">
            {t(errors.confirmPassword.message!)}
          </small>
        )}
        {!!error && (
          <p className="form-error" role="alert">
            {errorText(error)}
          </p>
        )}
        <div className="profile-save">
          <Button type="submit" busy={isSubmitting}>
            {t('password.update')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
