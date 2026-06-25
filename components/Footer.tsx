'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { localeFromPath, localizedPath, navCopy } from '@/lib/i18n';

export function Footer() {
  const pathname = usePathname();
  const locale = localeFromPath(pathname);
  const copy = navCopy[locale];
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>© 2026 Diqto Voice · diqtovoice.com</div>
        <div className="footer-links">
          <Link href={localizedPath(locale, '/beta')}>{copy.beta}</Link>
          <Link href={localizedPath(locale, '/roi')}>{copy.roi}</Link>
          <Link href={localizedPath(locale, '/security')}>{copy.security}</Link>
          <span>{copy.footer}</span>
        </div>
      </div>
    </footer>
  );
}
