// Retained pricing corpus: France VAT first; the public pre-launch renderer exposes no offers.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const expected = {
  fr: { prices: ['34,80 €', '94,80 €'], unit: 'TTC / mois',
    ht: ['soit 29 € HT pour les entreprises', 'soit 79 € HT pour les entreprises'],
    extra: 'Heure en plus : 10,80 € TTC (9 € HT), seulement avec votre accord',
    fine: 'Prix TTC pour la France (TVA 20 %). Entreprises : prix hors taxes, TVA selon votre pays. Tarifs de lancement.',
    question: 'Je suis une entreprise : quel prix ?',
    answer: 'Le prix hors taxes : 29 € pour Essentiel, 79 € pour Pro, 9 € l’heure en plus. La TVA s’ajoute selon votre pays. Une entreprise d’un autre pays de l’Union européenne qui a un numéro de TVA la déclare elle-même.' },
  en: { prices: ['€34.80', '€94.80'], unit: 'incl. VAT / month',
    ht: ['or €29 excl. VAT for businesses', 'or €79 excl. VAT for businesses'],
    extra: 'Additional hour: €10.80 incl. VAT (€9 excl. VAT), only with your agreement',
    fine: 'Prices include VAT for France (20% VAT). Businesses: prices exclude VAT; VAT depends on your country. Launch pricing.',
    question: 'What price do I pay as a business?',
    answer: 'The price excluding VAT: €29 for Essential, €79 for Pro, €9 per additional hour. VAT is added according to your country. A business in another EU country with a VAT number accounts for VAT itself.' },
};
for (const [locale, e] of Object.entries(expected)) {
  const c = JSON.parse(read(`content/home/${locale}.json`));
  assert.equal(c.static.t050, e.fine, `${locale}: France scope must be explicit`);
  assert.equal(c.FAQ.length, 7);
  assert.deepEqual(c.FAQ[4], { question: e.question, answer: e.answer });
  c.motion.TARIFS.slice(0, 2).forEach((p, i) => {
    assert.equal(p.prix, e.prices[i]); assert.equal(p.unite, e.unit);
    assert.equal(p.ht, e.ht[i]); assert.equal(p.points[1], e.extra);
    assert.match(p.points[2], /Sans engagement|No minimum term/);
  });
  const business = c.motion.TARIFS[2];
  assert.equal(business.ht, ''); assert.match(business.prix, /Sur devis|On request/);
  assert.equal(c.trial.backendImplemented, false);
  assert.equal(c.review.status, 'EN_ATTENTE_RELECTEUR_DISTINCT');
}
const renderer = read('components/pages/NewHome.tsx');
assert.match(renderer, /from '@\/lib\/home-copy'/, 'Use the pre-launch corpus rather than raw pricing data');
assert.doesNotMatch(renderer, /escape\(p\.ht\)|TARIFS:/, 'The current renderer has no pricing-card injection');
const template = read('content/home/template.html');
assert.doesNotMatch(template, /\{\{TARIFS\}\}|id="tarifs"|class="plans"/, 'The public template exposes availability, not purchases');
for (const locale of ['fr', 'en']) {
  const page = read(`out/${locale}/index.html`);
  const corpus = page.match(/<script\b(?=[^>]*\bid="home-corpus")[^>]*>([\s\S]*?)<\/script>/);
  assert(corpus, `${locale}: the actual export contains the pre-launch motion corpus`);
  assert.deepEqual(JSON.parse(corpus[1]).TARIFS, [], `${locale}: no published offers`);
  assert.doesNotMatch(page, /34,80|94,80|34\.80|94\.80/, `${locale}: retained prices are not published`);
}
console.log('PASS retained FR/EN VAT-first corpus, business net prices, consent-only extras; actual public export contains no offers or prices');
