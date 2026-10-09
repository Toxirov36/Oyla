import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { GraduationCap, Users, Pencil, Trash2 } from 'lucide-react';
import type { AdminClass } from '../../lib/types';
import { Button, Card } from '../../components/ui';
export function AdminClasses({
  data,
  onEdit,
  onMembership,
  onDelete,
}: {
  data: AdminClass[];
  onEdit: (group: AdminClass) => void;
  onMembership: (group: AdminClass) => void;
  onDelete: (value: { endpoint: string; title: string }) => void;
}) {
  usePageLocale();
  return (
    <div className="class-grid">
      {data.map((group) => (
        <Card key={group.id} className="class-card">
          <span className="square-icon purple">
            <GraduationCap size={27} />
          </span>
          <h2>{group.name}</h2>
          <p>
            {tx('pages.admin.classes.grade', { value1: group.teacher.name, value2: group.grade })}
          </p>
          <strong>{tx('pages.admin.classes.students', { value1: group.students.length })}</strong>
          <div className="class-actions">
            <Button
              variant="secondary"
              onClick={() => {
                onMembership(group);
              }}
            >
              <Users size={17} />
              {tx('pages.admin.classes.studentsVariant16')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onEdit(group)}
              aria-label={tx('pages.admin.classes.editClass')}
            >
              <Pencil size={17} />
            </Button>
            <Button
              variant="ghost"
              aria-label={tx('pages.admin.classes.deleteClass')}
              onClick={() => {
                onDelete({ endpoint: `/admin/classes/${group.id}`, title: group.name });
              }}
            >
              <Trash2 size={17} />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
