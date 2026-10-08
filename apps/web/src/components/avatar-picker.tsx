import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AvatarOption, Profile } from '../lib/types';
import { api, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, EmptyState, ErrorState, Loading, Modal } from './ui';
import { UserAvatar } from './user-avatar';

export function AvatarPicker({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const cache = useQueryClient();
  const { reloadUser } = useAuth();
  const catalog = useQuery({
    queryKey: ['avatars'],
    queryFn: () => api<AvatarOption[]>('/avatars'),
    enabled: open,
  });
  const preview = catalog.data?.find((avatar) => avatar.id === selected) ?? profile.user.avatar;
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setSelected(profile.user.avatarId ?? null);
          setError('');
          setSaved(false);
          setOpen(true);
        }}
      >
        Avatar tanlash
      </Button>
      {saved && (
        <p className="profile-success" role="status">
          Avataringiz saqlandi.
        </p>
      )}
      <Modal
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
        title="Avatar tanlash"
        description="O‘zingizga yoqqan avatarni tanlang. Boshlang‘ich avatarlar bepul."
      >
        {catalog.isPending ? (
          <Loading />
        ) : catalog.error ? (
          <ErrorState error={catalog.error} retry={() => void catalog.refetch()} />
        ) : (
          <>
            <div className="avatar-selection-preview">
              <UserAvatar name={profile.user.name} avatar={preview} size="2xl" />
              <strong>{preview?.name ?? 'Sizning avataringiz'}</strong>
            </div>
            {catalog.data?.length ? (
              <fieldset className="avatar-grid">
                <legend className="sr-only">Avatarlar</legend>
                {catalog.data.map((avatar) => (
                  <label
                    key={avatar.id}
                    className={`avatar-choice ${selected === avatar.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="avatar-choice"
                      checked={selected === avatar.id}
                      onChange={() => setSelected(avatar.id)}
                      disabled={busy}
                    />
                    <img src={avatar.imageUrl} alt="" width="64" height="64" />
                    <span>{avatar.name}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <EmptyState title="Avatarlar hozircha mavjud emas" />
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
                Bekor qilish
              </Button>
              <Button
                disabled={
                  !selected ||
                  (selected === profile.user.avatarId &&
                    !profile.user.avatar?.imageUrl.startsWith('/api/v1/profile-photos/'))
                }
                busy={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    const updated = await api<Profile>('/users/me/profile', {
                      method: 'PATCH',
                      body: { avatarId: selected },
                    });
                    cache.setQueryData(['profile'], updated);
                    await reloadUser();
                    await cache.invalidateQueries({
                      predicate: (query) => query.queryKey[0] !== 'profile',
                    });
                    setSaved(true);
                    setOpen(false);
                  } catch (e) {
                    setError(errorText(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Avatarni saqlash
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
