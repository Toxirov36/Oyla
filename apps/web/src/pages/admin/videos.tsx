import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorText } from '../../lib/api';
import { subjectNames, type VideoLesson } from '../../lib/play';
import { Button, Card, ErrorState, Loading, Modal, PageHeader } from '../../components/ui';
import { ComboboxField } from '../../components/combobox-field';
import { VideoMedia } from '../../components/video-media';
type Editor = {
  id?: string;
  title: string;
  description: string;
  grade: number;
  subject: string;
  kind: 'ANIMATION' | 'YOUTUBE';
  animationKey: string;
  youtubeId: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  position: number;
};
function youtubeId(value: string) {
  if (/^[A-Za-z0-9_-]{11}$/.test(value.trim())) return value.trim();
  try {
    const url = new URL(value);
    if (
      ![
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'youtu.be',
        'www.youtube-nocookie.com',
      ].includes(url.hostname)
    )
      throw Error();
    const id = url.searchParams.get('v') ?? url.pathname.split('/').filter(Boolean).at(-1) ?? '';
    if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
  } catch {
    /* Fall through to the localized validation message. */
  }
  throw Error('YouTube video havolasi yoki 11 belgili ID kiriting.');
}
export default function AdminVideos() {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'video-lessons'],
    queryFn: () =>
      api<{
        items: VideoLesson[];
        animations: { key: string; title: string; grade: number; subject: string }[];
      }>('/admin/video-lessons'),
  });
  const [editor, setEditor] = useState<Editor | null>(null);
  const [preview, setPreview] = useState<VideoLesson | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} retry={() => void query.refetch()} />;
  const animations = query.data.animations.filter(
    (item) => item.grade === editor?.grade && item.subject === editor?.subject,
  );
  return (
    <>
      <PageHeader
        title="Videodarslar"
        description="Animatsiya yoki YouTube video qo‘shing, tekshiring va chop eting."
      />
      <Button
        onClick={() => {
          setError('');
          setEditor({
            title: '',
            description: '',
            grade: 5,
            subject: 'mathematics',
            kind: 'ANIMATION',
            animationKey: 'math-5',
            youtubeId: '',
            status: 'DRAFT',
            position: 0,
          });
        }}
      >
        Videodars qo‘shish
      </Button>
      <div className="admin-video-list">
        {query.data.items.map((video) => (
          <Card key={video.id}>
            <div>
              <span className="pill">
                {video.grade}-sinf · {subjectNames[video.subject]} · {video.status}
              </span>
              <h2>{video.title}</h2>
              <p>{video.description}</p>
            </div>
            <div className="play-actions">
              <Button
                variant="secondary"
                onClick={() => setPreview(video)}
                aria-label={`${video.title} videosini ko‘rish`}
              >
                Ko‘rish
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setError('');
                  setEditor({
                    ...video,
                    animationKey: video.animationKey ?? '',
                    youtubeId: video.youtubeId ?? '',
                  });
                }}
                aria-label={`${video.title} videosini tahrirlash`}
              >
                Tahrirlash
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Modal
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        title={preview?.title ?? 'Videodars'}
        wide
      >
        {preview && <VideoMedia key={preview.id} video={preview} />}
      </Modal>
      <Modal
        open={!!editor}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null);
        }}
        title={editor?.id ? 'Videodarsni tahrirlash' : 'Videodars qo‘shish'}
      >
        {editor && (
          <form
            className="video-editor"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError('');
              try {
                const { id, animationKey, youtubeId: input, ...rest } = editor;
                await api(`/admin/video-lessons${id ? `/${id}` : ''}`, {
                  method: id ? 'PATCH' : 'POST',
                  body: {
                    ...rest,
                    ...(editor.kind === 'ANIMATION'
                      ? { animationKey: animationKey || animations[0]?.key }
                      : { youtubeId: youtubeId(input) }),
                  },
                });
                await cache.invalidateQueries({ queryKey: ['admin', 'video-lessons'] });
                await cache.invalidateQueries({ queryKey: ['video-lessons'] });
                setEditor(null);
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Nomi
              <input
                required
                minLength={3}
                maxLength={150}
                value={editor.title}
                onChange={(e) => setEditor({ ...editor, title: e.target.value })}
              />
            </label>
            <label>
              Tavsif
              <textarea
                required
                minLength={5}
                maxLength={1000}
                value={editor.description}
                onChange={(e) => setEditor({ ...editor, description: e.target.value })}
              />
            </label>
            <ComboboxField
              label="Sinf"
              value={String(editor.grade)}
              options={[5, 6, 7].map((grade) => ({ value: String(grade), label: `${grade}-sinf` }))}
              onChange={(value) => setEditor({ ...editor, grade: Number(value), animationKey: '' })}
            />
            <ComboboxField
              label="Fan"
              value={editor.subject}
              options={Object.entries(subjectNames).map(([value, label]) => ({ value, label }))}
              onChange={(subject) => setEditor({ ...editor, subject, animationKey: '' })}
            />
            <ComboboxField
              label="Manba"
              value={editor.kind}
              options={[
                { value: 'ANIMATION', label: 'Animatsiya' },
                { value: 'YOUTUBE', label: 'YouTube' },
              ]}
              onChange={(kind) => setEditor({ ...editor, kind: kind as Editor['kind'] })}
            />
            {editor.kind === 'ANIMATION' ? (
              <ComboboxField
                label="Animatsiyali dars"
                value={editor.animationKey || animations[0]?.key || ''}
                options={animations.map((item) => ({ value: item.key, label: item.title }))}
                onChange={(animationKey) => setEditor({ ...editor, animationKey })}
              />
            ) : (
              <label>
                YouTube havolasi yoki ID
                <input
                  required
                  value={editor.youtubeId}
                  onChange={(e) => setEditor({ ...editor, youtubeId: e.target.value })}
                />
              </label>
            )}
            <ComboboxField
              label="Holat"
              value={editor.status}
              options={[
                { value: 'DRAFT', label: 'Qoralama' },
                { value: 'PUBLISHED', label: 'Chop etilgan' },
                { value: 'ARCHIVED', label: 'Arxiv' },
              ]}
              onChange={(status) => setEditor({ ...editor, status: status as Editor['status'] })}
            />
            <label>
              Tartib raqami
              <input
                type="number"
                min={0}
                max={10000}
                value={editor.position}
                onChange={(e) => setEditor({ ...editor, position: Number(e.target.value) })}
              />
            </label>
            {error && (
              <p role="alert" className="form-error">
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
