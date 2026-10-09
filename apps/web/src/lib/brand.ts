export const brand = {
  name: 'Bilify',
  wordmark: 'Bilify',
  wordmarkSuffix: '',
  tagline: 'O‘rgan. O‘yla. Yarat.',
  description: '5–7-sinf o‘quvchilari uchun o‘rganish, mashq va rivojlanish platformasi.',
  logo: {
    light: '/brand/bilify.svg',
    dark: '/brand/bilify.svg',
    favicon: '/brand/bilify-mark.svg',
    faviconType: 'image/svg+xml',
    width: 176,
    height: 69,
    showWordmark: false,
  },
  colors: {
    primary: '#0665f3',
    primaryDark: '#0750c8',
    navy: '#10182f',
    success: '#00776f',
    mint: '#1ee1b5',
    teal: '#01b4b0',
    purple: '#2d27e9',
    warning: '#f2994a',
    destructive: '#eb5757',
    background: '#f5f8fd',
    foreground: '#29364c',
    muted: '#607089',
    border: '#e2e9f4',
    card: '#ffffff',
    surface: '#edf2fa',
    blueSoft: '#edf3ff',
    mintSoft: '#e6faf5',
    purpleSoft: '#f0edff',
  },
} as const;
export const brandTitle = `${brand.name} — ${brand.tagline}`;
export const brandDescription = `${brand.name} — ${brand.description}`;

export function applyBrand(labels?: { tagline: string; description: string }) {
  document.title = labels ? `${brand.name} — ${labels.tagline}` : brandTitle;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (meta) meta.content = labels ? `${brand.name} — ${labels.description}` : brandDescription;
  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (theme) theme.content = brand.colors.navy;
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (favicon) {
    favicon.href = brand.logo.favicon;
    favicon.type = brand.logo.faviconType;
  }
  for (const [key, value] of Object.entries(brand.colors)) {
    document.documentElement.style.setProperty(
      `--${key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())}`,
      value,
    );
  }
}
