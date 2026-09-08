import type { ReactNode } from 'react';

export function ExperienceMode({ children, tone = 'sample' }: { children: ReactNode; tone?: 'sample' | 'live' | 'unavailable' }) {
  return <span className="experience-mode" data-mode={tone}>{children}</span>;
}
