import { localizeText } from '../../i18n';
import { translate as tx, useI18n as usePageLocale } from '../../i18n';
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
  throw Error(tx('pages.admin.videos.enterAYoutubeVideoLinkOrAn11character'));
}
export default function AdminVideos() {
  usePageLocale();
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
        title={tx('navigation.videos')}
        description={tx('pages.admin.videos.addReviewAndPublishAnimationsOrYoutubeVideos')}
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
          });
        }}
      >
        {tx('pages.admin.videos.addVideoLesson')}
      </Button>
      <div className="admin-video-list">
        {query.data.items.map((video) => (
          <Card key={video.id}>
            <div>
              <span className="pill">
                {tx('pages.admin.videos.grade', {
                  value1: video.grade,
                  value2: subjectNames[video.subject],
                  value3: video.status,
                })}
              </span>
              <h2>{localizeText(video.title)}</h2>
              <p>{localizeText(video.description)}</p>
            </div>
            <div className="play-actions">
              <Button
                variant="secondary"
                onClick={() => setPreview(video)}
                aria-label={tx('pages.admin.videos.watchVideo', { value1: video.title })}
              >
                {tx('pages.admin.videos.view')}
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
                aria-label={tx('pages.admin.videos.editVideo', { value1: video.title })}
              >
                {tx('pages.admin.avatars.edit')}
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
        title={preview?.title ?? tx('pages.admin.videos.videoLesson')}
        wide
      >
        {preview && <VideoMedia key={preview.id} video={preview} />}
      </Modal>
      <Modal
        open={!!editor}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null);
        }}
        title={
          editor?.id
            ? tx('pages.admin.videos.editVideoLesson')
            : tx('pages.admin.videos.addVideoLesson')
        }
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
                const videoData = {
                  title: rest.title,
                  description: rest.description,
                  grade: rest.grade,
                  subject: rest.subject,
                  kind: rest.kind,
                  status: rest.status,
                  ...(editor.kind === 'ANIMATION'
                    ? { animationKey: animationKey || animations[0]?.key }
                    : { youtubeId: youtubeId(input) }),
                };
                await api(`/admin/video-lessons${id ? `/${id}` : ''}`, {
                  method: id ? 'PATCH' : 'POST',
                  body: videoData,
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
              {tx('pages.admin.avatars.name')}
              <input
                required
                minLength={3}
                maxLength={150}
                value={editor.title}
                onChange={(e) => setEditor({ ...editor, title: e.target.value })}
              />
            </label>
            <label>
              {tx('pages.admin.videos.description')}
              <textarea
                required
                minLength={5}
                maxLength={1000}
                value={editor.description}
                onChange={(e) => setEditor({ ...editor, description: e.target.value })}
              />
            </label>
            <ComboboxField
              label={tx('pages.admin.users.grade')}
              value={String(editor.grade)}
              options={[5, 6, 7].map((grade) => ({
                value: String(grade),
                get label() {
                  return tx('common.grade', { grade });
                },
              }))}
              onChange={(value) => setEditor({ ...editor, grade: Number(value), animationKey: '' })}
            />
            <ComboboxField
              label={tx('pages.admin.videos.subject')}
              value={editor.subject}
              options={Object.entries(subjectNames).map(([value, label]) => ({ value, label }))}
              onChange={(subject) => setEditor({ ...editor, subject, animationKey: '' })}
            />
            <ComboboxField
              label={tx('pages.admin.videos.source')}
              value={editor.kind}
              options={[
                {
                  value: 'ANIMATION',
                  get label() {
                    return tx('pages.admin.videos.animation');
                  },
                },
                { value: 'YOUTUBE', label: 'YouTube' },
              ]}
              onChange={(kind) => setEditor({ ...editor, kind: kind as Editor['kind'] })}
            />
            {editor.kind === 'ANIMATION' ? (
              <ComboboxField
                label={tx('pages.admin.videos.animatedLesson')}
                value={editor.animationKey || animations[0]?.key || ''}
                options={animations.map((item) => ({
                  value: item.key,
                  label: localizeText(item.title),
                }))}
                onChange={(animationKey) => setEditor({ ...editor, animationKey })}
              />
            ) : (
              <label>
                {tx('pages.admin.videos.youtubeLinkOrId')}
                <input
                  required
                  value={editor.youtubeId}
                  onChange={(e) => setEditor({ ...editor, youtubeId: e.target.value })}
                />
              </label>
            )}
            <ComboboxField
              label={tx('pages.admin.users.status')}
              value={editor.status}
              options={[
                {
                  value: 'DRAFT',
                  get label() {
                    return tx('common.draft');
                  },
                },
                {
                  value: 'PUBLISHED',
                  get label() {
                    return tx('common.published');
                  },
                },
                {
                  value: 'ARCHIVED',
                  get label() {
                    return tx('common.archived');
                  },
                },
              ]}
              onChange={(status) => setEditor({ ...editor, status: status as Editor['status'] })}
            />
            {error && (
              <p role="alert" className="form-error">
                {localizeText(error)}
              </p>
            )}
            <div className="modal-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setEditor(null)}
              >
                {tx('common.cancel')}
              </Button>
              <Button type="submit" busy={busy}>
                {tx('pages.admin.avatars.save')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
