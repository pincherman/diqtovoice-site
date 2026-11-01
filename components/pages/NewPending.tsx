import { homeCopy } from '@/lib/home-copy';
import type { Locale } from '@/lib/i18n';

export function NewPending({ locale }: { locale: Locale }) {
  const copy = homeCopy[locale].legacy;
  return <main className="beta-page container">
    <a className="btn ghost" href={`/${locale}/`}>{copy.back}</a>
    <h1 className="h2">{copy.title}</h1>
    <p className="lede">{copy.notice}</p>
  </main>;
}
