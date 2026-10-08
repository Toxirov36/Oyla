import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CircleCheck, GripVertical, X } from 'lucide-react';
import type { Question } from '../../lib/types';
import { parsePayload, shuffled, type ExercisePayload } from '../../lib/exercises';
import { Button } from '../ui';
import { SpatialExercise } from './spatial-exercise';
import { AudioPrompt, SpeechExercise } from './speech-exercise';

export interface ExerciseRendererProps {
  question: Question;
  value: string;
  setValue: (value: string) => void;
  disabled: boolean;
}
export function ExerciseRenderer({
  question: q,
  value,
  setValue,
  disabled,
}: ExerciseRendererProps) {
  const c = q.config ?? {};
  const p = parsePayload(value);
  const update = (next: ExercisePayload) => setValue(JSON.stringify(next));
  const [selected, setSelected] = useState('');
  const [open, setOpen] = useState<string[]>([]);
  const items = useMemo(() => shuffled(c.items ?? [], q.id + 'items'), [c.items, q.id]);
  const targets = useMemo(() => shuffled(c.targets ?? [], q.id + 'targets'), [c.targets, q.id]);
  useEffect(() => {
    if (q.type === 'SORT_ORDER' && !value)
      setValue(JSON.stringify({ values: items.map((i) => i.id) }));
  }, [q.type, items, value, setValue]);
  if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
    const options =
      q.type === 'TRUE_FALSE'
        ? [
            { value: 'true', text: 'To‘g‘ri' },
            { value: 'false', text: 'Noto‘g‘ri' },
          ]
        : q.options;
    return (
      <fieldset className="question-options">
        <legend className="sr-only">Javob variantlari</legend>
        {options.map((o, i) => (
          <label
            key={o.value}
            className={`answer-option ${value === o.value ? 'selected' : ''} ${disabled ? 'locked' : ''}`}
          >
            <input
              type="radio"
              name={`answer-${q.id}`}
              value={o.value}
              checked={value === o.value}
              onChange={() => setValue(o.value)}
              disabled={disabled}
            />
            <span className="option-letter">{String.fromCharCode(65 + i)}</span>
            <span>{o.text}</span>
            <CircleCheck size={19} />
          </label>
        ))}
      </fieldset>
    );
  }
  if (q.type === 'TEXT' || q.type === 'NUMERICAL')
    return (
      <label className="text-answer">
        Javobingiz
        <input
          type="text"
          inputMode={q.type === 'NUMERICAL' ? 'decimal' : 'text'}
          maxLength={2000}
          placeholder={q.type === 'NUMERICAL' ? 'Sonni kiriting...' : 'Javobingizni yozing...'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          autoComplete="off"
        />
      </label>
    );
  if (q.type === 'FILL_GAP')
    return (
      <div className="gap-exercise">
        {c.slots?.map((slot, i) => (
          <label className="text-answer" key={slot.id}>
            {slot.text}
            <input
              value={p.values?.[i] ?? ''}
              disabled={disabled}
              maxLength={1000}
              placeholder="Bo‘shliqni to‘ldiring"
              onChange={(e) => {
                const values = c.slots!.map((_, j) => p.values?.[j] ?? '');
                values[i] = e.target.value;
                update({ values });
              }}
            />
          </label>
        ))}
      </div>
    );
  if (['MATCH_PAIRS', 'DRAG_DROP', 'CONNECT_CONCEPT', 'MEMORY_CARDS'].includes(q.type)) {
    const pairs = p.pairs ?? [];
    const memory = q.type === 'MEMORY_CARDS';
    const pair = (left: string, right: string) => {
      if (!left || disabled) return;
      update({
        pairs: [...pairs.filter((v) => v.left !== left && v.right !== right), { left, right }],
      });
      setSelected('');
    };
    return (
      <div className={`pair-exercise ${memory ? 'memory-exercise' : ''}`}>
        <p className="subtle">
          {memory
            ? 'Kartalarni oching va juftlarini tanlang.'
            : 'Chapdagi elementni, so‘ng mos o‘ng elementni bosing.'}
          {q.type === 'DRAG_DROP' ? ' Sudrab joylashtirish ham mumkin.' : ''}
        </p>
        <div className="pair-columns">
          <div>
            {items.map((item) => (
              <button
                type="button"
                disabled={disabled}
                key={item.id}
                draggable={q.type === 'DRAG_DROP' && !disabled}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', item.id);
                  setSelected(item.id);
                }}
                onClick={() => {
                  setSelected(item.id);
                  setOpen((prev) => [...prev, 'l' + item.id]);
                }}
                aria-label={
                  memory && !open.includes('l' + item.id)
                    ? `Chap karta ${items.indexOf(item) + 1}`
                    : item.text
                }
                aria-pressed={selected === item.id}
                className={`exercise-tile ${selected === item.id ? 'selected' : ''} ${pairs.some((v) => v.left === item.id) ? 'paired' : ''}`}
              >
                {memory && !open.includes('l' + item.id) ? '?' : item.text}
                {pairs.some((v) => v.left === item.id) && <CircleCheck size={16} />}
              </button>
            ))}
          </div>
          <div>
            {targets.map((target) => (
              <button
                type="button"
                disabled={disabled}
                key={target.id}
                className={`exercise-tile ${pairs.some((v) => v.right === target.id) ? 'paired' : ''}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const left = e.dataTransfer.getData('text/plain');
                  if (items.some((i) => i.id === left)) pair(left, target.id);
                }}
                onClick={() => {
                  setOpen((prev) => [...prev, 'r' + target.id]);
                  pair(selected, target.id);
                }}
                aria-label={
                  memory && !open.includes('r' + target.id)
                    ? `O‘ng karta ${targets.indexOf(target) + 1}`
                    : target.text
                }
              >
                {memory && !open.includes('r' + target.id) ? '?' : target.text}
              </button>
            ))}
          </div>
        </div>
        <div className="chosen-pairs" aria-live="polite">
          {pairs.map((pair) => (
            <div key={pair.left}>
              <span>
                {items.find((i) => i.id === pair.left)?.text} →{' '}
                {targets.find((i) => i.id === pair.right)?.text}
              </span>
              <button
                type="button"
                disabled={disabled}
                aria-label="Juftlikni bekor qilish"
                onClick={() => update({ pairs: pairs.filter((v) => v.left !== pair.left) })}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (q.type === 'SORT_ORDER') {
    const order = p.values ?? items.map((i) => i.id);
    const move = (from: number, to: number) => {
      if (disabled || to < 0 || to >= order.length) return;
      const next = [...order];
      const [id] = next.splice(from, 1);
      next.splice(to, 0, id!);
      update({ values: next });
    };
    return (
      <ol className="sort-exercise">
        {order.map((id, i) => (
          <li
            key={id}
            draggable={!disabled}
            onDragStart={(e) => e.dataTransfer.setData('text/plain', id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = order.indexOf(e.dataTransfer.getData('text/plain'));
              if (from >= 0) move(from, i);
            }}
          >
            <GripVertical size={18} />
            <span className="sort-index">{i + 1}</span>
            <strong>{items.find((v) => v.id === id)?.text}</strong>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || i === 0}
              aria-label={`${i + 1}-elementni yuqoriga`}
              onClick={() => move(i, i - 1)}
            >
              <ArrowUp size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || i === order.length - 1}
              aria-label={`${i + 1}-elementni pastga`}
              onClick={() => move(i, i + 1)}
            >
              <ArrowDown size={16} />
            </Button>
          </li>
        ))}
      </ol>
    );
  }
  if (q.type === 'FIND_MISTAKE')
    return (
      <div className="mistake-exercise">
        {c.code && <pre className="exercise-code">{c.code}</pre>}
        {c.items?.map((item, i) => (
          <button
            type="button"
            key={item.id}
            disabled={disabled}
            className={`exercise-tile ${p.values?.[0] === item.id ? 'selected' : ''}`}
            aria-pressed={p.values?.[0] === item.id}
            onClick={() => update({ values: [item.id] })}
          >
            <span>{i + 1}</span>
            <code>{item.text}</code>
          </button>
        ))}
      </div>
    );
  if (q.type === 'SPEAK')
    return (
      <SpeechExercise
        config={c}
        value={p.text ?? ''}
        onChange={(text) => update({ text })}
        disabled={disabled}
      />
    );
  if (['INTERACTIVE_IMAGE', 'DRAW', 'GEOMETRY'].includes(q.type))
    return (
      <SpatialExercise
        config={c}
        points={p.points ?? []}
        onChange={(points) => update({ points })}
        disabled={disabled}
        image={q.type === 'INTERACTIVE_IMAGE'}
        line={q.type === 'DRAW'}
      />
    );
  return (
    <div className="written-exercise">
      {c.code && <pre className="exercise-code">{c.code}</pre>}
      {q.type === 'LISTEN_ANSWER' && <AudioPrompt config={c} />}
      <label className="text-answer">
        {q.type === 'DEBUG_CODE' ? 'Tuzatilgan kod' : 'Javobingiz'}
        {q.type === 'DEBUG_CODE' ? (
          <textarea
            rows={6}
            spellCheck={false}
            value={p.text ?? ''}
            disabled={disabled}
            maxLength={5000}
            onChange={(e) => update({ text: e.target.value })}
          />
        ) : (
          <input
            value={p.text ?? ''}
            disabled={disabled}
            maxLength={5000}
            onChange={(e) => update({ text: e.target.value })}
          />
        )}
      </label>
    </div>
  );
}

export function answerReady(question: Question, value: string) {
  if (['MULTIPLE_CHOICE', 'TRUE_FALSE', 'TEXT', 'NUMERICAL'].includes(question.type))
    return !!value.trim();
  const p = parsePayload(value);
  const c = question.config ?? {};
  if (question.type === 'FILL_GAP')
    return p.values?.length === c.slots?.length && !!p.values?.every((v) => v.trim());
  if (['MATCH_PAIRS', 'DRAG_DROP', 'CONNECT_CONCEPT', 'MEMORY_CARDS'].includes(question.type))
    return p.pairs?.length === c.items?.length && !!p.pairs?.length;
  if (question.type === 'SORT_ORDER')
    return p.values?.length === c.items?.length && !!p.values?.length;
  if (question.type === 'FIND_MISTAKE') return p.values?.length === 1;
  if (['DRAW', 'GEOMETRY', 'INTERACTIVE_IMAGE'].includes(question.type))
    return p.points?.length === (question.type === 'DRAW' ? 2 : 1);
  return !!p.text?.trim();
}
