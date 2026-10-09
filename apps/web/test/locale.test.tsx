import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import i18n, { getLocale, selectLocale, storedLocale, translate, localizeText } from '../src/i18n';
import uz from '../src/i18n/resources/uz/common.json';
import ru from '../src/i18n/resources/ru/common.json';
import en from '../src/i18n/resources/en/common.json';
import { HeaderUserMenu } from '../src/components/header-user-menu';
import { MemoryRouter } from 'react-router-dom';
import { ApiError, errorText } from '../src/lib/api';
import { formatDate, formatNumber } from '../src/lib/locale';
import { AdminOverview } from '../src/pages/admin/overview';
import { grades, roles, typeOptions } from '../src/pages/admin/config';
import { notificationBody } from '../src/lib/notifications';
import type { Analytics } from '../src/lib/types';

describe('interface localization', () => {
  it('updates a mounted admin body, statistics and activity table when the language changes', async () => {
    const data = {
      users: 14,
      students: 10,
      teachers: 3,
      published: 70,
      draft: 21,
      completedAttempts: 4,
      averageScore: 64,
      subjects: 3,
      lessons: 91,
      totalXp: 580,
      recent: [
        {
          id: 'activity',
          user: { name: 'Salim' },
          lesson: null,
          score: 80,
          earnedXp: 130,
          completedAt: '2026-10-07T10:00:00Z',
        },
      ],
    } as Analytics;
    render(
      <MemoryRouter>
        <AdminOverview data={data} />
      </MemoryRouter>,
    );
    await act(() => selectLocale('ru'));
    expect(screen.getByText('Опубликованные уроки')).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Активность' })).toBeVisible();
    expect(screen.queryByText('Chop etilgan darslar')).not.toBeInTheDocument();
    await act(() => selectLocale('en'));
    expect(screen.getByText('Published lessons')).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Activity' })).toBeVisible();
    expect(screen.getByText('Salim')).toBeVisible();
    expect(screen.getByText('80%')).toBeVisible();
  });
  it('refreshes previously imported editor options without changing their stored values', async () => {
    const originalValues = [grades, roles, typeOptions].map((options) =>
      options.map((option) => option.value),
    );
    await selectLocale('ru');
    expect(grades[0]!.label).toBe('5 класс');
    expect(roles[0]!.label).toBe('Ученик');
    expect(typeOptions[0]!.label).toBe(translate('exercise.MULTIPLE_CHOICE'));
    await selectLocale('en');
    expect(grades[0]!.label).toBe('Grade 5');
    expect(roles[0]!.label).toBe('Student');
    expect(typeOptions[0]!.label).toBe(translate('exercise.MULTIPLE_CHOICE'));
    expect(
      [grades, roles, typeOptions].map((options) => options.map((option) => option.value)),
    ).toEqual(originalValues);
  });
  it('localizes stored system messages and preserves custom content and user names', async () => {
    await selectLocale('en');
    expect(localizeText('Birinchi qadam')).toBe('First step');
    expect(localizeText('My custom badge')).toBe('My custom badge');
    expect(errorText(new ApiError('Sinf topilmadi.', 404))).toBe('Class not found.');
    expect(
      notificationBody('Yangi do‘stlik so‘rovi', 'Ali Valiyev sizni do‘stlikka taklif qildi.'),
    ).toBe('Ali Valiyev sent you a friend request.');
    expect(notificationBody('Yangi topshiriq', 'O‘qituvchi yozgan topshiriq')).toBe(
      'O‘qituvchi yozgan topshiriq',
    );
    const savedError = errorText(new ApiError('Sinf topilmadi.', 404));
    await selectLocale('ru');
    expect(localizeText(savedError)).toBe('Класс не найден.');
    expect(
      notificationBody('Brain Ring taklifi', 'Ali sizni bilim bellashuviga taklif qildi.'),
    ).toBe('Ali приглашает вас на соревнование знаний.');
  });
  it('keeps translation keys and interpolation parameters in sync', () => {
    const keys = Object.keys(uz).sort();
    for (const resource of [ru, en]) {
      expect(Object.keys(resource).sort()).toEqual(keys);
      for (const key of keys) {
        const message = resource[key as keyof typeof uz];
        expect(message.trim()).not.toBe('');
        const parameters = (text: string) =>
          [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
        expect(parameters(message), key).toEqual(parameters(uz[key as keyof typeof uz]));
      }
    }
  });
  it('saves a manual choice and updates the document language', async () => {
    await selectLocale('ru');
    expect(getLocale()).toBe('ru');
    expect(document.documentElement.lang).toBe('ru');
    expect(storedLocale()).toEqual({ locale: 'ru', manual: true });
    await expect(selectLocale('de' as 'uz')).rejects.toThrow('Unsupported');
    expect(getLocale()).toBe('ru');
  });
  it('keeps a manual language choice usable when browser storage is blocked', async () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    try {
      await selectLocale('en');
      expect(getLocale()).toBe('en');
      expect(storedLocale()).toEqual({ locale: 'en', manual: true });
    } finally {
      read.mockRestore();
      write.mockRestore();
    }
  });
  it('uses Russian plural forms and preserves the Tashkent calendar date', async () => {
    await selectLocale('ru');
    expect(translate('common.days', { count: 1 })).toBe('1 день');
    expect(translate('common.days', { count: 2 })).toBe('2 дня');
    expect(translate('common.days', { count: 5 })).toBe('5 дней');
    expect(formatDate('2026-01-31T20:30:00Z')).toContain('1 февраля');
    await selectLocale('en');
    expect(formatDate('2026-01-31T20:30:00Z')).toBe('February 1');
    expect(formatNumber(12345)).toBe('12,345');
  });
  it('falls back to Uzbek and displays errors in the current language', async () => {
    await selectLocale('en');
    const error = new ApiError('Original message', 401, [], 'AUTH_INVALID_CREDENTIALS');
    expect(errorText(error)).toBe('Incorrect email or password.');
    await selectLocale('ru');
    expect(errorText(error)).toBe('Неверный email или пароль.');
    i18n.addResource('uz', 'common', 'locale-test-fallback', 'O‘zbekcha zaxira');
    expect(translate('locale-test-fallback')).toBe('O‘zbekcha zaxira');
  });
  it('renders translated accessible profile menu labels without changing user names', async () => {
    await selectLocale('en');
    render(
      <MemoryRouter>
        <HeaderUserMenu
          name="Ali Valiyev"
          secondaryInfo="Student"
          role="STUDENT"
          onSignOut={async () => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Profile menu: Ali Valiyev' })).toBeVisible();
    expect(screen.getByText('Ali Valiyev')).toBeVisible();
  });
});
