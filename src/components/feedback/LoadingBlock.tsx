interface LoadingBlockProps {
  label: string;
}

export function LoadingBlock({ label }: LoadingBlockProps) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      {label}
    </div>
  );
}
