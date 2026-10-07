import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { User } from '../../lib/types';
import { api, errorText } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Button } from '../../components/ui';
import { grades, roles } from './config';
import { ComboboxField } from '../../components/combobox-field';

export function UserEditor({ user, close }: { user?: User; close: () => void }) {
  const { user: actor } = useAuth();
  const cache = useQueryClient();
  const [error, setError] = useState('');
  const schema = z
    .object({
      name: z.string().trim().min(2, 'Ism kamida 2 ta belgidan iborat bo‘lsin.').max(80),
      email: z.email('Emailni to‘g‘ri kiriting.'),
      role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
      grade: z.enum(['5', '6', '7']),
      teacherAccess: z.boolean(),
      active: z.boolean(),
      password: z.string().max(128).optional(),
    })
    .superRefine((value, context) => {
      if (!user && (!value.password || value.password.length < 10))
        context.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'Parol kamida 10 ta belgidan iborat bo‘lsin.',
        });
    });
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      role: user?.role || 'STUDENT',
      grade: String(user?.student?.grade || 6) as '5' | '6' | '7',
      teacherAccess: !!user?.teacherAccess,
      active: user?.active ?? true,
      password: '',
    },
  });
  const role = watch('role');
  const submit = handleSubmit(async (values) => {
    setError('');
    const body = {
      name: values.name,
      email: values.email,
      role: values.role,
      ...(role === 'STUDENT' ? { grade: Number(values.grade) } : {}),
      ...(role === 'ADMIN' ? { teacherAccess: values.teacherAccess } : {}),
      ...(user ? { active: values.active } : { password: values.password }),
    };
    try {
      await api(`/admin/users${user ? `/${user.id}` : ''}`, {
        method: user ? 'PATCH' : 'POST',
        body,
      });
      close();
      await cache.invalidateQueries();
    } catch (e) {
      setError(errorText(e));
    }
  });
  return (
    <form className="editor-form" onSubmit={submit} noValidate>
      <label>
        Ism va familiya
        <input autoComplete="name" {...register('name')} aria-invalid={!!errors.name} />
        {errors.name && (
          <small className="field-error" role="alert">
            {errors.name.message}
          </small>
        )}
      </label>
      <label>
        Email
        <input
          type="email"
          autoComplete="email"
          {...register('email')}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <small className="field-error" role="alert">
            {errors.email.message}
          </small>
        )}
      </label>
      <label htmlFor="admin-user-role">Rol</label>
      {user && user.id === actor?.id ? (
        <>
          <input
            id="admin-user-role"
            value={roles.find((item) => item.value === user.role)?.label || ''}
            readOnly
          />
          <input type="hidden" {...register('role')} />
        </>
      ) : (
        <Controller
          name="role"
          control={control}
          render={({ field, fieldState }) => (
            <ComboboxField
              id="admin-user-role"
              options={roles}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              name={field.name}
              label="Rol"
              invalid={fieldState.invalid}
            />
          )}
        />
      )}
      {user && (
        <p className="field-help">
          Rol o‘zgarganda foydalanuvchi qayta kiradi. O‘quv tarixi saqlanadi; o‘quvchi roli olib
          tashlansa sinf a’zoligi tugaydi.
        </p>
      )}
      {role === 'STUDENT' && (
        <label>
          O‘quvchi sinfi
          <Controller
            name="grade"
            control={control}
            render={({ field, fieldState }) => (
              <ComboboxField
                options={grades}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                name={field.name}
                label="O‘quvchi sinfi"
                invalid={fieldState.invalid}
              />
            )}
          />
        </label>
      )}
      {role === 'ADMIN' && (
        <label className="checkbox-field">
          <input type="checkbox" {...register('teacherAccess')} />
          O‘qituvchi paneli ham ochilsin
        </label>
      )}
      {user ? (
        <label className="checkbox-field">
          <input type="checkbox" {...register('active')} />
          Hisob faol
        </label>
      ) : (
        <label>
          Boshlang‘ich parol
          <input
            type="password"
            autoComplete="new-password"
            {...register('password')}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <small className="field-error" role="alert">
              {errors.password.message}
            </small>
          )}
        </label>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={close}>
          Bekor qilish
        </Button>
        <Button type="submit" busy={isSubmitting}>
          Saqlash
        </Button>
      </div>
    </form>
  );
}
