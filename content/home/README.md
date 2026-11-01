# Accueils privés FR/EN

Source principale : snapshot Claude `source-tarifs-20261101T1911Z.html` admis le 01/11/2026. Complément ciblé : arbitrage Philippe transmis par Claude le 01/11 vers 22:05 Paris et maquette partagée `maquette/site-diqtovoice.html`, objets TARIFS/ht et FAQ entreprise. `template.html`, `fr.json` et `en.json` contiennent les sections et chaînes statiques, SEO, UI, ARIA, animations, tarifs et sept FAQ. Les métadonnées de relecture sont volontairement en attente : l'intégration n'est pas une validation linguistique.

Pour la France, Essentiel 34,80 € TTC/mois et Pro 94,80 € TTC/mois sont affichés avant les montants entreprises 29/79 € HT, sur une ligne secondaire. L'heure supplémentaire est à 10,80 € TTC (9 € HT), uniquement avec accord explicite. La note précise France/TVA 20 %, fiscalité du pays pour les entreprises et tarifs de lancement ; la septième FAQ reprend la maquette. La version anglaise reste à relire. Le champ `source` historique identifie la base, pas ce complément. Aucun achat ni service fiscal activé ; V-13 et ses exigences de paiement/consentement/résiliation restent après V-07.

## Mur commun multilingue

La décision Philippe/Claude du 01/11 au soir remplace uniquement le mur « Pardon ? » par un mur mélangé. `wall.json` conserve les traductions de Claude dans l'ordre de `LANGS` : fr, en, es, pt, de, it, ja, zh, ko, ru, hi, id, vi. Pour chaque langue, les briques alternent PARDON, COMPRENDS, REPETER et LENTEMENT. Les 52 chaînes sont partagées telles quelles par toutes les pages ; la langue de la page ne les retraduit pas.

Chaque relecteur distinct de langue doit vérifier ses quatre phrases dans `wall.json` : naturel à l'oral, brièveté et cohérence. Les treize entrées `reviews` restent en attente ; les avis historiques A/motion ne couvrent pas ces nouveaux textes. Conserver les propositions et avis avant toute correction, puis recontrôler les polices sur le corpus corrigé. Au plus deux relectures linguistiques simultanées ; aucune validation humaine n'est acquise.

## Vérification locale

`node scripts/test-wall-data.mjs` vérifie les 52 entrées, l'ordre commun FR/EN et l'expression réellement utilisée par l'animation.

`node scripts/test-home-pricing.mjs` verrouille les textes TTC/HT et les sept FAQ FR/EN ; le harnais Chromium contrôle aussi leur rendu, l'ordre TTC puis HT et les achats toujours désactivés, avec et sans JavaScript.

Après un export statique, lancer `scripts/test-home-preview.mjs` avec `PREVIEW_SCRATCH` et `PREVIEW_ARTIFACTS` pointant vers des dossiers KITT déclarés. `PREVIEW_PREFIX` distingue les nouvelles captures des preuves historiques. Le harnais exerce Chromium réel aux largeurs 375/768/1024/1440, le dessin des quatre familles, la pause/reprise, l'arrêt hors écran, la réduction des animations, le clavier et le mode sans JavaScript. Il refuse les requêtes externes et les méthodes autres que GET.

Le mouvement réduit montre l'état final sans briques ; la présence des phrases se vérifie pendant l'ouverture animée, pas dans cet état final. Les captures prises en cours d'animation ne prouvent ni fluidité ni relecture des 52 phrases.

## Limites avant publication

Téléchargement introuvable : CTA désactivés, aucun formulaire ni raccordement à beta-intake. Contact, légales, confidentialité et CGV restent non validés. Seuls FR/EN sont intégrés ; les onze autres langues ne sont pas présentées comme disponibles. Revue de code non-auteur et revue du rendu par Claude requises ; aucun GO de publication.

Les sous-ensembles de polices livrés ne couvrent pas tous les caractères du mur japonais/chinois/coréen. Les captures Chromium locales utilisent aussi les polices de repli du système : leur lisibilité n'établit pas la portabilité des glyphes. Couverture et shaping restent à qualifier après relecture, sans changer la maquette silencieusement.
