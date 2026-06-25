'use client';

import { useMemo, useState } from 'react';
import type { Locale } from '@/lib/i18n';

const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const copy = {
  en: { meetings: 'International meetings / week', people: 'People impacted / meeting', minutes: 'Minutes lost to language friction', hourly: 'Blended hourly cost (€)', interpreter: 'Interpreter / workaround cost per month (€)', capture: 'Recoverable friction', conservative: 'Conservative · 25%', expected: 'Expected · 40%', ambitious: 'Ambitious · 60%', monthly: 'Estimated monthly value recovered', hours: 'Hours recovered / month', disclaimer: 'Prototype calculator. Real ROI depends on meeting mix, language pairs, adoption, and whether Diqto replaces interpreters, reduces friction, or unlocks faster sales/support cycles.' },
  fr: { meetings: 'Réunions internationales / semaine', people: 'Personnes concernées / réunion', minutes: 'Minutes perdues par friction langue', hourly: 'Coût horaire moyen (€)', interpreter: 'Coût interprète / contournement par mois (€)', capture: 'Friction récupérable', conservative: 'Prudent · 25%', expected: 'Attendu · 40%', ambitious: 'Ambitieux · 60%', monthly: 'Valeur mensuelle estimée récupérée', hours: 'Heures récupérées / mois', disclaimer: 'Calculateur prototype. Le ROI réel dépend des réunions, langues, adoption, et du remplacement d’interprètes ou de la réduction de friction.' },
} satisfies Record<Locale, Record<string, string>>;

type RoiState = { meetings: number; people: number; minutes: number; hourly: number; interpreter: number; capture: number; };

export function RoiCalculator({ compact = false, locale = 'en' }: { compact?: boolean; locale?: Locale }) {
  const c = copy[locale];
  const [state, setState] = useState<RoiState>({ meetings: compact ? 8 : 12, people: compact ? 4 : 5, minutes: compact ? 10 : 12, hourly: 70, interpreter: compact ? 400 : 900, capture: 0.4 });
  const result = useMemo(() => {
    const weeklyLostHours = Math.max(0, state.meetings) * Math.max(1, state.people) * Math.max(0, state.minutes) / 60;
    const monthlyRecoveredHours = weeklyLostHours * 4.33 * Math.max(0, state.capture);
    const valueRecovered = monthlyRecoveredHours * Math.max(0, state.hourly) + Math.max(0, state.interpreter) * Math.max(0, state.capture);
    return { monthly: euro.format(valueRecovered), hours: `${Math.round(monthlyRecoveredHours)}h` };
  }, [state]);
  function update<K extends keyof RoiState>(key: K, value: string) { setState((current) => ({ ...current, [key]: Number(value) })); }

  return (
    <div className="calculator" aria-label="ROI calculator">
      <div className="calc-grid">
        <div><label htmlFor="meetings">{c.meetings}</label><input id="meetings" type="number" min="1" max="200" value={state.meetings} onChange={(event) => update('meetings', event.target.value)} /></div>
        <div><label htmlFor="people">{c.people}</label><input id="people" type="number" min="1" max="50" value={state.people} onChange={(event) => update('people', event.target.value)} /></div>
        <div><label htmlFor="minutes">{c.minutes}</label><input id="minutes" type="number" min="1" max="120" value={state.minutes} onChange={(event) => update('minutes', event.target.value)} /></div>
        <div><label htmlFor="hourly">{c.hourly}</label><input id="hourly" type="number" min="10" max="500" value={state.hourly} onChange={(event) => update('hourly', event.target.value)} /></div>
        <div><label htmlFor="interpreter">{c.interpreter}</label><input id="interpreter" type="number" min="0" max="50000" value={state.interpreter} onChange={(event) => update('interpreter', event.target.value)} /></div>
        <div><label htmlFor="capture">{c.capture}</label><select id="capture" value={state.capture} onChange={(event) => update('capture', event.target.value)}><option value="0.25">{c.conservative}</option><option value="0.4">{c.expected}</option><option value="0.6">{c.ambitious}</option></select></div>
      </div>
      <div className="result"><div><small>{c.monthly}</small><strong>{result.monthly}</strong></div><div className="secondary"><small>{c.hours}</small><strong>{result.hours}</strong></div></div>
      <p className="disclaimer">{c.disclaimer}</p>
    </div>
  );
}
