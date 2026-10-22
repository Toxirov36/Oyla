import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { localizeText, translate as tx } from '../../i18n';
import { api, errorText } from '../../lib/api';
import type { AdminClass, User } from '../../lib/types';
import { Button, Modal } from '../../components/ui';
import { isEligibleClassStudent } from './editor-specs';

function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="form-error" role="alert">
      {localizeText(message)}
    </div>
  );
}

/** Confirmation dialog for DELETE requests issued from the admin pages. */
export function DeleteModal({
  deletion,
  onClose,
}: {
  deletion: { endpoint: string; title: string } | null;
  onClose: () => void;
}) {
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setError(''), [deletion]);
  return (
    <Modal
      open={!!deletion}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={tx('pages.admin.confirmAction')}
      description={deletion?.title || ''}
    >
      <p className="delete-notice">
        {tx('pages.admin.linkedContentMayPreventDeletionArchiveTheContent')}
      </p>
      <FormError message={error} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          {tx('common.cancel')}
        </Button>
        <Button
          variant="danger"
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api(deletion!.endpoint, { method: 'DELETE' });
              await cache.invalidateQueries();
              onClose();
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {tx('pages.admin.confirm')}
        </Button>
      </div>
    </Modal>
  );
}

/** Lets an administrator choose which active students of the matching grade belong to a class. */
export function ClassMembershipModal({
  group,
  onClose,
}: {
  group: AdminClass | null;
  onClose: () => void;
}) {
  const cache = useQueryClient();
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setError('');
    setSearch('');
    setMemberIds(
      (group?.students ?? [])
        .filter(({ student }) => isEligibleClassStudent(student, group?.grade))
        .map(({ studentId }) => studentId),
    );
  }, [group]);
  const candidates = useQuery({
    queryKey: ['admin', 'class-users', search, group?.grade],
    queryFn: () =>
      api<{ items: User[]; total: number }>(
        `/admin/users?limit=100&role=STUDENT&grade=${group!.grade}&search=${encodeURIComponent(search)}`,
      ),
    enabled: !!group,
  });
  return (
    <Modal
      open={!!group}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={tx('pages.admin.studentsIn', { value1: group?.name || '' })}
      description={tx('pages.admin.selectStudentsInTheMatchingGrade')}
    >
      <label className="search-input">
        <Search size={17} />
        <input
          aria-label={tx('pages.admin.searchStudents')}
          placeholder={tx('pages.admin.nameOrEmail')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <p className="subtle">{tx('pages.admin.selected', { value1: memberIds.length })}</p>
      <div className="membership-list">
        {candidates.data?.items
          .filter((user) => isEligibleClassStudent(user, group?.grade))
          .map((user) => (
            <label key={user.id}>
              <input
                type="checkbox"
                checked={memberIds.includes(user.id)}
                onChange={(e) =>
                  setMemberIds(
                    e.target.checked
                      ? [...memberIds, user.id]
                      : memberIds.filter((id) => id !== user.id),
                  )
                }
              />
              <span>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </span>
            </label>
          ))}
      </div>
      <FormError message={error} />
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          {tx('common.cancel')}
        </Button>
        <Button
          busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api(`/admin/classes/${group!.id}/students`, {
                method: 'PUT',
                body: { studentIds: memberIds },
              });
              await cache.invalidateQueries();
              onClose();
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {tx('pages.admin.avatars.save')}
        </Button>
      </div>
    </Modal>
  );
}
