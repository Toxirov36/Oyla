import { useState } from 'react';
import { Download, Paperclip } from 'lucide-react';
import { translate as tx, useI18n as usePageLocale } from '../i18n';
import { api, errorText } from '../lib/api';

export type AssignmentAttachmentItem = {
  id: string;
  name: string;
  contentType: string;
  size: number;
};

export function AssignmentAttachments({ attachments }: { attachments?: AssignmentAttachmentItem[] }) {
  usePageLocale();
  const [error, setError] = useState('');
  if (!attachments?.length) return null;
  const download = async (file: AssignmentAttachmentItem) => {
    setError('');
    try {
      const blob = await api<Blob>(`/teacher/assignment-attachments/${file.id}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(errorText(cause));
    }
  };
  return (
    <div className="assignment-attachments">
      <div className="assignment-attachments-title"><Paperclip size={15} />{tx('pages.teacher.assignmentAttachments')}</div>
      <ul>
        {attachments.map((file) => (
          <li key={file.id}>
            <span>{file.name}</span>
            <button type="button" onClick={() => void download(file)} aria-label={`${tx('pages.teacher.downloadAssignmentFile')}: ${file.name}`}>
              <Download size={15} />
              {tx('pages.teacher.downloadAssignmentFile')}
            </button>
          </li>
        ))}
      </ul>
      {error && <small role="alert" className="form-error">{error}</small>}
    </div>
  );
}
