import { BadRequestException } from '@nestjs/common';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

export function youtubeVideoId(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error();

    let id = '';
    if (url.hostname === 'youtu.be') {
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length === 1) id = segments[0];
    } else if (YOUTUBE_HOSTS.has(url.hostname)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') ?? '';
      else {
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length === 2 && ['embed', 'shorts', 'live'].includes(segments[0]))
          id = segments[1];
      }
    } else if (url.hostname === 'www.youtube-nocookie.com') {
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length === 2 && segments[0] === 'embed') id = segments[1];
    }
    if (YOUTUBE_ID.test(id)) return id;
  } catch {
    // Invalid URLs use the same validation message as unsupported YouTube links.
  }
  throw new BadRequestException('To‘g‘ri YouTube video havolasini kiriting.');
}
