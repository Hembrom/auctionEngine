import type { ReactNode } from 'react';

export type AppTheme = 'admin' | 'captain' | 'spectator';

interface LayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  badge?: string;
  captainName?: string;
  theme?: AppTheme;
}

export function Layout({ title, subtitle, children, badge, captainName, theme }: LayoutProps) {
  return (
    <div className={`app${theme ? ` theme-${theme}` : ''}`}>
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
