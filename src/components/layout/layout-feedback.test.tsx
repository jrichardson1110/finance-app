import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorPanel } from '../feedback/ErrorPanel';
import { LoadingBlock } from '../feedback/LoadingBlock';
import { WindowSelector } from './WindowSelector';

describe('WindowSelector', () => {
  it('renders one button per window and marks only the selected one as pressed', () => {
    render(<WindowSelector value="week" onChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Current day', 'Last 7 days', 'Last quarter']);
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Current day' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('group', { name: 'Time window' })).toBeInTheDocument();
  });

  it('reports the chosen window', async () => {
    const onChange = vi.fn();
    render(<WindowSelector value="day" onChange={onChange} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Last quarter' }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('quarter');
  });
});

describe('ErrorPanel', () => {
  it('announces the message as an alert and offers no retry without a handler', () => {
    render(<ErrorPanel message="Quotes are currently unavailable." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Quotes are currently unavailable.');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('calls onRetry when Retry is clicked', async () => {
    const onRetry = vi.fn();
    render(<ErrorPanel message="Failed" onRetry={onRetry} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('LoadingBlock', () => {
  it('exposes its label as a polite status message', () => {
    render(<LoadingBlock label="Loading charts" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading charts');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });
});
