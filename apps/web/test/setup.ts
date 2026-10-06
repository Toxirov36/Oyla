import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setToken } from '../src/lib/api';
afterEach(() => {
  cleanup();
  setToken(null);
  vi.unstubAllGlobals();
});
