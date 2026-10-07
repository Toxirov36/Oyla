import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, clearSession, errorText } from '../lib/api';
import { Button, Card } from './ui';

export const newPasswordSchema = z
  .string()
  .min(10, 'Parol kamida 10 ta belgidan iborat bo‘lsin.')
  .max(128, 'Parol 128 ta belgidan oshmasin.');
const schema = z
  .object({
    currentPassword: z.string().min(1, 'Hozirgi parolni kiriting.').max(128),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Parollar bir xil bo‘lsin.',
  });
export function ChangePasswordForm() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setError('');
    try {
      await api('/users/me/password', { method: 'POST', body: { currentPassword, newPassword } });
      clearSession('Parolingiz o‘zgartirildi. Yangi parol bilan tizimga kiring.');
      navigate('/login', {
        replace: true,
        state: { message: 'Parolingiz o‘zgartirildi. Yangi parol bilan tizimga kiring.' },
      });
    } catch (e) {
      setError(errorText(e));
    }
  });
  return (
    <Card className="profile-details">
      <h2>Parolni almashtirish</h2>
      <p className="card-subtitle">
        Parol yangilanganda barcha qurilmalarda qayta kirish talab etiladi.
      </p>
      <form className="profile-form" onSubmit={submit} noValidate>
        <label htmlFor="current-password">Hozirgi parol</label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          {...register('currentPassword')}
          aria-invalid={!!errors.currentPassword}
        />
        {errors.currentPassword && (
          <small className="field-error" role="alert">
            {errors.currentPassword.message}
          </small>
        )}
        <label htmlFor="new-password">Yangi parol</label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
          aria-invalid={!!errors.newPassword}
        />
        {errors.newPassword && (
          <small className="field-error" role="alert">
            {errors.newPassword.message}
          </small>
        )}
        <label htmlFor="confirm-password">Yangi parolni takrorlang</label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          aria-invalid={!!errors.confirmPassword}
        />
        {errors.confirmPassword && (
          <small className="field-error" role="alert">
            {errors.confirmPassword.message}
          </small>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="profile-save">
          <Button type="submit" busy={isSubmitting}>
            Parolni yangilash
          </Button>
        </div>
      </form>
    </Card>
  );
}
