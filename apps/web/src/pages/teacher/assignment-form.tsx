import { localizeText } from '../../i18n';
import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, FileText, Upload, X } from 'lucide-react';
import { api, errorText } from '../../lib/api';
import { ComboboxField } from '../../components/combobox-field';
import type { Classroom, Subject } from '../../lib/types';
import { Button, ErrorState } from '../../components/ui';

const schema = z.object({
  classId: z.string().min(1, tx('pages.teacher.selectAClass')),
  lessonId: z.string().min(1, tx('pages.teacher.selectALesson')),
  title: z.string().trim().min(2, tx('pages.teacher.enterATitle')).max(100),
});
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssignmentForm({
  classes,
  close,
  initialClassId,
  initialLessonId,
}: {
  classes: Classroom[];
  close: () => void;
  initialClassId?: string;
  initialLessonId?: string;
}) {
  usePageLocale();
  const cache = useQueryClient();
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: File[]) => {
    if (files.length > 5) {
      setError(tx('pages.teacher.tooManyAssignmentFiles'));
      return;
    }
    if (files.some((file) => file.size > 15 * 1024 * 1024)) {
      setError(tx('pages.teacher.assignmentFileTooLarge'));
      return;
    }
    setError('');
    setSelectedFiles(files);
  };
  const content = useQuery({
    queryKey: ['teacher-content'],
    queryFn: () => api<Subject[]>('/subjects'),
  });
  const {
    register,
    control,
    setValue,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      classId: initialClassId || classes[0]?.id || '',
      lessonId: initialLessonId || '',
      title: '',
    },
  });
  const selectedClass = classes.find((c) => c.id === watch('classId'));
  const lessons =
    content.data?.flatMap((s) =>
      s.courses
        .filter((c) => c.grade === selectedClass?.grade)
        .flatMap((c) =>
          c.topics.flatMap((t) =>
            t.lessons.map((l) => ({
              ...l,
              label: `${localizeText(s.title)} / ${localizeText(t.title)} / ${localizeText(l.title)}`,
            })),
          ),
        ),
    ) || [];
  return (
    <form
      className="editor-form"
      onSubmit={handleSubmit(async (values) => {
        setError('');
        try {
          const body = new FormData();
          body.append('classId', values.classId);
          body.append('lessonId', values.lessonId);
          body.append('title', values.title);
          selectedFiles.forEach((file) => body.append('attachments', file));
          await api('/teacher/assignments', {
            method: 'POST',
            body,
          });
          await cache.invalidateQueries({ queryKey: ['teacher'] });
          close();
        } catch (e) {
          setError(errorText(e));
        }
      })}
    >
      <label>
        {tx('pages.admin.users.grade')}
        <Controller
          name="classId"
          control={control}
          render={({ field, fieldState }) => (
            <ComboboxField
              options={classes.map((c) => ({
                value: c.id,
                get label() {
                  return tx('pages.admin.classes.grade', { value1: c.name, value2: c.grade });
                },
              }))}
              value={field.value}
              onChange={(value) => {
                if (value !== field.value) setValue('lessonId', '', { shouldDirty: true });
                field.onChange(value);
              }}
              onBlur={field.onBlur}
              inputRef={field.ref}
              name={field.name}
              label={tx('pages.admin.users.grade')}
              invalid={fieldState.invalid}
            />
          )}
        />
        {errors.classId && (
          <small className="field-error" role="alert">
            {localizeText(errors.classId.message)}
          </small>
        )}
      </label>
      <label>
        {tx('pages.teacher.assignmentTitle')}
        <input
          placeholder={tx('pages.teacher.forExamplePracticingFractions')}
          {...register('title')}
        />
        {errors.title && (
          <small className="field-error">{localizeText(errors.title.message)}</small>
        )}
      </label>
      <label>
        {tx('pages.admin.content.lesson')}
        <Controller
          name="lessonId"
          control={control}
          render={({ field, fieldState }) => (
            <ComboboxField
              options={lessons.map((lesson) => ({ value: lesson.id, label: lesson.label }))}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              name={field.name}
              label={tx('pages.admin.content.lesson')}
              placeholder={tx('pages.teacher.selectOrSearchForALesson')}
              disabled={content.isPending || !selectedClass}
              invalid={fieldState.invalid}
            />
          )}
        />
        {errors.lessonId && (
          <small className="field-error">{localizeText(errors.lessonId.message)}</small>
        )}
      </label>
      {content.error && <ErrorState error={content.error} />}
      <p className="text-sm text-[var(--muted)]">{tx('pages.teacher.automaticDeadline')}</p>
      <div className="assignment-files-group">
        <label htmlFor="assignment-file-input">{tx('pages.teacher.assignmentFiles')}</label>
        <div
          role="button"
          tabIndex={0}
          className={`assignment-dropzone ${isDragging ? 'is-dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length) handleFiles(files);
          }}
          aria-label={tx('pages.teacher.chooseFiles')}
        >
          <input
            id="assignment-file-input"
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,image/jpeg,image/png,image/webp"
            className="assignment-file-hidden-input"
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files || []);
              event.currentTarget.value = '';
              if (files.length) handleFiles(files);
            }}
          />
          <div className="assignment-dropzone-icon">
            <Upload size={20} strokeWidth={2.2} />
          </div>
          <div className="assignment-dropzone-content">
            <span className="assignment-dropzone-title">{tx('pages.teacher.chooseFiles')}</span>
            <span className="assignment-dropzone-help">
              {tx('pages.teacher.assignmentFilesHelp')}
            </span>
          </div>
        </div>

        {!selectedFiles.length ? (
          <p className="assignment-files-status">{tx('pages.teacher.noFilesChosen')}</p>
        ) : (
          <ul className="assignment-file-selection">
            {selectedFiles.map((file, index) => (
              <li key={`${file.name}-${file.size}-${index}`}>
                <div className="assignment-file-item-info">
                  <FileText size={16} className="assignment-file-icon" />
                  <span className="assignment-file-name" title={file.name}>
                    {file.name}
                  </span>
                  <span className="assignment-file-size">{formatFileSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  className="assignment-file-remove"
                  aria-label={tx('pages.teacher.removeAssignmentFile', { value1: file.name })}
                  title={tx('pages.teacher.removeAssignmentFile', { value1: file.name })}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFiles((current) => current.filter((_, i) => i !== index));
                  }}
                >
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <div role="alert" className="form-error">
          {localizeText(error)}
        </div>
      )}
      <div className="modal-actions">
        <Button variant="secondary" type="button" onClick={close}>
          {tx('common.cancel')}
        </Button>
        <Button busy={isSubmitting} type="submit">
          {tx('pages.teacher.assignTask')}
          <ArrowRight size={17} />
        </Button>
      </div>
    </form>
  );
}
