
import { homeCopy } from '@/lib/home-copy';
import type { Locale } from '@/lib/i18n';

export function NewBeta({ locale }: { locale: Locale }) {
  const { beta: c, static: strings } = homeCopy[locale];
  return <main className="wrap beta-page">
    <a className="link" href={`/${locale}/`}>{c.back}</a>
    <h1 className="h2">{c.title}</h1><p className="lede">{c.intro}</p>
    <button type="button" className="btn big" disabled aria-describedby="download-msg">{c.download}</button>
    <p id="download-msg">{strings.t076}</p>
  </main>;
}
