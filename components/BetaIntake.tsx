'use client';

import { FormEvent, useMemo, useState } from 'react';
import type { Locale } from '@/lib/i18n';

const DEFAULT_BETA_INTAKE_ENDPOINT = 'https://diqto-voice-for-mac-diqto-voice-for-mac-f524ef7d.koyeb.app/api/beta-intake';

const copy = {
  en: {
    email: 'Work email', role: 'Your context', meetings: 'Meeting volume', platform: 'Meeting tools', useCase: 'Primary use case', submit: 'Prepare access →', submitting: 'Preparing…', note: 'Answer a few questions to prepare the right access path.', prepared: 'Request received', failed: 'Could not send the request. Please try again.', path: 'Recommended path', current: 'Current path', placeholderEmail: 'you@company.com', placeholderUseCase: 'Example: French founder pitching US clients weekly.', roles: ['Founder / independent operator', 'Sales / partnerships', 'Customer success / support', 'Security / IT buyer'], volumes: ['1–5 multilingual meetings / week', '5–15 multilingual meetings / week', '15+ multilingual meetings / week'], tools: 'Zoom / Teams / Google Meet', paths: { beta: 'Mac beta path', team: 'Team pilot path', enterprise: 'Enterprise readiness path' }
  },
  fr: {
    email: 'Email professionnel', role: 'Votre contexte', meetings: 'Volume de réunions', platform: 'Outils de réunion', useCase: 'Cas d’usage principal', submit: 'Préparer l’accès →', submitting: 'Préparation…', note: 'Répondez à quelques questions pour préparer le bon parcours d’accès.', prepared: 'Demande reçue', failed: 'Impossible d’envoyer la demande. Réessayez.', path: 'Parcours recommandé', current: 'Parcours actuel', placeholderEmail: 'vous@entreprise.com', placeholderUseCase: 'Exemple : fondateur francophone qui pitch des clients US chaque semaine.', roles: ['Fondateur / indépendant', 'Vente / partenariats', 'Customer success / support', 'Sécurité / IT'], volumes: ['1–5 réunions multilingues / semaine', '5–15 réunions multilingues / semaine', '15+ réunions multilingues / semaine'], tools: 'Zoom / Teams / Google Meet', paths: { beta: 'Parcours bêta Mac', team: 'Parcours pilote équipe', enterprise: 'Parcours sécurité / entreprise' }
  },
} satisfies Record<Locale, any>;

type IntakeState = { email: string; role: string; meetings: string; platform: string; useCase: string; };
type SubmitState = 'idle' | 'submitting' | 'sent' | 'error';

export function BetaIntake({ compact = false, locale = 'en' }: { compact?: boolean; locale?: Locale }) {
  const c = copy[locale];
  const [state, setState] = useState<IntakeState>({ email: '', role: c.roles[0], meetings: c.volumes[1], platform: c.tools, useCase: '' });
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const route = useMemo(() => {
    if (state.meetings.includes('15+')) return c.paths.team;
    if (state.role.includes('Security') || state.role.includes('Sécurité')) return c.paths.enterprise;
    return c.paths.beta;
  }, [state.meetings, state.role, c.paths.beta, c.paths.enterprise, c.paths.team]);
  function update(key: keyof IntakeState, value: string) { setState((current) => ({ ...current, [key]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState('submitting');
    try {
      const endpoint = process.env.NEXT_PUBLIC_BETA_INTAKE_ENDPOINT || DEFAULT_BETA_INTAKE_ENDPOINT;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...state,
          locale,
          path: route,
          source: typeof window !== 'undefined' ? window.location.href : 'diqtovoice.com'
        })
      });
      if (!response.ok) throw new Error(`Lead intake failed: ${response.status}`);
      setSubmitState('sent');
    } catch {
      setSubmitState('error');
    }
  }

  const note = submitState === 'sent'
    ? `${c.prepared} for ${state.email}. ${c.path}: ${route}.`
    : submitState === 'error'
      ? c.failed
      : `${c.note} ${c.current}: ${route}.`;

  return (
    <form className="beta-form" onSubmit={submit}>
      <div><label htmlFor="email">{c.email}</label><input id="email" type="email" placeholder={c.placeholderEmail} value={state.email} onChange={(event) => update('email', event.target.value)} required /></div>
      {!compact ? <>
        <div><label htmlFor="role">{c.role}</label><select id="role" value={state.role} onChange={(event) => update('role', event.target.value)}>{c.roles.map((role: string) => <option key={role}>{role}</option>)}</select></div>
        <div><label htmlFor="meetings">{c.meetings}</label><select id="meetings" value={state.meetings} onChange={(event) => update('meetings', event.target.value)}>{c.volumes.map((volume: string) => <option key={volume}>{volume}</option>)}</select></div>
        <div><label htmlFor="platform">{c.platform}</label><input id="platform" value={state.platform} onChange={(event) => update('platform', event.target.value)} /></div>
        <div><label htmlFor="useCase">{c.useCase}</label><textarea id="useCase" placeholder={c.placeholderUseCase} value={state.useCase} onChange={(event) => update('useCase', event.target.value)} /></div>
      </> : null}
      <button className="btn btn-primary btn-wide" type="submit" disabled={submitState === 'submitting'}>{submitState === 'submitting' ? c.submitting : c.submit}</button>
      <div className="form-note" aria-live="polite">{note}</div>
    </form>
  );
}
