'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brand } from './Brand';
import { localeFromPath, localizedPath, navCopy, switchLocalePath, type Locale } from '@/lib/i18n';

export function Header() {
  const pathname = usePathname();
  const locale = localeFromPath(pathname);
  const copy = navCopy[locale];
  const alternate: Locale = locale === 'en' ? 'fr' : 'en';

  return (
    <nav className="nav" aria-label="Primary navigation">
      <div className="nav-inner">
        <Brand locale={locale} />
        <div className="nav-links" aria-label="Site sections">
          <Link href={`${localizedPath(locale, '/')}#how`}>{copy.how}</Link>
          <Link href={localizedPath(locale, '/roi')}>{copy.roi}</Link>
          <Link href={localizedPath(locale, '/security')}>{copy.security}</Link>
          <Link href={localizedPath(locale, '/beta')}>{copy.access}</Link>
        </div>
        <div className="nav-actions">
          <Link className="btn btn-ghost" href={switchLocalePath(pathname, alternate)}>{alternate.toUpperCase()}</Link>
          <Link className="btn btn-ghost" href={localizedPath(locale, '/roi')}>{copy.calculate}</Link>
          <Link className="btn btn-primary" href={localizedPath(locale, '/beta')}><span className="dot" /> {copy.beta}</Link>
        </div>
      </div>
    </nav>
  );
}
