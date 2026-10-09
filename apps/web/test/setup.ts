import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setToken } from '../src/lib/api';
import { selectLocale } from '../src/i18n';

if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.setPointerCapture = () => {};
  window.HTMLElement.prototype.releasePointerCapture = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
afterEach(async () => {
  cleanup();
  setToken(null);
  vi.unstubAllGlobals();
  await selectLocale('uz', false);
  localStorage.removeItem('bilify.locale');
  localStorage.removeItem('bilify.locale.manual');
});
