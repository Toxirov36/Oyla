import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../src/components/ui/select';

function TestSelectWrapper() {
  const [value, setValue] = useState('6');
  return (
    <div>
      <label htmlFor="grade-select">Sinfingiz</label>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id="grade-select" aria-label="Sinfingiz">
          <SelectValue placeholder={`${value}-sinf`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="5">5-sinf</SelectItem>
          <SelectItem value="6">6-sinf</SelectItem>
          <SelectItem value="7">7-sinf</SelectItem>
        </SelectContent>
      </Select>
      <div data-testid="selected-value">{value}</div>
    </div>
  );
}

describe('shadcn/ui Select component', () => {
  it('renders trigger with initial value and opens custom options on click', async () => {
    const user = userEvent.setup();
    render(<TestSelectWrapper />);

    const trigger = screen.getByRole('combobox', { name: /sinfingiz/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('6-sinf');

    // Click trigger to open select dropdown
    await user.click(trigger);

    // Options should appear with role="option"
    expect(await screen.findByRole('option', { name: /5-sinf/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /6-sinf/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /7-sinf/i })).toBeInTheDocument();

    // Select 7-sinf
    const option7 = screen.getByRole('option', { name: /7-sinf/i });
    await user.click(option7);

    // Selected value is updated
    expect(screen.getByTestId('selected-value')).toHaveTextContent('7');
    expect(trigger).toHaveTextContent('7-sinf');
  });
});
