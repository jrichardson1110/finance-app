import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompanySearchInput } from './CompanySearchInput';

describe('CompanySearchInput', () => {
  it('renders a labelled text input and a disabled submit button when empty', () => {
    render(<CompanySearchInput onSubmit={() => {}} />);
    expect(screen.getByLabelText('Ticker symbol')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show chart' })).toBeDisabled();
  });

  it('enables the submit button for a valid ticker', async () => {
    render(<CompanySearchInput onSubmit={() => {}} />);
    await userEvent.setup().type(screen.getByLabelText('Ticker symbol'), 'NVDA');
    expect(screen.getByRole('button', { name: 'Show chart' })).toBeEnabled();
  });

  it('uppercases the symbol before calling onSubmit', async () => {
    const onSubmit = vi.fn();
    render(<CompanySearchInput onSubmit={onSubmit} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Ticker symbol'), 'nvda');
    await user.click(screen.getByRole('button', { name: 'Show chart' }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('NVDA');
  });

  it('shows an inline validation error and keeps the button disabled for illegal characters', async () => {
    render(<CompanySearchInput onSubmit={() => {}} />);
    await userEvent.setup().type(screen.getByLabelText('Ticker symbol'), '!!!');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('Ticker symbol')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Show chart' })).toBeDisabled();
  });

  it('marks the input as invalid for a symbol that is too long', async () => {
    render(<CompanySearchInput onSubmit={() => {}} />);
    await userEvent.setup().type(screen.getByLabelText('Ticker symbol'), 'TOOLONGSYMBOL');
    expect(screen.getByLabelText('Ticker symbol')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Show chart' })).toBeDisabled();
  });

  it('clears the validation error when the input becomes valid', async () => {
    render(<CompanySearchInput onSubmit={() => {}} />);
    const user = userEvent.setup();
    const input = screen.getByLabelText('Ticker symbol');
    await user.type(input, '!!!');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, 'IBM');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('submits on Enter key as well as button click', async () => {
    const onSubmit = vi.fn();
    render(<CompanySearchInput onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Ticker symbol');
    await userEvent.setup().type(input, 'IBM{Enter}');
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('IBM');
  });

  it('does not call onSubmit when the button is disabled', async () => {
    const onSubmit = vi.fn();
    render(<CompanySearchInput onSubmit={onSubmit} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Show chart' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
