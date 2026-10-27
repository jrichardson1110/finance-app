import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompanySearchInput } from './CompanySearchInput';

describe('CompanySearchInput', () => {
  it('renders a labelled text input', () => {
    render(<CompanySearchInput value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox', { name: 'Company ticker symbol' })).toBeInTheDocument();
    expect(screen.getByLabelText('Company ticker symbol')).toBeInTheDocument();
  });

  it('displays the current value', () => {
    render(<CompanySearchInput value="IBM" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('IBM');
  });

  it('normalises lowercase to uppercase on each keystroke', async () => {
    const onChange = vi.fn();
    render(<CompanySearchInput value="" onChange={onChange} />);
    await userEvent.setup().type(screen.getByRole('textbox'), 'aapl');
    // The component is controlled: onChange is called once per character with
    // the uppercase version of that character only (the parent owns accumulation).
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange).toHaveBeenNthCalledWith(1, 'A');
    expect(onChange).toHaveBeenNthCalledWith(2, 'A');
    expect(onChange).toHaveBeenNthCalledWith(3, 'P');
    expect(onChange).toHaveBeenNthCalledWith(4, 'L');
  });

  it('calls onChange with an empty string when the field is cleared', async () => {
    const onChange = vi.fn();
    render(<CompanySearchInput value="IBM" onChange={onChange} />);
    await userEvent.setup().clear(screen.getByRole('textbox'));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('does not call onChange for characters that cannot appear in a symbol', async () => {
    const onChange = vi.fn();
    render(<CompanySearchInput value="" onChange={onChange} />);
    await userEvent.setup().type(screen.getByRole('textbox'), ' !@#');
    expect(onChange).not.toHaveBeenCalled();
  });
});
