import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2, KeyRound } from 'lucide-react';
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
  onReset,
}: {
  data: { items: User[]; total: number };
  search: string;
  page: number;
  onSearch: (value: string) => void;
  onPage: (value: number) => void;
  onEdit: (user: User) => void;
  onDelete: (value: { endpoint: string; title: string }) => void;
  onReset: (user: User) => void;
}) {
  usePageLocale();
  return (
    <Card className="data-table-card">
      <div className="filter-bar">
        <label className="search-input">
          <Search size={18} />
          <input
            aria-label={tx('pages.admin.users.searchUsers')}
            value={search}
            onChange={(e) => {
              onSearch(e.target.value);
              onPage(1);
            }}
            placeholder={tx('pages.admin.users.searchByNameOrEmail')}
          />
        </label>
        <span className="subtle">{tx('pages.admin.users.users', { value1: data.total })}</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{tx('pages.admin.users.user')}</th>
              <th>{tx('pages.admin.user-editor.role')}</th>
              <th>{tx('pages.admin.users.grade')}</th>
              <th>{tx('pages.admin.users.status')}</th>
              <th>{tx('pages.admin.avatars.edit')}</th>
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
                    {user.role === 'ADMIN' && user.teacherAccess
                      ? tx('pages.admin.users.teacherPanel')
                      : ''}
                  </span>
                </td>
                <td>
                  {user.role === 'STUDENT' && user.student
                    ? tx('common.grade', { grade: user.student.grade })
                    : '—'}
                </td>
                <td>
                  <span className={`pill ${user.active ? 'status-completed' : ''}`}>
                    {user.active
                      ? tx('pages.admin.users.active')
                      : tx('pages.admin.users.inactive')}
                  </span>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    aria-label={tx('pages.admin.users.edit', { value1: user.name })}
                    onClick={() => onEdit(user)}
                  >
                    <Pencil size={17} />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={tx('pages.admin.users.resetPasswordFor', { value1: user.name })}
                    disabled={!user.active}
                    onClick={() => onReset(user)}
                  >
                    <KeyRound size={17} />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={tx('pages.admin.users.deactivateAccountFor', { value1: user.name })}
                    onClick={() => {
                      onDelete({
                        endpoint: `/admin/users/${user.id}`,
                        get title() {
                          return tx('pages.admin.users.deactivateAccountFor', {
                            value1: user.name,
                          });
                        },
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
      {!data.items.length && <EmptyState title={tx('pages.admin.users.noSearchResults')} />}
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
