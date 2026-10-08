import { expect, it } from 'vitest';
import { applyBrand, brand, brandDescription, brandTitle } from '../src/lib/brand';

it('applies central branding to browser metadata, favicon and main color tokens', () => {
  const head = document.head.innerHTML;
  document.head.innerHTML = '<meta name="description"><meta name="theme-color"><link rel="icon">';
  applyBrand();
  expect(document.title).toBe(brandTitle);
  expect(document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(
    brandDescription,
  );
  expect(document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.getAttribute('href')).toBe(
    brand.logo.favicon,
  );
  expect(document.documentElement.style.getPropertyValue('--primary')).toBe(brand.colors.primary);
  expect(document.documentElement.style.getPropertyValue('--navy')).toBe(brand.colors.navy);
  document.head.innerHTML = head;
});
