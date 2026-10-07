import { test, expect } from './fixtures';

test('profile menu opens with keyboard, restores focus, navigates to settings and signs out', async ({
  page,
  learner,
}) => {
  await page.goto('/dashboard');
  const trigger = page.getByRole('button', {
    name: `Profil menyusi: ${learner.user.name}`,
    exact: true,
  });
  await expect(trigger.locator('[data-slot="avatar-fallback"]')).toHaveText('B');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Sozlamalar', exact: true }).click();
  await expect(page).toHaveURL(/\/profile#settings$/);
  await expect(page.getByRole('region', { name: 'Profil sozlamalari' })).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 0));
  await trigger.click();
  await page.getByRole('menuitem', { name: 'Chiqish', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/profile');
  await expect(page).toHaveURL(/\/login$/);
});
