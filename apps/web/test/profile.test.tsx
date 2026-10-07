import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/lib/auth';
import App from '../src/app';
import type { Profile, Role } from '../src/lib/types';

function fixture(role: Role = 'STUDENT'): Profile {
  return {
    user: {
      id: '73933e41-9215-48ad-b535-354c7559a5fa',
      name: 'Ali Unit',
      email: 'ali-unit@example.uz',
      role,
      createdAt: '2026-01-15T10:00:00Z',
      student: role === 'STUDENT' ? { grade: 6 } : null,
    },
    student:
      role === 'STUDENT'
        ? {
            totalXp: 280,
            level: 2,
            levelTitle: 'Izlanuvchi',
            levelThreshold: 200,
            nextLevelThreshold: 500,
            streak: 3,
            longestStreak: 5,
            completedLessons: 4,
            badges: 2,
            classes: [
              { id: 'class-fixture', name: '6-A', grade: 6, teacher: { name: 'Aziza Unit' } },
            ],
          }
        : null,
    teacher:
      role === 'TEACHER'
        ? {
            classes: [{ id: 'class-fixture', name: '6-A', grade: 6, _count: { students: 12 } }],
            students: 12,
            assignments: 3,
          }
        : null,
  };
}
function mount(profile = fixture(), options: { anonymous?: boolean; failProfile?: boolean } = {}) {
  let current = profile;
  let failProfile = !!options.failProfile;
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    const path = new URL(url, 'http://localhost').pathname;
    if (path === '/api/v1/auth/refresh')
      return options.anonymous
        ? Response.json({ message: 'Tizimga kiring.' }, { status: 401 })
        : Response.json({ accessToken: 'unit-session', user: current.user });
    if (path === '/api/v1/auth/me') return Response.json(current.user);
    if (path === '/api/v1/notifications/unread-count') return Response.json({ unreadCount: 0 });
    if (path === '/api/v1/users/me/profile') {
      if (failProfile)
        return Response.json({ message: 'Profilni yuklashda xatolik.' }, { status: 503 });
      if (init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as { name: string };
        current = { ...current, user: { ...current.user, name: body.name } };
      }
      return Response.json(current);
    }
    throw new Error(`Unexpected unit request: ${path}`);
  });
  vi.stubGlobal('fetch', fetcher);
  const query = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={query}>
      <MemoryRouter initialEntries={['/profile']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return {
    fetcher,
    user: userEvent.setup(),
    recover: () => {
      failProfile = false;
    },
  };
}
describe('profile page', () => {
  it('loads real-shaped student metrics and keeps email/grade read only', async () => {
    mount();
    expect(await screen.findByRole('heading', { name: 'Mening profilim' })).toBeVisible();
    expect(screen.getByLabelText('Ism va familiya')).toHaveValue('Ali Unit');
    expect(screen.getByLabelText('Email manzili')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Sinfingiz')).toHaveValue('6-sinf');
    expect(screen.getByLabelText('Sinfingiz')).toHaveAttribute('readonly');
    expect(screen.getByText('280 XP')).toBeVisible();
    expect(screen.getByText('Aziza Unit')).toBeVisible();
    expect(screen.getByRole('button', { name: 'O‘zgarishlarni saqlash' })).toBeDisabled();
  });
  it('rejects a blank name before making a PATCH request', async () => {
    const { user, fetcher } = mount();
    const input = await screen.findByLabelText('Ism va familiya');
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'O‘zgarishlarni saqlash' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ism kamida 2 ta belgidan');
    expect(fetcher.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
  });
  it('saves only the name and updates both the profile and account header', async () => {
    const { user, fetcher } = mount();
    const input = await screen.findByLabelText('Ism va familiya');
    await user.clear(input);
    await user.type(input, 'Madina Unit');
    await user.click(screen.getByRole('button', { name: 'O‘zgarishlarni saqlash' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Profilingiz saqlandi.');
    expect(screen.getByRole('button', { name: /^Profil menyusi:/ })).toHaveTextContent(
      'Madina Unit',
    );
    const request = fetcher.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({ name: 'Madina Unit' });
    expect(screen.getByRole('button', { name: 'O‘zgarishlarni saqlash' })).toBeDisabled();
  });
  it('shows teacher statistics without student grade or XP', async () => {
    mount(fixture('TEACHER'));
    expect(await screen.findByRole('heading', { name: 'Mening profilim' })).toBeVisible();
    expect(screen.getByText('O‘quvchilarim')).toBeVisible();
    expect(screen.queryByLabelText('Sinfingiz')).not.toBeInTheDocument();
    expect(screen.queryByText('Bilim darajangiz')).not.toBeInTheDocument();
  });
  it('shows administrator identity without fabricated learning statistics', async () => {
    mount(fixture('ADMIN'));
    expect(await screen.findByLabelText('Ism va familiya')).toHaveValue('Ali Unit');
    expect(screen.queryByText('Yakunlangan darslar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Profil menyusi:/ })).toHaveTextContent(
      'Administrator',
    );
  });
  it('recovers from a failed profile fetch through the retry action', async () => {
    const { user, recover } = mount(fixture(), { failProfile: true });
    expect(await screen.findByRole('alert')).toHaveTextContent('Profilni yuklashda xatolik.');
    recover();
    await user.click(screen.getByRole('button', { name: 'Qayta urinish' }));
    expect(await screen.findByLabelText('Ism va familiya')).toHaveValue('Ali Unit');
  });
  it('redirects anonymous users to login without fetching a profile', async () => {
    const { fetcher } = mount(fixture(), { anonymous: true });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tizimga kirish' })).toBeVisible(),
    );
    expect(fetcher.mock.calls.some(([input]) => String(input).includes('/users/me/profile'))).toBe(
      false,
    );
  });
});
