import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DateTimePicker } from '../src/components/ui/datetime-picker';

function TestDateTimePickerWrapper({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return (
    <div>
      <DateTimePicker
        id="deadline-picker"
        value={value}
        onChange={setValue}
        placeholder="Muddatni belgilang"
      />
      <div data-testid="output-value">{value}</div>
    </div>
  );
}

describe('shadcn/ui DateTimePicker component', () => {
  it('renders trigger with placeholder when empty', () => {
    render(<TestDateTimePickerWrapper initialValue="" />);
    const trigger = screen.getByRole('button', { name: /muddatni belgilang/i });
    expect(trigger).toBeInTheDocument();
  });

  it('renders human-readable formatted date and time when value is set', () => {
    render(<TestDateTimePickerWrapper initialValue="2026-10-15T18:00" />);
    const trigger = screen.getByRole('button', { name: /15-oktabr 2026, 18:00/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByTestId('output-value')).toHaveTextContent('2026-10-15T18:00');
  });

  it('opens popover on click and updates value when preset is clicked', async () => {
    const user = userEvent.setup();
    render(<TestDateTimePickerWrapper initialValue="" />);

    const trigger = screen.getByRole('button', { name: /muddatni belgilang/i });
    await user.click(trigger);

    // Preset buttons should be in the popover
    const todayBtn = await screen.findByRole('button', { name: /bugun 18:00/i });
    const tomorrowBtn = screen.getByRole('button', { name: /ertaga 18:00/i });
    expect(todayBtn).toBeInTheDocument();
    expect(tomorrowBtn).toBeInTheDocument();

    // Click tomorrow preset
    await user.click(tomorrowBtn);

    // Output value should have been updated with tomorrow 18:00
    const outputVal = screen.getByTestId('output-value').textContent;
    expect(outputVal).toMatch(/^\d{4}-\d{2}-\d{2}T18:00$/);
  });

  it('clears date and time when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<TestDateTimePickerWrapper initialValue="2026-10-20T18:00" />);

    const clearBtn = screen.getByTitle(/tozalash/i);
    expect(clearBtn).toBeInTheDocument();

    await user.click(clearBtn);
    expect(screen.getByTestId('output-value')).toHaveTextContent('');
    expect(screen.getByRole('button', { name: /muddatni belgilang/i })).toBeInTheDocument();
  });
});
