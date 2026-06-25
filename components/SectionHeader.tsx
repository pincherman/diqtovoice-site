import type { ReactNode } from 'react';

type SectionHeaderProps = {
  kicker: string;
  title: string;
  copy?: string;
};

export function SectionHeader({ kicker, title, copy }: SectionHeaderProps) {
  return (
    <div className="section-head">
      <div>
        <p className="kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      {copy ? <p className="section-copy">{copy}</p> : null}
    </div>
  );
}

export function Check({ children }: { children: ReactNode }) {
  return <span className="check" aria-hidden="true">✓</span>;
}
