import { useState } from 'react';
import { api, errorText } from '../../lib/api';
import type { User } from '../../lib/types';
import { Button, dateLabel } from '../../components/ui';

export function AdminPasswordReset({ user }: { user: User }) {
  const [result, setResult] = useState<{ resetUrl: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const issue = async () => {
    setBusy(true);
    setError('');
    try {
      setResult(await api(`/admin/users/${user.id}/password-reset`, { method: 'POST' }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="editor-form">
      <p>
        <strong>{user.name}</strong>
        <br />
        {user.email}
      </p>
      <p className="field-help">
        Foydalanuvchining kimligini tekshirgandan so‘ng havolani unga bering. Havola 15 daqiqa amal
        qiladi va bir marta ishlatiladi. Yangi havola avvalgisini bekor qiladi.
      </p>
      {result ? (
        <>
          <label>
            Tiklash havolasi
            <input
              type="text"
              readOnly
              value={result.resetUrl}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <p className="field-help">
            {dateLabel(result.expiresAt)} gacha amal qiladi. Parol tiklanganda barcha sessiyalar
            tugaydi.
          </p>
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(result.resetUrl);
                setCopied(true);
              } catch {
                setError('Havolani tanlab, Ctrl+C bilan nusxalang.');
              }
            }}
          >
            Havolani nusxalash
          </Button>
          {copied && <p role="status">Havola nusxalandi.</p>}
        </>
      ) : (
        <Button onClick={() => void issue()} busy={busy}>
          Bir martalik havola yaratish
        </Button>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
