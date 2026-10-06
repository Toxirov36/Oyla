import { mathematics } from './mathematics';
import { english } from './english';
import { informatics } from './informatics';
import type { SeedSubject } from './types';

export const curriculum: SeedSubject[] = [
  {
    slug: 'mathematics',
    title: 'Matematika',
    description: 'Sonlardan algebra va geometriyagacha — o‘ylang, hisoblang, tekshiring.',
    grades: mathematics,
  },
  {
    slug: 'english',
    title: 'Ingliz tili',
    description: 'Sinfingizga mos grammatika, so‘zlar va mazmunli matnlar.',
    grades: english,
  },
  {
    slug: 'informatics',
    title: 'Informatika',
    description: 'Raqamli savodxonlikdan algoritm va ma’lumotlar bilan ishlashgacha.',
    grades: informatics,
  },
];
