import { homeCopy, languageName, siteOrder } from '@/lib/home-copy';

export default function HomePage() {
  const c = homeCopy.en.selector;
  return <main className="wrap selector">
    <p className="wordmark">Diqto Voice</p><h1 className="h2">{c.title}</h1>
    <p>{c.note}</p><ul className="foot-langs">
      {siteOrder.map((code) => <li key={code} lang={code} dir="auto">
        {code === 'fr' || code === 'en' ? <a href={`/${code}/`}>{languageName(code)}</a>
          : <span aria-disabled="true" title={c.unavailable}>{languageName(code)}</span>}
      </li>)}
    </ul>
  </main>;
}
