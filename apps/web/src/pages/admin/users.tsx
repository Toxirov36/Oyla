import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { Search, ChevronLeft, ChevronRight, Pencil, Trash2, KeyRound } from 'lucide-react';
import type { User } from '../../lib/types';
import { Button, Card, EmptyState } from '../../components/ui';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '../../components/ui/pagination';
import { roles } from './config';

function pageItems(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const numbers = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((value) => numbers.add(value));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((value) => numbers.add(value));
  const ordered = [...numbers].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  for (const value of ordered) {
    const previous = items.at(-1);
    if (typeof previous === 'number' && value - previous === 2) items.push(previous + 1);
    else if (typeof previous === 'number' && value - previous > 2) items.push('ellipsis');
    items.push(value);
  }
  return items;
}

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
  data: { items: User[]; total: number; limit: number };
  search: string;
  page: number;
  onSearch: (value: string) => void;
  onPage: (value: number) => void;
  onEdit: (user: User) => void;
  onDelete: (value: { endpoint: string; title: string }) => void;
  onReset: (user: User) => void;
}) {
  usePageLocale();
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  const first = data.total ? (page - 1) * data.limit + 1 : 0;
  const last = Math.min(page * data.limit, data.total);
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
      <div className="admin-users-footer">
        <span className="subtle">{tx('pages.admin.users.showingRange', { value1: first, value2: last, value3: data.total })}</span>
        {totalPages > 1 && (
          <Pagination className="admin-users-pagination" aria-label={tx('pages.admin.users.pagination')}>
            <PaginationContent>
              <PaginationItem>
                <Button type="button" variant="ghost" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label={tx('pages.admin.users.previousPage')}>
                  <ChevronLeft size={17} />
                </Button>
              </PaginationItem>
              {pageItems(page, totalPages).map((item, index) => (
                <PaginationItem key={item === 'ellipsis' ? `ellipsis-${index}` : item}>
                  {item === 'ellipsis' ? <PaginationEllipsis /> : (
                    <Button
                      type="button"
                      variant={item === page ? 'secondary' : 'ghost'}
                      className={item === page ? 'is-current' : ''}
                      aria-current={item === page ? 'page' : undefined}
                      aria-label={tx('pages.admin.users.pageNumber', { value1: item })}
                      onClick={() => onPage(item)}
                    >
                      {item}
                    </Button>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <Button type="button" variant="ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={tx('pages.admin.users.nextPage')}>
                  <ChevronRight size={17} />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </Card>
  );
}
