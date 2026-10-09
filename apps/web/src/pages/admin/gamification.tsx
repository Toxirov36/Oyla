import { localizeText } from '../../i18n';
import { formatNumber } from '../../lib/locale';
import { translate as tx, useI18n as usePageLocale } from '../../i18n';
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
  usePageLocale();
  return (
    <>
      <div className="section-title">
        <h2>{tx('pages.admin.gamification.xpRules')}</h2>
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
                    get LESSON_COMPLETED() {
                      return tx('pages.admin.gamification.lessonCompletion');
                    },
                    get CORRECT_ANSWER() {
                      return tx('pages.admin.gamification.correctAnswer');
                    },
                    get DAILY_CHALLENGE() {
                      return tx('pages.admin.gamification.dailyChallengeBonus');
                    },
                    get STREAK_7() {
                      return tx('pages.admin.gamification.7dayStreak');
                    },
                  } as Record<string, string>
                )[rule.key]
              }
            </h3>
            <strong className="xp-amount">
              {tx('pages.admin.gamification.xp', { value1: rule.amount })}
            </strong>
            <Button
              variant="secondary"
              onClick={() =>
                onEditor({
                  get title() {
                    return tx('pages.admin.gamification.editXpRule');
                  },
                  endpoint: `/admin/xp-rules`,
                  id: rule.key,
                  fields: [
                    {
                      key: 'amount',
                      get label() {
                        return tx('pages.admin.gamification.xpAmount');
                      },
                      kind: 'number',
                      min: 0,
                      max: 10000,
                    },
                  ],
                  values: { amount: rule.amount },
                })
              }
            >
              <Pencil size={16} />
              {tx('pages.admin.gamification.change')}
            </Button>
          </Card>
        ))}
      </div>
      <p className="formula-note">
        {tx('pages.admin.gamification.changesApplyToFutureCompletedActivitiesPreviouslyEarned')}
      </p>
      <div className="section-title">
        <h2>{tx('pages.admin.gamification.levels')}</h2>
        <Button variant="secondary" onClick={() => onEdit('levels')}>
          <Plus size={16} />
          {tx('pages.admin.gamification.level')}
        </Button>
      </div>
      <Card>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{tx('pages.admin.gamification.level')}</th>
                <th>{tx('pages.admin.avatars.name')}</th>
                <th>{tx('pages.admin.gamification.xpThreshold')}</th>
                <th>{tx('pages.admin.gamification.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.levels.map((level) => (
                <tr key={level.id}>
                  <td>
                    <span className="level-table-number">{level.number}</span>
                  </td>
                  <td>{localizeText(level.title)}</td>
                  <td>
                    {tx('pages.admin.gamification.xpVariant60', {
                      value1: formatNumber(level.threshold),
                    })}
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      aria-label={tx('pages.admin.gamification.editLevel')}
                      onClick={() => onEdit('levels', level)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label={tx('pages.admin.gamification.deleteLevel')}
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
        <h2>{tx('navigation.badges')}</h2>
        <Button variant="secondary" onClick={() => onEdit('badges')}>
          <Plus size={16} />
          {tx('pages.admin.gamification.badge')}
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
                {tx('pages.admin.avatars.edit')}
              </Button>
              <Button
                variant="ghost"
                aria-label={tx('pages.admin.gamification.deleteBadge')}
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
