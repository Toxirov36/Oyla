import { localizeText } from '../../i18n';
import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api, errorText } from '../../lib/api';
import type { AdminQuestion } from '../../lib/types';
import { exerciseLabels, type ExerciseType } from '../../lib/exercises';
import { ComboboxField } from '../combobox-field';
import { Button } from '../ui';
import { exampleQuestion, ExercisePreview, type PreviewDefinition } from './exercise-preview';
import { AiQuestionGenerator } from './ai-question-generator';
import {
  buildDefinition,
  fromDefinition,
  lines,
  pairTypes,
  pointTypes,
} from './question-editor-model';

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
  usePageLocale();
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
  const [creationMode, setCreationMode] = useState<'manual' | 'ai'>('manual');
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
  const make = () =>
    buildDefinition({ type, fields, question, selectedLesson, tolerance, wrongReasons });
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
        <div
          className="question-creation-modes"
          role="group"
          aria-label={tx('pages.admin.questionCreationMethod')}
        >
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
        <AiQuestionGenerator
          lessonId={selectedLesson}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          close={close}
        />
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
              {field(
                'imageAlt',
                tx('pages.exercises.question-editor.imageDescription'),
                undefined,
                2,
              )}
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
                    ? tx(
                        'pages.exercises.question-editor.oneGapAnswerPerLineSeparateAlternativesWith',
                      )
                    : spatial
                      ? tx('pages.exercises.question-editor.onePointPerLineXY0100Use')
                      : type === 'TRUE_FALSE'
                        ? tx('pages.exercises.question-editor.trueOrFalse')
                        : tx('pages.exercises.question-editor.separateAcceptedAlternativesWith'),
          )}
          {field('explanation', tx('exercise.feedback'))}
          <fieldset className="feedback-editor">
            <legend>
              {tx('pages.exercises.question-editor.explanationAfterAnIncorrectAnswer')}
            </legend>
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
