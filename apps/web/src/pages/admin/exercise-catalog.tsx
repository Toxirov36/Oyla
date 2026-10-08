import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { exerciseLabels, type ExerciseType } from '../../lib/exercises';
import { Modal, PageHeader } from '../../components/ui';
import { ExercisePreview, exampleQuestion } from '../../components/exercises/exercise-preview';

export default function ExerciseCatalog() {
  const [selected, setSelected] = useState<string | null>(null);
  const catalog = [
    ...Object.entries(exerciseLabels),
    ['MINI_GAME', 'Bilim parvozi'],
    ['BOSS_BATTLE', 'Mavzu sinovi'],
  ];
  const game = selected === 'MINI_GAME' || selected === 'BOSS_BATTLE';
  return (
    <>
      <Link to="/admin/content" className="back-link">
        <ArrowLeft size={18} />
        O‘quv kontentiga qaytish
      </Link>
      <PageHeader
        eyebrow="MASHQLAR USTAXONASI"
        title="20 xil o‘rganish tajribasi"
        description="Mashq turini tanlang va o‘quvchi ko‘rinishida sinab ko‘ring. Namunalar natijaga yoki XP’ga ta’sir qilmaydi."
      />
      <div className="exercise-catalog">
        {catalog.map(([type, label], i) => (
          <button key={type} onClick={() => setSelected(type!)}>
            <span className="catalog-number">{String(i + 1).padStart(2, '0')}</span>
            <h3>{label}</h3>
            <p>
              {type === 'MINI_GAME' || type === 'BOSS_BATTLE'
                ? 'Turli savollardan tuzilgan o‘yin rejimi'
                : 'Interaktiv namunani ochish →'}
            </p>
          </button>
        ))}
      </div>
      <Modal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={catalog.find(([t]) => t === selected)?.[1] ?? 'Mashq namunasi'}
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
