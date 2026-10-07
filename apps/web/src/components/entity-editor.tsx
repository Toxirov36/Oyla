import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api, ApiError, errorText } from '../lib/api';
import { Button } from './ui';
import { ComboboxField } from './combobox-field';

export interface EditorField {
  key: string;
  label: string;
  kind?: 'number' | 'textarea' | 'select' | 'checkbox' | 'password' | 'email';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  optional?: boolean;
  help?: string;
  schema?: z.ZodType;
}
export interface EditorSpec {
  title: string;
  endpoint: string;
  fields: EditorField[];
  values?: Record<string, unknown>;
  id?: string;
  serialize?: (values: Record<string, unknown>) => unknown;
}
export function EntityEditor({ spec, close }: { spec: EditorSpec; close: () => void }) {
  const [error, setError] = useState('');
  const cache = useQueryClient();
  const defaults = Object.fromEntries(
    spec.fields.map((field) => [
      field.key,
      (field.kind === 'select' && spec.values?.[field.key] !== undefined
        ? String(spec.values[field.key])
        : spec.values?.[field.key]) ??
        (field.kind === 'checkbox'
          ? true
          : field.kind === 'number'
            ? field.optional
              ? undefined
              : (field.min ?? 0)
            : field.kind === 'select'
              ? field.options?.[0]?.value || ''
              : ''),
    ]),
  );
  const {
    register,
    control,
    handleSubmit,
    setError: fieldError,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, unknown>>({ defaultValues: defaults });
  const submit = handleSubmit(async (input) => {
    setError('');
    const shape: Record<string, z.ZodType> = {};
    for (const field of spec.fields) {
      let schema: z.ZodType =
        field.schema ||
        (field.kind === 'checkbox'
          ? z.boolean()
          : field.kind === 'number'
            ? z
                .number('Sonni kiriting.')
                .int()
                .min(field.min ?? 0)
                .max(field.max ?? 10000000)
            : z
                .string()
                .trim()
                .min(field.optional ? 0 : (field.min ?? 1), 'Bu maydonni to‘ldiring.')
                .max(field.max ?? 30000));
      if (field.optional) schema = schema.optional();
      shape[field.key] = schema;
    }
    const parsed = z.object(shape).safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        fieldError(String(issue.path[0]), { message: issue.message });
      return;
    }
    try {
      await api(`${spec.endpoint}${spec.id ? `/${spec.id}` : ''}`, {
        method: spec.id ? 'PATCH' : 'POST',
        body: spec.serialize ? spec.serialize(parsed.data) : parsed.data,
      });
      await cache.invalidateQueries();
      close();
    } catch (e) {
      setError(errorText(e));
      if (e instanceof ApiError)
        for (const field of e.fields)
          fieldError(field.field, { message: field.messages.join(' ') });
    }
  });
  return (
    <form className="editor-form" onSubmit={submit} noValidate>
      {spec.fields.map((field) => (
        <label key={field.key} className={field.kind === 'checkbox' ? 'checkbox-field' : ''}>
          {field.label}
          {field.kind === 'select' ? (
            <Controller
              name={field.key}
              control={control}
              render={({ field: input, fieldState }) => (
                <ComboboxField
                  options={field.options || []}
                  value={String(input.value ?? '')}
                  onChange={input.onChange}
                  onBlur={input.onBlur}
                  inputRef={input.ref}
                  name={input.name}
                  label={field.label}
                  invalid={fieldState.invalid}
                />
              )}
            />
          ) : field.kind === 'textarea' ? (
            <textarea
              rows={field.key === 'explanation' ? 7 : 4}
              {...register(field.key)}
              aria-invalid={!!errors[field.key]}
            />
          ) : (
            <input
              type={field.kind || 'text'}
              {...register(
                field.key,
                field.kind === 'number'
                  ? {
                      setValueAs: (value) =>
                        value === '' || value === undefined ? undefined : Number(value),
                    }
                  : {},
              )}
              aria-invalid={!!errors[field.key]}
            />
          )}{' '}
          {field.help && <small className="field-help">{field.help}</small>}
          {errors[field.key] && (
            <small className="field-error" role="alert">
              {String(errors[field.key]?.message)}
            </small>
          )}
        </label>
      ))}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
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
