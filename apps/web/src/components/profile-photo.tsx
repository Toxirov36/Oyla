import { localizeText } from '../i18n';
import { useI18n } from '../i18n';
import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Profile } from '../lib/types';
import { api, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Modal } from './ui';

export function ProfilePhoto({ profile }: { profile: Profile }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const cache = useQueryClient();
  const { reloadUser } = useAuth();
  useEffect(() => {
    if (!file) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const update = async (remove = false) => {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      if (file) form.append('file', file);
      const data = await api<Profile>('/users/me/photo', {
        method: remove ? 'DELETE' : 'POST',
        ...(remove ? {} : { body: form }),
      });
      cache.setQueryData(['profile'], data);
      await reloadUser();
      await cache.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'profile' });
      setSaved(true);
      setFile(null);
      setOpen(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button
        variant="secondary"
        className="profile-action-btn"
        onClick={() => {
          setError('');
          setSaved(false);
          setFile(null);
          setOpen(true);
        }}
      >
        <Camera size={15} className="btn-icon" />
        {t('profile.photo')}
      </Button>
      {saved && (
        <p role="status" className="profile-success">
          {t('profile.photoSaved')}
        </p>
      )}
      <Modal
        open={open}
        onOpenChange={(value) => {
          if (!busy) {
            setOpen(value);
            if (!value) setFile(null);
          }
        }}
        title={t('profile.photo')}
        description={t('profile.photoHelp')}
      >
        <label className="photo-file-input">
          {t('profile.choosePhoto')}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              const selected = event.target.files?.[0];
              setError('');
              if (!selected) return;
              if (
                !['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) ||
                selected.size > 5 * 1024 * 1024
              ) {
                setError(t('profile.photoHelp'));
                setFile(null);
                return;
              }
              setFile(selected);
            }}
          />
        </label>
        {preview && <img className="photo-preview" src={preview} alt={t('profile.newPhoto')} />}
        {error && (
          <p role="alert" className="form-error">
            {localizeText(error)}
          </p>
        )}
        <div className="modal-actions">
          {profile.user.avatar?.imageUrl.startsWith('/api/v1/profile-photos/') && (
            <Button variant="secondary" disabled={busy} onClick={() => void update(true)}>
              {t('profile.removePhoto')}
            </Button>
          )}
          <Button disabled={!file} busy={busy} onClick={() => void update()}>
            {t('profile.savePhoto')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
