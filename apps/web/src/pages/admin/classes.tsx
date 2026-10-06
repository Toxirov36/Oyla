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
  return (
    <div className="class-grid">
      {data.map((group) => (
        <Card key={group.id} className="class-card">
          <span className="square-icon purple">
            <GraduationCap size={27} />
          </span>
          <h2>{group.name}</h2>
          <p>
            {group.teacher.name} · {group.grade}-sinf
          </p>
          <strong>{group.students.length} o‘quvchi</strong>
          <div className="class-actions">
            <Button
              variant="secondary"
              onClick={() => {
                onMembership(group);
              }}
            >
              <Users size={17} />
              O‘quvchilar
            </Button>
            <Button variant="ghost" onClick={() => onEdit(group)} aria-label="Sinfni tahrirlash">
              <Pencil size={17} />
            </Button>
            <Button
              variant="ghost"
              aria-label="Sinfni o‘chirish"
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
