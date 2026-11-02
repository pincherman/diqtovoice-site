import '@/app/maquette.css';
import '@/app/preview.css';

export function SiteDocument({ locale, children }: { locale: 'fr' | 'en'; children: React.ReactNode }) {
  return <html lang={locale}><head><link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'self'; object-src 'none'" />
  </head><body>{children}</body></html>;
}
