import { localizeText } from '../../i18n';
import { translate as tx, useI18n as usePageLocale } from '../../i18n';
import { useState } from 'react';
import { api, errorText } from '../../lib/api';
import type { User } from '../../lib/types';
import { Button, dateLabel } from '../../components/ui';

export function AdminPasswordReset({ user }: { user: User }) {
  usePageLocale();
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
        {tx('pages.admin.password-reset.shareTheLinkAfterVerifyingTheUsersIdentity')}
      </p>
      {result ? (
        <>
          <label>
            {tx('pages.admin.password-reset.recoveryLink')}
            <input
              type="text"
              readOnly
              value={result.resetUrl}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <p className="field-help">
            {tx('pages.admin.password-reset.validUntilResettingThePasswordEndsAllSessions', {
              value1: dateLabel(result.expiresAt),
            })}
          </p>
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(result.resetUrl);
                setCopied(true);
              } catch {
                setError(tx('pages.admin.password-reset.selectTheLinkAndCopyItWithCtrlc'));
              }
            }}
          >
            {tx('pages.admin.password-reset.copyLink')}
          </Button>
          {copied && <p role="status">{tx('pages.admin.password-reset.linkCopied')}</p>}
        </>
      ) : (
        <Button onClick={() => void issue()} busy={busy}>
          {tx('pages.admin.password-reset.createASingleuseLink')}
        </Button>
      )}
      {error && (
        <p className="form-error" role="alert">
          {localizeText(error)}
        </p>
      )}
    </div>
  );
}
