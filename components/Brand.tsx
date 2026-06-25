import Link from 'next/link';
import { localizedPath, type Locale } from '@/lib/i18n';

export function Brand({ locale = 'en' }: { locale?: Locale }) {
  return (
    <Link href={localizedPath(locale, '/')} className="brand" aria-label="Diqto Voice home">
      <span className="brand-mark">dq</span>
      <span><span>diqto</span><span className="voice">voice</span></span>
    </Link>
  );
}
