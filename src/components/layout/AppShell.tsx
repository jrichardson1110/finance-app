import type { ReactNode } from 'react';

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{title}</h1>
        {subtitle ? <p className="app-subtitle">{subtitle}</p> : null}
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
