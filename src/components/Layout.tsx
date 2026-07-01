import type { ReactNode } from 'react';

interface LayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  badge?: string;
  captainName?: string;
}

export function Layout({ title, subtitle, children, badge, captainName }: LayoutProps) {
  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div>
            <h1>{title}</h1>
            {subtitle && <p className="subtitle">{subtitle}</p>}
            {captainName && (
              <p className="header-captain">
                Captain: <strong>{captainName}</strong>
              </p>
            )}
          </div>
          {badge && <span className="badge">{badge}</span>}
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
