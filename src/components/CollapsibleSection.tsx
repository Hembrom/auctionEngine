import { useState, type ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  badge,
  defaultOpen = true,
  children,
  className = '',
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`collapsible-section ${className}`.trim()}>
      <button
        type="button"
        className="collapsible-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="collapsible-title">{title}</span>
        {badge && <span className="collapsible-badge">{badge}</span>}
        <span className="collapsible-chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </section>
  );
}
