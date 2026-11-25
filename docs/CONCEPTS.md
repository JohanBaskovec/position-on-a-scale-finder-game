# Banque de paires de concepts

Critères de qualité pour les paires de concepts opposés du jeu.

## Critères d'une bonne paire

- Les deux concepts forment une **échelle continue** : on doit pouvoir placer des milliers de mots
  quelque part entre les deux (*Chaud / Froid* : oui ; *Chat / Table* : non).
- Mots **courants**, compréhensibles par tous les joueurs francophones, sans jargon.
- Courts (idéalement 1 à 3 mots par concept) pour tenir aux extrémités de la réglette sur un téléphone.
- Pas de doublon évident avec une autre paire de la liste.
- Éviter les paires qui stigmatisent un groupe de personnes (origine, genre, handicap, religion…).
- L'ordre gauche/droite n'a pas d'importance (il peut être inversé au hasard, voir `DECISIONS.md` D-9).

## Où est la liste ?

Les paires (≈ 248, classées par thème en commentaires) sont dans [`js/concepts.js`](../js/concepts.js), qui est
la **source de vérité**. Pour en ajouter ou en retirer, modifier uniquement ce fichier : une paire par ligne,
`["Concept gauche", "Concept droit"]`. Aucun autre fichier à toucher.
