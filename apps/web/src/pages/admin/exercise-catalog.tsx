import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { exerciseLabels, type ExerciseType } from '../../lib/exercises';
import { Modal, PageHeader } from '../../components/ui';
import { ExercisePreview, exampleQuestion } from '../../components/exercises/exercise-preview';

export default function ExerciseCatalog() {
  usePageLocale();
  const [selected, setSelected] = useState<string | null>(null);
  const catalog = [
    ...Object.entries(exerciseLabels),
    ['MINI_GAME', tx('lesson.miniGame')],
    ['BOSS_BATTLE', tx('lesson.bossBattle')],
  ];
  const game = selected === 'MINI_GAME' || selected === 'BOSS_BATTLE';
  return (
    <>
      <Link to="/admin/content" className="back-link">
        <ArrowLeft size={18} />
        {tx('pages.admin.exercise-catalog.backToLearningContent')}
      </Link>
      <PageHeader
        eyebrow={tx('pages.admin.exercise-catalog.exerciseWorkshop')}
        title={tx('pages.admin.exercise-catalog.20WaysToLearn')}
        description={tx('pages.admin.exercise-catalog.chooseAnExerciseTypeAndTryItAs')}
      />
      <div className="exercise-catalog">
        {catalog.map(([type, label], i) => (
          <button key={type} onClick={() => setSelected(type!)}>
            <span className="catalog-number">{String(i + 1).padStart(2, '0')}</span>
            <h3>{label}</h3>
            <p>
              {type === 'MINI_GAME' || type === 'BOSS_BATTLE'
                ? tx('pages.admin.exercise-catalog.gameModeWithAMixOfQuestions')
                : tx('pages.admin.exercise-catalog.openInteractiveExample')}
            </p>
          </button>
        ))}
      </div>
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={
          catalog.find(([t]) => t === selected)?.[1] ??
          tx('pages.admin.exercise-catalog.exerciseExample')
        }
      >
        {selected && (
          <ExercisePreview
            key={selected}
            definition={exampleQuestion(game ? 'MULTIPLE_CHOICE' : (selected as ExerciseType))}
            mode={game ? selected : 'STANDARD'}
          />
        )}
      </Modal>
    </>
  );
}
