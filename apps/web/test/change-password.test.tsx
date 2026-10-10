import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ChangePasswordForm } from '../src/components/change-password';

describe('ChangePasswordForm password visibility toggles', () => {
  it('toggles visibility between password and text for each field independently', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ChangePasswordForm />
      </MemoryRouter>,
    );

    const currentInput = screen.getByLabelText(/hozirgi parol/i);
    const newInput = screen.getByLabelText(/^yangi parol$/i);
    const confirmInput = screen.getByLabelText(/yangi parolni takrorlang/i);

    // Initial state: all are hidden
    expect(currentInput).toHaveAttribute('type', 'password');
    expect(newInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    // Find all show/hide buttons
    const toggleButtons = screen.getAllByRole('button', { name: /parolni ko‘rsatish/i });
    expect(toggleButtons).toHaveLength(3);

    // Click first toggle (current password)
    await user.click(toggleButtons[0]);
    expect(currentInput).toHaveAttribute('type', 'text');
    expect(newInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    // Click second toggle (new password)
    await user.click(toggleButtons[1]);
    expect(currentInput).toHaveAttribute('type', 'text');
    expect(newInput).toHaveAttribute('type', 'text');
    expect(confirmInput).toHaveAttribute('type', 'password');

    // Toggle current password back to hidden
    const hideButtons = screen.getAllByRole('button', { name: /parolni yashirish/i });
    expect(hideButtons).toHaveLength(2);
    await user.click(hideButtons[0]);
    expect(currentInput).toHaveAttribute('type', 'password');
    expect(newInput).toHaveAttribute('type', 'text');
  });
});
