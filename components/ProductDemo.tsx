import type { Locale } from '@/lib/i18n';

const demo = {
  en: {
    call: 'Weekly partner call', live: 'Live translated voice', youTitle: 'You speak French', youText: 'Natural voice, no switching language, no mental overhead.', theyTitle: 'They hear English', theyText: 'Clear translated speech routed through the meeting microphone.', input: 'Input', output: 'Meeting hears', source: '“Je vais vous montrer le retour sur investissement.”', target: '“I’ll show you the return on investment.”', route: 'Output route', mic: 'Diqto Virtual Microphone', proofTitle: 'Guided setup, not guesswork', proofText: 'The app checks the audio route, helps you select Diqto devices, and confirms what the meeting can hear.'
  },
  fr: {
    call: 'Point partenaire hebdo', live: 'Voix traduite en direct', youTitle: 'Vous parlez français', youText: 'Votre voix naturelle, sans changer de langue, sans charge mentale.', theyTitle: 'Ils entendent anglais', theyText: 'Une voix traduite claire, routée dans le micro de réunion.', input: 'Entrée', output: 'La réunion entend', source: '« Je vais vous montrer le retour sur investissement. »', target: '“I’ll show you the return on investment.”', route: 'Route audio', mic: 'Diqto Virtual Microphone', proofTitle: 'Setup guidé, pas de devinette', proofText: 'L’app vérifie la route audio, aide à sélectionner les appareils Diqto et confirme ce que la réunion entend.'
  },
} satisfies Record<Locale, Record<string, string>>;

export function ProductDemo({ locale = 'en' }: { locale?: Locale }) {
  const c = demo[locale];
  const bars = Array.from({ length: 9 }, (_, index) => <span className="bar" key={index} />);

  return (
    <div className="device" aria-label="Product preview">
      <div className="meeting-card">
        <div className="meeting-top">
          <span>{c.call}</span>
          <span className="status-pill"><span className="pulse" /> {c.live}</span>
        </div>
        <div className="participants">
          <div className="person">
            <div className="avatar">PI</div>
            <h3>{c.youTitle}</h3>
            <p>{c.youText}</p>
            <div className="wave" aria-hidden="true">{bars}</div>
          </div>
          <div className="person">
            <div className="avatar">EN</div>
            <h3>{c.theyTitle}</h3>
            <p>{c.theyText}</p>
            <div className="wave" aria-hidden="true">{bars}</div>
          </div>
        </div>

        <div className="translation-panel">
          <div className="route-row">
            <div className="route-box"><span className="route-label">{c.input}</span><span className="route-text">{c.source}</span></div>
            <div className="arrow">→</div>
            <div className="route-box"><span className="route-label">{c.output}</span><span className="route-text">{c.target}</span></div>
          </div>
          <div className="audio-route"><span>{c.route}</span><span>{c.mic}</span></div>
        </div>
      </div>
      <div className="floating-proof"><b>{c.proofTitle}</b><p>{c.proofText}</p></div>
    </div>
  );
}
