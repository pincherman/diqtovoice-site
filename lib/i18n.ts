export const locales = ['en', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function localeFromPath(pathname: string): Locale {
  return pathname.startsWith('/fr') ? 'fr' : 'en';
}

export function localizedPath(locale: Locale, path = '/') {
  if (locale === defaultLocale) return path;
  if (path === '/') return `/${locale}`;
  return `/${locale}${path}`;
}

export function switchLocalePath(pathname: string, nextLocale: Locale) {
  const parts = pathname.split('/').filter(Boolean);
  const currentHasLocale = parts[0] && isLocale(parts[0]);
  const rest = currentHasLocale ? parts.slice(1) : parts;
  if (nextLocale === defaultLocale) return `/${rest.join('/')}`.replace(/\/$/, '') || '/';
  return `/${[nextLocale, ...rest].join('/')}`.replace(/\/$/, '') || `/${nextLocale}`;
}

export const navCopy = {
  en: {
    how: 'How it works', roi: 'ROI', security: 'Security', access: 'Access', calculate: 'Calculate ROI', beta: 'Join Mac beta', footer: 'Meetings first. Conversations next.',
  },
  fr: {
    how: 'Fonctionnement', roi: 'ROI', security: 'Confiance', access: 'Accès', calculate: 'Calculer le ROI', beta: 'Rejoindre la bêta Mac', footer: 'Meetings d’abord. Conversations ensuite.',
  },
} satisfies Record<Locale, Record<string, string>>;
