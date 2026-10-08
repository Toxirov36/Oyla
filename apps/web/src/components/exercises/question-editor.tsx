import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, errorText } from '../../lib/api';
import type { AdminQuestion } from '../../lib/types';
import {
  exerciseLabels,
  type ExerciseConfig,
  type ExerciseGrading,
  type ExerciseType,
} from '../../lib/exercises';
import { ComboboxField } from '../combobox-field';
import { Button } from '../ui';
import { exampleQuestion, ExercisePreview, type PreviewDefinition } from './exercise-preview';

const pairTypes = ['MATCH_PAIRS', 'DRAG_DROP', 'CONNECT_CONCEPT', 'MEMORY_CARDS'];
const pointTypes = ['DRAW', 'GEOMETRY', 'INTERACTIVE_IMAGE'];
const lines = (s: string) =>
  s
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean);
function fromDefinition(q: PreviewDefinition) {
  const c = q.config ?? {};
  const g = q.grading ?? {};
  let answer = q.answer;
  if (pairTypes.includes(q.type))
    answer =
      g.pairs
        ?.map(
          (p) =>
            `${(c.items?.findIndex((i) => i.id === p.left) ?? -1) + 1}:${(c.targets?.findIndex((i) => i.id === p.right) ?? -1) + 1}`,
        )
        .join('\n') ?? '';
  else if (q.type === 'SORT_ORDER' || q.type === 'FIND_MISTAKE')
    answer =
      g.values?.map((id) => (c.items?.findIndex((i) => i.id === id) ?? -1) + 1).join(', ') ?? '';
  else if (q.type === 'FILL_GAP') answer = g.values?.join('\n') ?? '';
  else if (pointTypes.includes(q.type))
    answer = g.points?.map((p) => `${p.x}, ${p.y}`).join('\n') ?? '';
  else if (g.text) answer = g.text;
  return {
    text: q.text,
    answer: answer ?? '',
    explanation: q.explanation,
    items: c.items?.map((i) => i.text).join('\n') ?? '',
    targets: c.targets?.map((i) => i.text).join('\n') ?? '',
    slots: c.slots?.map((i) => i.text).join('\n') ?? '',
    code: c.code ?? '',
    audioText: c.audioText ?? '',
    audioUrl: c.audioUrl ?? '',
    language: c.language ?? 'en-US',
    imageUrl: c.imageUrl ?? '',
    imageAlt: c.imageAlt ?? '',
    markers: c.markers?.map((p) => `${p.x}, ${p.y}`).join('\n') ?? '',
    radius: String(g.radius ?? 5),
    optionsText: q.options.map((o) => o.text).join('\n'),
  };
}
export function QuestionEditor({
  question,
  lessonId,
  lessons,
  close,
}: {
  question?: AdminQuestion;
  lessonId?: string;
  lessons: { id: string; title: string }[];
  close: () => void;
}) {
  const cache = useQueryClient();
  const [type, setType] = useState<ExerciseType>(question?.type ?? 'MULTIPLE_CHOICE');
  const [fields, setFields] = useState(() =>
    fromDefinition(
      question
        ? {
            ...question,
            config: question.config ?? undefined,
            grading: question.grading ?? undefined,
          }
        : exampleQuestion('MULTIPLE_CHOICE'),
    ),
  );
  const [selectedLesson, setSelectedLesson] = useState(
    question?.lessonId ?? lessonId ?? lessons[0]?.id ?? '',
  );
  const [status, setStatus] = useState(question?.status ?? 'DRAFT');
  const [difficulty, setDifficulty] = useState(question?.difficulty ?? 'MEDIUM');
  const [position, setPosition] = useState(question?.position ?? 0);
  const [hint, setHint] = useState(question?.hint ?? '');
  const [xp, setXp] = useState(question?.xp?.toString() ?? '');
  const [tolerance, setTolerance] = useState(question?.tolerance ?? 0.0001);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<PreviewDefinition | null>(null);
  const set = (key: keyof typeof fields, value: string) => {
    setFields((f) => ({ ...f, [key]: value }));
    setPreview(null);
  };
  const make = (): PreviewDefinition => {
    const c: ExerciseConfig = {};
    const g: ExerciseGrading = {};
    const parsePoints = (text: string) =>
      lines(text).map((row) => {
        const [x, y] = row.split(',').map(Number);
        if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y))
          throw Error('Koordinatalarni x, y shaklida yozing.');
        return { x, y };
      });
    if (pairTypes.includes(type) || ['SORT_ORDER', 'FIND_MISTAKE'].includes(type))
      c.items = lines(fields.items).map((text, i) => ({ id: `i${i + 1}`, text }));
    if (pairTypes.includes(type)) {
      c.targets = lines(fields.targets).map((text, i) => ({ id: `t${i + 1}`, text }));
      g.pairs = lines(fields.answer).map((row) => {
        const [l, r] = row.split(':').map((v) => Number(v.trim()));
        return { left: `i${l}`, right: `t${r}` };
      });
    }
    if (type === 'SORT_ORDER' || type === 'FIND_MISTAKE')
      g.values = fields.answer.split(',').map((v) => `i${Number(v.trim())}`);
    if (type === 'FILL_GAP') {
      c.slots = lines(fields.slots).map((text, i) => ({ id: `s${i + 1}`, text }));
      g.values = lines(fields.answer);
    }
    if (['CODE_COMPLETION', 'DEBUG_CODE'].includes(type)) c.code = fields.code;
    if (['LISTEN_ANSWER', 'SPEAK'].includes(type)) {
      c.audioText = fields.audioText;
      c.language = fields.language;
      if (fields.audioUrl) c.audioUrl = fields.audioUrl;
    }
    if (['CODE_COMPLETION', 'DEBUG_CODE', 'LISTEN_ANSWER', 'SPEAK'].includes(type))
      g.text = fields.answer;
    if (pointTypes.includes(type)) {
      g.points = parsePoints(fields.answer);
      g.radius = Number(fields.radius);
      if (fields.markers) c.markers = parsePoints(fields.markers);
    }
    if (type === 'INTERACTIVE_IMAGE') {
      c.imageUrl = fields.imageUrl;
      c.imageAlt = fields.imageAlt;
    }
    const structured = Object.keys(g).length > 0;
    return {
      lessonId: selectedLesson,
      type,
      text: fields.text,
      answer: structured ? 'structured' : fields.answer,
      explanation: fields.explanation,
      options:
        type === 'MULTIPLE_CHOICE'
          ? lines(fields.optionsText).map((text) => ({
              text,
              value: question?.options.find((o) => o.text === text)?.value ?? text,
            }))
          : [],
      tolerance,
      config: structured ? c : undefined,
      grading: structured ? g : undefined,
    };
  };
  const field = (key: keyof typeof fields, label: string, help?: string, rows = 3) => (
    <label>
      {label}
      <textarea
        rows={rows}
        value={fields[key]}
        onChange={(e) => set(key, e.target.value)}
        maxLength={key === 'code' || key === 'explanation' || key === 'text' ? 5000 : 2000}
      />
      {help && <small className="field-help">{help}</small>}
    </label>
  );
  const pairing = pairTypes.includes(type);
  const spatial = pointTypes.includes(type);
  return (
    <form
      className="exercise-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
          const body = {
            ...make(),
            status,
            difficulty,
            position,
            hint,
            ...(xp !== '' ? { xp: Number(xp) } : {}),
          };
          await api(`/admin/questions${question ? `/${question.id}` : ''}`, {
            method: question ? 'PATCH' : 'POST',
            body,
          });
          await cache.invalidateQueries();
          close();
        } catch (err) {
          setError(errorText(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Link to="/admin/exercises" onClick={close} className="back-link">
        Mashqlar katalogini ochish →
      </Link>
      <label>
        Dars
        <ComboboxField
          label="Dars"
          value={selectedLesson}
          options={lessons.map((l) => ({ value: l.id, label: l.title }))}
          onChange={setSelectedLesson}
        />
      </label>
      <label>
        Savol turi
        <ComboboxField
          label="Savol turi"
          value={type}
          options={Object.entries(exerciseLabels).map(([value, label]) => ({ value, label }))}
          onChange={(v) => {
            setType(v as ExerciseType);
            setFields(fromDefinition(exampleQuestion(v as ExerciseType)));
            setPreview(null);
          }}
        />
        <small className="field-help">
          Tur o‘zgarsa, tahrirlash uchun boshlang‘ich namuna qo‘yiladi.
        </small>
      </label>
      {field('text', 'Savol matni')}
      {type === 'MULTIPLE_CHOICE' &&
        field('optionsText', 'Variantlar', 'Har qatorda bittadan variant, 2–8 ta.')}
      {(pairing || ['SORT_ORDER', 'FIND_MISTAKE'].includes(type)) &&
        field(
          'items',
          'Elementlar',
          'Har qatorda bitta element. Qator raqami javobni belgilashda ishlatiladi.',
        )}
      {pairing && field('targets', 'Mos keladigan elementlar', 'Har qatorda bitta element.')}
      {type === 'FILL_GAP' &&
        field('slots', 'Bo‘shliqlar', 'Har qatorda bo‘shliqning nomi yoki unga ko‘rsatma.')}
      {['CODE_COMPLETION', 'DEBUG_CODE'].includes(type) &&
        field('code', 'Kod namunasi', 'Kodni bajarish talab qilinmaydi.', 6)}
      {['LISTEN_ANSWER', 'SPEAK'].includes(type) && (
        <>
          {field('audioText', 'Ovozli namuna matni')}
          {field(
            'audioUrl',
            'Audio fayl manzili (ixtiyoriy)',
            'HTTPS havola yoki / bilan boshlanadigan mahalliy fayl. Audio bo‘lmasa matn ovozli o‘qiladi.',
            2,
          )}
          <label>
            Til
            <ComboboxField
              label="Til"
              value={fields.language}
              options={[
                { value: 'en-US', label: 'Inglizcha (US)' },
                { value: 'en-GB', label: 'Inglizcha (UK)' },
                { value: 'uz-UZ', label: 'O‘zbekcha' },
              ]}
              onChange={(v) => set('language', v)}
            />
          </label>
        </>
      )}
      {type === 'INTERACTIVE_IMAGE' && (
        <>
          {field('imageUrl', 'Rasm manzili', undefined, 2)}
          {field('imageAlt', 'Rasm tavsifi', undefined, 2)}
        </>
      )}
      {spatial && (
        <>
          {field(
            'markers',
            'Ko‘rsatiladigan nuqtalar (ixtiyoriy)',
            'Har qatorda x, y. 0–100 foizli koordinata; Y yuqoridan pastga o‘sadi.',
            2,
          )}
          <label>
            Ruxsat etilgan og‘ish (%)
            <input
              type="number"
              min=".5"
              max="15"
              step=".5"
              value={fields.radius}
              onChange={(e) => set('radius', e.target.value)}
            />
          </label>
        </>
      )}
      {field(
        'answer',
        'To‘g‘ri javob',
        pairing
          ? 'Juftliklar: chap qator raqami:o‘ng qator raqami. Masalan 1:2. Har juftlik alohida qatorda.'
          : type === 'SORT_ORDER'
            ? 'Qator raqamlarini kerakli tartibda yozing: 2, 4, 1, 3.'
            : type === 'FIND_MISTAKE'
              ? 'Xato elementning qator raqami.'
              : type === 'FILL_GAP'
                ? 'Har bo‘shliq javobi alohida qatorda. Muqobillarni | bilan ajrating.'
                : spatial
                  ? 'Har nuqta alohida qatorda: x, y (0–100). Chiziq uchun ikkita nuqta.'
                  : type === 'TRUE_FALSE'
                    ? 'true yoki false.'
                    : 'Qabul qilinadigan muqobillarni | bilan ajrating.',
      )}
      {field('explanation', 'Javob izohi')}
      <label>
        Maslahat
        <input value={hint} maxLength={2000} onChange={(e) => setHint(e.target.value)} />
      </label>
      <label>
        Murakkablik
        <ComboboxField
          label="Murakkablik"
          value={difficulty}
          options={[
            { value: 'EASY', label: 'Oson' },
            { value: 'MEDIUM', label: 'O‘rta' },
            { value: 'HARD', label: 'Murakkab' },
          ]}
          onChange={(v) => setDifficulty(v as typeof difficulty)}
        />
      </label>
      <label>
        Holat
        <ComboboxField
          label="Holat"
          value={status}
          options={[
            { value: 'DRAFT', label: 'Qoralama' },
            { value: 'PUBLISHED', label: 'Chop etilgan' },
            { value: 'ARCHIVED', label: 'Arxiv' },
          ]}
          onChange={(v) => setStatus(v as typeof status)}
        />
      </label>
      <label>
        Tartib raqami
        <input
          type="number"
          min="0"
          max="10000"
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
        />
      </label>
      <label>
        Savol uchun XP (ixtiyoriy)
        <input
          type="number"
          min="0"
          max="1000"
          value={xp}
          onChange={(e) => setXp(e.target.value)}
        />
      </label>
      {type === 'NUMERICAL' && (
        <label>
          Sonli javob xatolik chegarasi
          <input
            type="number"
            min="0"
            max="100"
            step="any"
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
          />
        </label>
      )}
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          try {
            setPreview(make());
            setError('');
          } catch (e) {
            setError(errorText(e));
          }
        }}
      >
        O‘quvchi ko‘rinishida sinash
      </Button>
      {preview && <ExercisePreview key={JSON.stringify(preview)} definition={preview} />}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={close}>
          Bekor qilish
        </Button>
        <Button type="submit" busy={busy}>
          Saqlash
        </Button>
      </div>
    </form>
  );
}
