import { TIME_WINDOWS, WINDOW_CONFIG } from '../../config/windows';
import type { TimeWindow } from '../../types';

interface WindowSelectorProps {
  value: TimeWindow;
  onChange: (window: TimeWindow) => void;
}

/** Segmented control for choosing the dashboard time window. */
export function WindowSelector({ value, onChange }: WindowSelectorProps) {
  return (
    <div className="window-selector" role="group" aria-label="Time window">
      {TIME_WINDOWS.map((window) => (
        <button
          key={window}
          type="button"
          className="window-selector__button"
          aria-pressed={window === value}
          onClick={() => onChange(window)}
        >
          {WINDOW_CONFIG[window].label}
        </button>
      ))}
    </div>
  );
}
