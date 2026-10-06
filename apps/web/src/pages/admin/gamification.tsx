import { Zap, Pencil, Plus, Trash2, Award } from 'lucide-react';
import type { GameConfig, Level, Badge } from '../../lib/types';
import type { EditorSpec } from '../../components/entity-editor';
import { Button, Card } from '../../components/ui';
import { criterions } from './config';
export function AdminGamification({
  data,
  onEdit,
  onEditor,
  onDelete,
}: {
  data: GameConfig;
  onEdit: (kind: 'levels' | 'badges', item?: Level | Badge) => void;
  onEditor: (spec: EditorSpec) => void;
  onDelete: (value: { endpoint: string; title: string }) => void;
}) {
  return (
    <>
      <div className="section-title">
        <h2>XP qoidalari</h2>
        <Zap size={20} />
      </div>
      <div className="xp-rules-grid">
        {data.rules.map((rule) => (
          <Card key={rule.key}>
            <span className="square-icon blue">
              <Zap size={22} />
            </span>
            <h3>
              {
                (
                  {
                    LESSON_COMPLETED: 'Dars yakunlash',
                    CORRECT_ANSWER: 'To‘g‘ri javob',
                    DAILY_CHALLENGE: 'Kunlik challenge bonusi',
                    STREAK_7: '7 kunlik streak',
                  } as Record<string, string>
                )[rule.key]
              }
            </h3>
            <strong className="xp-amount">+{rule.amount} XP</strong>
            <Button
              variant="secondary"
              onClick={() =>
                onEditor({
                  title: 'XP qoidasini tahrirlash',
                  endpoint: `/admin/xp-rules`,
                  id: rule.key,
                  fields: [
                    { key: 'amount', label: 'XP miqdori', kind: 'number', min: 0, max: 10000 },
                  ],
                  values: { amount: rule.amount },
                })
              }
            >
              <Pencil size={16} />
              O‘zgartirish
            </Button>
          </Card>
        ))}
      </div>
      <p className="formula-note">
        O‘zgarishlar keyingi yakunlangan faoliyatlarga ta’sir qiladi. Avval berilgan XP tarixi
        saqlanadi.
      </p>
      <div className="section-title">
        <h2>Darajalar</h2>
        <Button variant="secondary" onClick={() => onEdit('levels')}>
          <Plus size={16} />
          Daraja
        </Button>
      </div>
      <Card>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Daraja</th>
                <th>Nomi</th>
                <th>XP chegarasi</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {data.levels.map((level) => (
                <tr key={level.id}>
                  <td>
                    <span className="level-table-number">{level.number}</span>
                  </td>
                  <td>{level.title}</td>
                  <td>{level.threshold.toLocaleString()} XP</td>
                  <td>
                    <Button
                      variant="ghost"
                      aria-label="Darajani tahrirlash"
                      onClick={() => onEdit('levels', level)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Darajani o‘chirish"
                      disabled={level.number === 1}
                      onClick={() => {
                        onDelete({ endpoint: `/admin/levels/${level.id}`, title: level.title });
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="section-title">
        <h2>Nishonlar</h2>
        <Button variant="secondary" onClick={() => onEdit('badges')}>
          <Plus size={16} />
          Nishon
        </Button>
      </div>
      <div className="admin-badge-grid">
        {data.badges.map((badge) => (
          <Card key={badge.id}>
            <Award size={30} className="purple-text" />
            <h3>{badge.title}</h3>
            <p>{badge.description}</p>
            <small>
              {criterions.find((c) => c.value === badge.criterion)?.label}: {badge.threshold}
            </small>
            <div className="content-actions">
              <Button variant="secondary" onClick={() => onEdit('badges', badge)}>
                <Pencil size={16} />
                Tahrirlash
              </Button>
              <Button
                variant="ghost"
                aria-label="Nishonni o‘chirish"
                onClick={() => {
                  onDelete({ endpoint: `/admin/badges/${badge.id}`, title: badge.title });
                }}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
