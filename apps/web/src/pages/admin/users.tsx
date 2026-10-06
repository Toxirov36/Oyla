import { Search, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import type { User } from '../../lib/types';
import { Button, Card, EmptyState } from '../../components/ui';
import { roles } from './config';
export function AdminUsers({
  data,
  search,
  page,
  onSearch,
  onPage,
  onEdit,
  onDelete,
}: {
  data: { items: User[]; total: number };
  search: string;
  page: number;
  onSearch: (value: string) => void;
  onPage: (value: number) => void;
  onEdit: (user: User) => void;
  onDelete: (value: { endpoint: string; title: string }) => void;
}) {
  return (
    <Card className="data-table-card">
      <div className="filter-bar">
        <label className="search-input">
          <Search size={18} />
          <input
            aria-label="Foydalanuvchini qidirish"
            value={search}
            onChange={(e) => {
              onSearch(e.target.value);
              onPage(1);
            }}
            placeholder="Ism yoki email bo‘yicha qidirish..."
          />
        </label>
        <span className="subtle">{data.total} ta foydalanuvchi</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Foydalanuvchi</th>
              <th>Rol</th>
              <th>Sinf</th>
              <th>Holat</th>
              <th>Tahrirlash</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </td>
                <td>
                  <span className="pill">
                    {roles.find((r) => r.value === user.role)?.label}
                    {user.teacherAccess ? ' · O‘qituvchi paneli' : ''}
                  </span>
                </td>
                <td>{user.student ? `${user.student.grade}-sinf` : '—'}</td>
                <td>
                  <span className={`pill ${user.active ? 'status-completed' : ''}`}>
                    {user.active ? 'Faol' : 'Faolsiz'}
                  </span>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    aria-label={`${user.name} tahrirlash`}
                    onClick={() => onEdit(user)}
                  >
                    <Pencil size={17} />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`${user.name} hisobini faolsizlantirish`}
                    onClick={() => {
                      onDelete({
                        endpoint: `/admin/users/${user.id}`,
                        title: `${user.name} hisobini faolsizlantirish`,
                      });
                    }}
                  >
                    <Trash2 size={17} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.items.length && <EmptyState title="Qidiruv bo‘yicha natija yo‘q" />}
      <div className="pagination">
        <Button variant="secondary" disabled={page === 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={17} />
        </Button>
        <span>
          {page} / {Math.max(1, Math.ceil(data.total / 20))}
        </span>
        <Button
          variant="secondary"
          disabled={page * 20 >= data.total}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={17} />
        </Button>
      </div>
    </Card>
  );
}
