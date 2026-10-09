import { localizeText } from '../i18n';
import { useI18n } from '../i18n';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AvatarOption, Profile } from '../lib/types';
import { api, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, EmptyState, ErrorState, Loading, Modal } from './ui';
import { UserAvatar } from './user-avatar';

export function AvatarPicker({ profile }: { profile: Profile }) {
  const { t } = useI18n();
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
        className="profile-action-btn"
        onClick={() => {
          setSelected(profile.user.avatarId ?? null);
          setError('');
          setSaved(false);
          setOpen(true);
        }}
      >
        <Sparkles size={15} className="btn-icon" />
        {t('profile.avatarChoose')}
      </Button>
      {saved && (
        <p className="profile-success" role="status">
          {t('profile.avatarSaved')}
        </p>
      )}
      <Modal
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
        title={t('profile.avatarChoose')}
        description={t('profile.avatarHelp')}
      >
        {catalog.isPending ? (
          <Loading />
        ) : catalog.error ? (
          <ErrorState error={catalog.error} retry={() => void catalog.refetch()} />
        ) : (
          <>
            <div className="avatar-selection-preview">
              <UserAvatar name={profile.user.name} avatar={preview} size="2xl" />
              <strong>{localizeText(preview?.name) || t('profile.avatarPreview')}</strong>
            </div>
            {catalog.data?.length ? (
              <fieldset className="avatar-grid">
                <legend className="sr-only">{t('profile.avatars')}</legend>
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
                    <span>{localizeText(avatar.name)}</span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <EmptyState title={t('profile.noAvatars')} />
            )}
            {error && (
              <p className="form-error" role="alert">
                {localizeText(error)}
              </p>
            )}
            <div className="modal-actions">
              <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
                {t('common.cancel')}
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
                {t('profile.saveAvatar')}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
