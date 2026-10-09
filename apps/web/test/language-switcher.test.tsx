import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageSwitcher } from '../src/components/language-switcher';
import { AuthProvider } from '../src/lib/auth';
import { selectLocale } from '../src/i18n';

describe('LanguageSwitcher component redesign', () => {
  it('renders trigger with current language and opens modern dropdown', async () => {
    await selectLocale('uz', false);
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageSwitcher />
        </AuthProvider>
      </QueryClientProvider>,
    );

    const trigger = screen.getByRole('button', { name: /Interfeys tili: O‘zbekcha/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('UZ');

    // Click trigger to open dropdown
    await user.click(trigger);

    // Dropdown options should appear
    expect(await screen.findByRole('menuitem', { name: /Русский/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /English/i })).toBeInTheDocument();

    // Select Russian
    const ruItem = screen.getByRole('menuitem', { name: /Русский/i });
    await user.click(ruItem);

    // Language should update
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Язык интерфейса: Русский/i }),
      ).toBeInTheDocument();
    });
  });
});
