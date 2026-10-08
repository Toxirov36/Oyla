import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Profile } from '../lib/types';
import { api, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Modal } from './ui';

export function ProfilePhoto({ profile }: { profile: Profile }) {
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
        onClick={() => {
          setError('');
          setSaved(false);
          setFile(null);
          setOpen(true);
        }}
      >
        Profil rasmi
      </Button>
      {saved && (
        <p role="status" className="profile-success">
          Profil rasmi yangilandi.
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
        title="Profil rasmi"
        description="5 MB gacha JPG, PNG yoki WebP rasm tanlang."
      >
        <label className="photo-file-input">
          Rasm tanlash
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
                setError('5 MB gacha JPG, PNG yoki WebP rasm tanlang.');
                setFile(null);
                return;
              }
              setFile(selected);
            }}
          />
        </label>
        {preview && <img className="photo-preview" src={preview} alt="Yangi profil rasmi" />}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          {profile.user.avatar?.imageUrl.startsWith('/api/v1/profile-photos/') && (
            <Button variant="secondary" disabled={busy} onClick={() => void update(true)}>
              Rasmni olib tashlash
            </Button>
          )}
          <Button disabled={!file} busy={busy} onClick={() => void update()}>
            Rasmni saqlash
          </Button>
        </div>
      </Modal>
    </>
  );
}
