import { localizeText } from '../../i18n';
import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
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
    feedbackReason: q.feedback?.reason ?? '',
    feedbackRule: q.feedback?.rule ?? '',
    feedbackSteps: q.feedback?.steps?.join('\n') ?? '',
    feedbackExample: q.feedback?.example ?? '',
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
  const { locale } = usePageLocale();
  const cache = useQueryClient();
  const [type, setType] = useState<ExerciseType>(question?.type ?? 'MULTIPLE_CHOICE');
  const [fields, setFields] = useState(() =>
    fromDefinition(
      question
        ? {
            ...question,
            config: question.config ?? undefined,
            grading: question.grading ?? undefined,
            feedback: question.feedback ?? undefined,
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
  const [generating, setGenerating] = useState(false);
  const [creationMode, setCreationMode] = useState<'manual' | 'ai'>('manual');
  const [generationCount, setGenerationCount] = useState(3);
  const [generatedQuestions, setGeneratedQuestions] = useState<
    { id: string; text: string; answer: string; explanation: string; options: { text: string; value: string }[] }[]
  >([]);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<PreviewDefinition | null>(null);
  const [wrongReasons, setWrongReasons] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (question?.feedback?.wrongAnswers ?? []).map((item) => [item.value, item.reason]),
    ),
  );
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
          throw Error(tx('pages.exercises.question-editor.enterCoordinatesInXYFormat'));
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
    const options =
      type === 'MULTIPLE_CHOICE'
        ? lines(fields.optionsText).map((text) => ({
            text,
            value: question?.options.find((o) => o.text === text)?.value ?? text,
          }))
        : [];
    return {
      lessonId: selectedLesson,
      type,
      text: fields.text,
      answer: structured ? 'structured' : fields.answer,
      explanation: fields.explanation,
      options,
      tolerance,
      config: structured ? c : undefined,
      grading: structured ? g : undefined,
      feedback: {
        reason: fields.feedbackReason.trim(),
        rule: fields.feedbackRule.trim(),
        steps: lines(fields.feedbackSteps),
        example: fields.feedbackExample.trim(),
        wrongAnswers: options
          .filter((o) => o.value !== fields.answer.trim() && wrongReasons[o.value]?.trim())
          .map((o) => ({ value: o.value, reason: wrongReasons[o.value]!.trim() })),
      },
    };
  };
  const field = (key: keyof typeof fields, label: string, help?: string, rows = 3) => (
    <label>
      {label}
      <textarea
        rows={rows}
        value={fields[key]}
        onChange={(e) => set(key, e.target.value)}
        maxLength={
          key === 'feedbackSteps'
            ? 15000
            : key === 'feedbackReason'
              ? 1500
              : key === 'feedbackExample'
                ? 3000
                : ['code', 'explanation', 'text', 'feedbackRule'].includes(key)
                  ? 5000
                  : 2000
        }
      />
      {help && <small className="field-help">{help}</small>}
    </label>
  );
  const pairing = pairTypes.includes(type);
  const spatial = pointTypes.includes(type);
  const generateQuestions = async () => {
    if (!selectedLesson) return;
    setError('');
    setGeneratedQuestions([]);
    setGenerating(true);
    try {
      const created = await api<NonNullable<typeof generatedQuestions>>('/admin/questions/generate', {
        method: 'POST',
        body: { lessonId: selectedLesson, count: generationCount, difficulty, locale },
      });
      setGeneratedQuestions(created);
      await cache.invalidateQueries({ queryKey: ['admin', 'content'] });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setGenerating(false);
    }
  };
  return (
    <form
      className="exercise-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (creationMode === 'ai') return;
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
        {tx('pages.exercises.question-editor.openExerciseCatalog')}
      </Link>
      <label>
        {tx('pages.admin.content.lesson')}
        <ComboboxField
          label={tx('pages.admin.content.lesson')}
          value={selectedLesson}
          options={lessons.map((l) => ({ value: l.id, label: l.title }))}
          onChange={setSelectedLesson}
        />
      </label>
      {!question && (
        <div className="question-creation-modes" role="group" aria-label={tx('pages.admin.questionCreationMethod')}>
          <Button
            type="button"
            variant={creationMode === 'manual' ? 'primary' : 'secondary'}
            aria-pressed={creationMode === 'manual'}
            onClick={() => setCreationMode('manual')}
          >
            {tx('pages.admin.createQuestionManually')}
          </Button>
          <Button
            type="button"
            variant={creationMode === 'ai' ? 'primary' : 'secondary'}
            aria-pressed={creationMode === 'ai'}
            onClick={() => setCreationMode('ai')}
          >
            <Sparkles size={16} />
            {tx('pages.admin.createQuestionsWithAi')}
          </Button>
        </div>
      )}
      {creationMode === 'ai' && !question ? (
        <section className="ai-question-generator" aria-label={tx('pages.admin.createQuestionsWithAi')}>
          <p>{tx('pages.admin.aiQuestionsUseLessonSubjectTopicAndGrade')}</p>
          <div className="ai-question-generator-controls">
            <label>
              {tx('pages.admin.numberOfQuestions')}
              <select value={generationCount} onChange={(event) => setGenerationCount(Number(event.target.value))}>
                {[1, 3, 5, 10].map((count) => <option key={count} value={count}>{count}</option>)}
              </select>
            </label>
            <label>
              {tx('pages.exercises.question-editor.difficulty')}
              <ComboboxField
                label={tx('pages.exercises.question-editor.difficulty')}
                value={difficulty}
                options={[
                  { value: 'EASY', get label() { return tx('exercise.easy'); } },
                  { value: 'MEDIUM', get label() { return tx('exercise.medium'); } },
                  { value: 'HARD', get label() { return tx('exercise.hard'); } },
                ]}
                onChange={(value) => setDifficulty(value as typeof difficulty)}
              />
            </label>
          </div>
          <small className="field-help">{tx('pages.admin.aiGeneratedQuestionsAreSavedAsDraftForReview')}</small>
          <Button type="button" onClick={() => void generateQuestions()} busy={generating} disabled={!selectedLesson}>
            <Sparkles size={16} />
            {tx('pages.admin.generateQuestions')}
          </Button>
          {error && <p className="form-error" role="alert">{localizeText(error)}</p>}
          {generatedQuestions.length > 0 && (
            <div className="ai-question-generated-list" role="status">
              <strong>{tx('pages.admin.aiQuestionDraftsCreated', { value1: generatedQuestions.length })}</strong>
              {generatedQuestions.map((generated, index) => (
                <article key={generated.id}>
                  <strong>{index + 1}. {generated.text}</strong>
                  <ul>
                    {generated.options.map((option) => (
                      <li key={option.value} className={option.value === generated.answer ? 'correct-option' : undefined}>
                        {option.text}{option.value === generated.answer ? ` · ${tx('pages.admin.gamification.correctAnswer')}` : ''}
                      </li>
                    ))}
                  </ul>
                  <p>{generated.explanation}</p>
                </article>
              ))}
              <Button type="button" variant="secondary" onClick={close}>
                {tx('pages.admin.viewLessonQuestions')}
              </Button>
            </div>
          )}
        </section>
      ) : (
      <>
      <label>
        {tx('pages.exercises.question-editor.questionType')}
        <ComboboxField
          label={tx('pages.exercises.question-editor.questionType')}
          value={type}
          options={Object.entries(exerciseLabels).map(([value, label]) => ({ value, label }))}
          onChange={(v) => {
            setType(v as ExerciseType);
            setFields(fromDefinition(exampleQuestion(v as ExerciseType)));
            setWrongReasons({});
            setPreview(null);
          }}
        />
        <small className="field-help">
          {tx('pages.exercises.question-editor.changingTheTypeLoadsAStarterExampleTo')}
        </small>
      </label>
      {field('text', tx('pages.exercises.question-editor.questionText'))}
      {type === 'MULTIPLE_CHOICE' &&
        field(
          'optionsText',
          tx('pages.exercises.question-editor.options'),
          tx('pages.exercises.question-editor.enter28OptionsOnePerLine'),
        )}
      {(pairing || ['SORT_ORDER', 'FIND_MISTAKE'].includes(type)) &&
        field(
          'items',
          tx('pages.exercises.question-editor.items'),
          tx('pages.exercises.question-editor.oneItemPerLineUseLineNumbersTo'),
        )}
      {pairing &&
        field(
          'targets',
          tx('pages.exercises.question-editor.matchingItems'),
          tx('pages.exercises.question-editor.oneItemPerLine'),
        )}
      {type === 'FILL_GAP' &&
        field(
          'slots',
          tx('pages.exercises.question-editor.gaps'),
          tx('pages.exercises.question-editor.enterEachGapsNameOrHintOnA'),
        )}
      {['CODE_COMPLETION', 'DEBUG_CODE'].includes(type) &&
        field(
          'code',
          tx('pages.exercises.question-editor.codeExample'),
          tx('pages.exercises.question-editor.runningTheCodeIsNotRequired'),
          6,
        )}
      {['LISTEN_ANSWER', 'SPEAK'].includes(type) && (
        <>
          {field('audioText', tx('pages.exercises.question-editor.spokenSampleText'))}
          {field(
            'audioUrl',
            tx('pages.exercises.question-editor.audioFileUrlOptional'),
            tx('pages.exercises.question-editor.useAnHttpsLinkOrALocalPath'),
            2,
          )}
          <label>
            {tx('pages.exercises.question-editor.language')}
            <ComboboxField
              label={tx('pages.exercises.question-editor.language')}
              value={fields.language}
              options={[
                {
                  value: 'en-US',
                  get label() {
                    return tx('pages.exercises.question-editor.englishUs');
                  },
                },
                {
                  value: 'en-GB',
                  get label() {
                    return tx('pages.exercises.question-editor.englishUk');
                  },
                },
                {
                  value: 'uz-UZ',
                  get label() {
                    return tx('pages.exercises.question-editor.uzbek');
                  },
                },
              ]}
              onChange={(v) => set('language', v)}
            />
          </label>
        </>
      )}
      {type === 'INTERACTIVE_IMAGE' && (
        <>
          {field('imageUrl', tx('pages.exercises.question-editor.imageUrl'), undefined, 2)}
          {field('imageAlt', tx('pages.exercises.question-editor.imageDescription'), undefined, 2)}
        </>
      )}
      {spatial && (
        <>
          {field(
            'markers',
            tx('pages.exercises.question-editor.visiblePointsOptional'),
            tx('pages.exercises.question-editor.oneXYPairPerLineCoordinatesRange'),
            2,
          )}
          <label>
            {tx('pages.exercises.question-editor.allowedDeviation')}
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
        tx('pages.admin.gamification.correctAnswer'),
        pairing
          ? tx('pages.exercises.question-editor.pairsLeftLineNumberrightLineNumberForExample')
          : type === 'SORT_ORDER'
            ? tx('pages.exercises.question-editor.enterLineNumbersInTheRequiredOrder2')
            : type === 'FIND_MISTAKE'
              ? tx('pages.exercises.question-editor.lineNumberOfTheIncorrectItem')
              : type === 'FILL_GAP'
                ? tx('pages.exercises.question-editor.oneGapAnswerPerLineSeparateAlternativesWith')
                : spatial
                  ? tx('pages.exercises.question-editor.onePointPerLineXY0100Use')
                  : type === 'TRUE_FALSE'
                    ? tx('pages.exercises.question-editor.trueOrFalse')
                    : tx('pages.exercises.question-editor.separateAcceptedAlternativesWith'),
      )}
      {field('explanation', tx('exercise.feedback'))}
      <fieldset className="feedback-editor">
        <legend>{tx('pages.exercises.question-editor.explanationAfterAnIncorrectAnswer')}</legend>
        <p className="field-help">
          {tx(
            'pages.exercises.question-editor.explanationsAppearAfterSubmissionEnterOnlyVerifiedRules',
          )}
        </p>
        {field(
          'feedbackReason',
          tx('pages.exercises.question-editor.whyIsItIncorrectGeneralReason'),
          tx('pages.exercises.question-editor.doNotGuessTheReasonIfYouAre'),
          2,
        )}
        {field(
          'feedbackRule',
          tx('exercise.rule'),
          tx('pages.exercises.question-editor.theRelevantRuleOrCalculationMethod'),
        )}
        {field(
          'feedbackSteps',
          tx('pages.exercises.question-editor.solutionSteps'),
          tx('pages.exercises.question-editor.oneStepPerLineUpTo10Steps'),
          4,
        )}
        {field(
          'feedbackExample',
          tx('pages.exercises.question-editor.additionalExample'),
          tx('pages.exercises.question-editor.anotherShortExampleUsingTheSameRule'),
        )}
        {type === 'MULTIPLE_CHOICE' &&
          lines(fields.optionsText).map((text, i) => {
            const value = question?.options.find((o) => o.text === text)?.value ?? text;
            if (value === fields.answer.trim()) return null;
            return (
              <label key={i}>
                {tx('pages.exercises.question-editor.whyIsIncorrect', { value1: text })}
                <textarea
                  rows={2}
                  maxLength={1500}
                  value={wrongReasons[value] ?? ''}
                  onChange={(e) => {
                    setWrongReasons((prev) => ({ ...prev, [value]: e.target.value }));
                    setPreview(null);
                  }}
                />
              </label>
            );
          })}
      </fieldset>
      <label>
        {tx('pages.exercises.question-editor.hint')}
        <input value={hint} maxLength={2000} onChange={(e) => setHint(e.target.value)} />
      </label>
      <label>
        {tx('pages.exercises.question-editor.difficulty')}
        <ComboboxField
          label={tx('pages.exercises.question-editor.difficulty')}
          value={difficulty}
          options={[
            {
              value: 'EASY',
              get label() {
                return tx('exercise.easy');
              },
            },
            {
              value: 'MEDIUM',
              get label() {
                return tx('exercise.medium');
              },
            },
            {
              value: 'HARD',
              get label() {
                return tx('exercise.hard');
              },
            },
          ]}
          onChange={(v) => setDifficulty(v as typeof difficulty)}
        />
      </label>
      <label>
        {tx('pages.admin.users.status')}
        <ComboboxField
          label={tx('pages.admin.users.status')}
          value={status}
          options={[
            {
              value: 'DRAFT',
              get label() {
                return tx('common.draft');
              },
            },
            {
              value: 'PUBLISHED',
              get label() {
                return tx('common.published');
              },
            },
            {
              value: 'ARCHIVED',
              get label() {
                return tx('common.archived');
              },
            },
          ]}
          onChange={(v) => setStatus(v as typeof status)}
        />
      </label>
      <label>
        {tx('pages.admin.avatars.displayOrder')}
        <input
          type="number"
          min="0"
          max="10000"
          value={position}
          onChange={(e) => setPosition(Number(e.target.value))}
        />
      </label>
      <label>
        {tx('pages.exercises.question-editor.xpForThisQuestionOptional')}
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
          {tx('pages.exercises.question-editor.numericalAnswerTolerance')}
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
        {tx('pages.exercises.question-editor.previewAsAStudent')}
      </Button>
      {preview && <ExercisePreview key={JSON.stringify(preview)} definition={preview} />}
      {error && (
        <p className="form-error" role="alert">
          {localizeText(error)}
        </p>
      )}
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={close}>
          {tx('common.cancel')}
        </Button>
        <Button type="submit" busy={busy}>
          {tx('pages.admin.avatars.save')}
        </Button>
      </div>
      </>
      )}
    </form>
  );
}
