import { expect, it, vi } from 'vitest';
import { api, setToken } from '../src/lib/api';
it('multipart uploads preserve their boundary and authenticated media uses binary responses', async () => {
  setToken('test-token');
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ ok: true }))
    .mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/webp' } }),
    );
  vi.stubGlobal('fetch', fetcher);
  const form = new FormData();
  form.append('file', new File(['photo'], 'photo.png', { type: 'image/png' }));
  await api('/users/me/photo', { method: 'POST', body: form });
  const options = fetcher.mock.calls[0]![1];
  expect(options.body).toBe(form);
  expect(options.headers['Content-Type']).toBeUndefined();
  expect(options.headers.Authorization).toBe('Bearer test-token');
  const photo = await api<Blob>('/profile-photos/id', { responseType: 'blob' });
  expect(photo.size).toBe(3);
});
