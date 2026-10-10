import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
        <div className="password-field">
          <input
            id="current-password"
            type={showCurrent ? 'text' : 'password'}
            autoComplete="current-password"
            {...register('currentPassword')}
            aria-invalid={!!errors.currentPassword}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            aria-label={t(showCurrent ? 'auth.hidePassword' : 'auth.showPassword')}
            title={t(showCurrent ? 'auth.hidePassword' : 'auth.showPassword')}
          >
            {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.currentPassword && (
          <small className="field-error" role="alert">
            {t(errors.currentPassword.message!)}
          </small>
        )}
        <label htmlFor="new-password">{t('password.new')}</label>
        <div className="password-field">
          <input
            id="new-password"
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            {...register('newPassword')}
            aria-invalid={!!errors.newPassword}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            aria-label={t(showNew ? 'auth.hidePassword' : 'auth.showPassword')}
            title={t(showNew ? 'auth.hidePassword' : 'auth.showPassword')}
          >
            {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.newPassword && (
          <small className="field-error" role="alert">
            {t(errors.newPassword.message!)}
          </small>
        )}
        <label htmlFor="confirm-password">{t('password.confirm')}</label>
        <div className="password-field">
          <input
            id="confirm-password"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            {...register('confirmPassword')}
            aria-invalid={!!errors.confirmPassword}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            aria-label={t(showConfirm ? 'auth.hidePassword' : 'auth.showPassword')}
            title={t(showConfirm ? 'auth.hidePassword' : 'auth.showPassword')}
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
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
