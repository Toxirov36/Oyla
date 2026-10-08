import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AvatarOption } from '../../lib/types';
import { api, errorText } from '../../lib/api';
import { Button, Card, ErrorState, Loading, Modal, PageHeader } from '../../components/ui';
import { ComboboxField } from '../../components/combobox-field';
import { UserAvatar } from '../../components/user-avatar';

export default function AdminAvatars() {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'avatars'],
    queryFn: () => api<{ items: AvatarOption[]; assets: AvatarOption[] }>('/admin/avatars'),
  });
  const [editor, setEditor] = useState<{
    id?: string;
    name: string;
    imageUrl: string;
    active: boolean;
    position: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  return (
    <>
      <PageHeader
        title="Avatarlar katalogi"
        description="Tekshirilgan avatarlar, ularning nomi va ko‘rinishini boshqaring."
      />
      <Button
        onClick={() => {
          setError('');
          setEditor({
            name: '',
            imageUrl: query.data.assets[0]!.imageUrl,
            active: true,
            position: query.data.items.length,
          });
        }}
      >
        Avatar qo‘shish
      </Button>
      <div className="admin-avatar-grid">
        {query.data.items.map((avatar) => (
          <Card key={avatar.id} className="admin-avatar-card">
            <UserAvatar name={avatar.name} avatar={avatar} size="2xl" />
            <h2>{avatar.name}</h2>
            <span className="pill">
              {avatar.active ? 'Faol · bepul' : 'Katalogdan yashirilgan'}
            </span>
            <Button
              variant="secondary"
              onClick={() => {
                setError('');
                setEditor({
                  id: avatar.id,
                  name: avatar.name,
                  imageUrl: avatar.imageUrl,
                  active: avatar.active ?? true,
                  position: avatar.position ?? 0,
                });
              }}
              aria-label={`${avatar.name} avatarini tahrirlash`}
            >
              Tahrirlash
            </Button>
          </Card>
        ))}
      </div>
      <Modal
        open={!!editor}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null);
        }}
        title={editor?.id ? 'Avatarni tahrirlash' : 'Avatar qo‘shish'}
      >
        {editor && (
          <form
            className="avatar-editor-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError('');
              try {
                const { id, ...body } = editor;
                await api(`/admin/avatars${id ? `/${id}` : ''}`, {
                  method: id ? 'PATCH' : 'POST',
                  body,
                });
                await cache.invalidateQueries({ queryKey: ['admin', 'avatars'] });
                await cache.invalidateQueries({ queryKey: ['avatars'] });
                await cache.invalidateQueries({ queryKey: ['profile'] });
                setEditor(null);
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="avatar-selection-preview">
              <UserAvatar
                name={editor.name || 'Avatar'}
                avatar={{
                  id: editor.id ?? 'preview',
                  name: editor.name || 'Avatar',
                  imageUrl: editor.imageUrl,
                }}
                size="2xl"
              />
            </div>
            <label>
              Nomi
              <input
                required
                minLength={2}
                maxLength={60}
                value={editor.name}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
              />
            </label>
            <label>
              Tekshirilgan rasm
              <ComboboxField
                label="Tekshirilgan rasm"
                value={editor.imageUrl}
                options={query.data.assets.map((asset) => ({
                  value: asset.imageUrl,
                  label: asset.name,
                }))}
                onChange={(imageUrl) => setEditor({ ...editor, imageUrl })}
              />
            </label>
            <label>
              Tartib raqami
              <input
                type="number"
                min={0}
                max={1000}
                required
                value={editor.position}
                onChange={(e) => setEditor({ ...editor, position: Number(e.target.value) })}
              />
            </label>
            <label className="avatar-active">
              <input
                type="checkbox"
                checked={editor.active}
                onChange={(e) => setEditor({ ...editor, active: e.target.checked })}
              />
              Tanlash katalogida ko‘rsatish
            </label>
            <p className="field-help">
              Yashirilgan avatarni yangi tanlovda olish mumkin bo‘lmaydi. Avval tanlagan
              foydalanuvchilarda rasmi ko‘rinadi.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setEditor(null)}
              >
                Bekor qilish
              </Button>
              <Button type="submit" busy={busy}>
                Saqlash
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
