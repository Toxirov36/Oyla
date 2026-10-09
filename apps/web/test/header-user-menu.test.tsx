import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HeaderUserMenu } from '../src/components/header-user-menu';

describe('HeaderUserMenu and Avatar redesign', () => {
  it('renders avatar fallback initial and role badge', () => {
    render(
      <MemoryRouter>
        <HeaderUserMenu
          name="Dilshodbek Toxirov"
          secondaryInfo="Administrator · O‘qituvchi"
          email="dilshodbek@example.uz"
          onSignOut={vi.fn()}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', {
      name: 'Profil menyusi: Dilshodbek Toxirov',
    });
    expect(trigger).toBeVisible();

    const fallback = trigger.querySelector('[data-slot="avatar-fallback"]');
    expect(fallback).toHaveTextContent('D');

    const badge = trigger.querySelector('[data-slot="avatar-badge"]');
    expect(badge).not.toBeInTheDocument();

    expect(trigger).toHaveTextContent('Dilshodbek Toxirov');
    expect(trigger).toHaveTextContent('Administrator · O‘qituvchi');
  });

  it('opens dropdown menu with user header, items and handles signout', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <HeaderUserMenu
          name="Dilshodbek Toxirov"
          secondaryInfo="Administrator · O‘qituvchi"
          email="dilshodbek@example.uz"
          onSignOut={onSignOut}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', {
      name: 'Profil menyusi: Dilshodbek Toxirov',
    });

    await user.click(trigger);

    expect(screen.getByRole('menu')).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Profilim' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Sozlamalar' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Chiqish' })).toBeVisible();

    // Check email in menu header
    expect(screen.getByText('dilshodbek@example.uz')).toBeVisible();

    await user.click(screen.getByRole('menuitem', { name: 'Chiqish' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('displays error message if signout fails', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter>
        <HeaderUserMenu
          name="Dilshodbek Toxirov"
          secondaryInfo="Administrator"
          onSignOut={onSignOut}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', {
      name: 'Profil menyusi: Dilshodbek Toxirov',
    });

    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Chiqish' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Chiqishda xatolik yuz berdi. Qayta urinib ko‘ring.',
    );
  });
});
