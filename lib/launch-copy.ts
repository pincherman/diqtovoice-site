import frSource from '@/content/home/fr.json';
import enSource from '@/content/home/en.json';

const availability = {
  fr: {
    label: 'Suivre le lancement', title: 'Le lancement se prépare.',
    notice: 'Le téléchargement public et les inscriptions à la liste d’attente ne sont pas encore ouverts. Aucune adresse e-mail n’est demandée sur ce site.',
    faq: [
      { question: 'À quoi sert Diqto Voice ?', answer: 'Diqto Voice est une application de traduction vocale pour parler votre langue et entendre celle de votre interlocuteur dans vos réunions.' },
      { question: 'Mon interlocuteur doit-il installer quelque chose ?', answer: 'Non. Diqto Voice s’utilise de votre côté : votre interlocuteur reste dans son application de réunion habituelle.' },
      { question: 'Quelles applications sont présentées ?', answer: 'Teams, Zoom, Google Meet et Webex, sur Windows et Mac. Les guides préciseront les réglages propres à chaque plateforme.' },
      { question: 'Puis-je télécharger ou acheter Diqto Voice ici ?', answer: 'Pas encore. Ce site présente le produit ; le téléchargement public, les inscriptions et l’achat ne sont pas ouverts. Aucun paiement ni renseignement personnel ne sont demandés.' },
      { question: 'Qui est derrière Diqto Voice ?', answer: 'DIQTO SAS, société française établie au 498 rue Paradis, 13008 Marseille. Les coordonnées de l’éditeur et de l’hébergeur figurent dans les mentions légales.' },
    ],
    static: { t005: 'Disponibilité', t015: 'Disponibilité', t024: 'Le lancement', t048: 'Le lancement se prépare.', t049: 'Diqto Voice sera proposé avec un parcours de téléchargement et des guides pour chaque plateforme.', t050: 'Aucune vente ni collecte d’inscription sur ce site pour le moment.', t053: 'Les informations destinées aux équipes seront précisées avant l’ouverture.', t054: 'Vos réunions', t055: ' avec des interlocuteurs à l’étranger.', t056: 'Windows et Mac', t057: ' : des guides adaptés à chaque plateforme.', t058: 'Votre équipe', t059: ' : un usage à préparer ensemble.', t072: '© 2026 DIQTO SAS', t073: 'Bientôt', t074: '', t076: 'Téléchargement public et inscriptions pas encore ouverts.', t077: 'Aucune adresse e-mail, aucun compte, aucune carte bancaire demandés sur ce site.' },
  },
  en: {
    label: 'Follow the launch', title: 'Getting ready to launch.',
    notice: 'Public downloads and waiting-list sign-ups are not open yet. This website does not ask for your email address.',
    faq: [
      { question: 'What is Diqto Voice?', answer: 'Diqto Voice is a voice translation application designed to let you speak your language and hear the other person in your language during meetings.' },
      { question: 'Does the other person need to install anything?', answer: 'No. Diqto Voice runs on your side: the other person stays in their usual meeting application.' },
      { question: 'Which applications are featured?', answer: 'Teams, Zoom, Google Meet and Webex, on Windows and Mac. The guides will explain the settings for each platform.' },
      { question: 'Can I download or buy Diqto Voice here?', answer: 'Not yet. This website introduces the product; public downloads, sign-ups and purchases are not open. No payment or personal information is requested.' },
      { question: 'Who is behind Diqto Voice?', answer: 'DIQTO SAS, a French company based at 498 rue Paradis, 13008 Marseille, France. Publisher and hosting details are available in the legal notice.' },
    ],
    static: { t005: 'Availability', t015: 'Availability', t024: 'The launch', t048: 'Getting ready to launch.', t049: 'Diqto Voice will be accompanied by a download journey and guides for each platform.', t050: 'There are no sales or sign-up forms on this website at present.', t053: 'Information for teams will be provided before launch.', t054: 'Your meetings', t055: ' with people across borders.', t056: 'Windows and Mac', t057: ': guides tailored to each platform.', t058: 'Your team', t059: ': a use case to prepare together.', t072: '© 2026 DIQTO SAS', t073: 'Coming soon', t074: '', t076: 'Public downloads and sign-ups are not open yet.', t077: 'This website asks for no email address, account or bank card.' },
  },
};
function launchCopy(source: typeof frSource, locale: 'fr' | 'en') {
  const c = availability[locale];
  return { ...source,
    static: { ...source.static, ...c.static, t012: c.label, t019: c.label, t023: c.label, t064: c.label },
    motion: { ...source.motion, TARIFS: [] }, FAQ: c.faq,
    beta: { title: c.title, intro: c.notice, back: source.beta.back, download: c.label },
    selector: { ...source.selector, note: locale === 'fr' ? 'Choisissez la langue du site.' : 'Choose your site language.' },
    ui: { ...source.ui, inactivePurchase: c.notice, inactiveContact: c.notice },
    legacy: { ...source.legacy, notice: locale === 'fr' ? 'Ce contenu est en préparation. Consultez l’accueil pour les informations actuellement disponibles.' : 'This content is being prepared. Visit the home page for currently available information.' },
  };
}
export const homeCopy = { fr: launchCopy(frSource, 'fr'), en: launchCopy(enSource, 'en') };
