# CLAUDE.md

Guide de travail pour Claude sur ce dépôt. Lire aussi `docs/` avant toute modification.

## Le projet

Jeu de soirée **pour 2 équipes, sur un seul téléphone** qu'on se passe.
À chaque tour, deux concepts opposés (ex. *Chaud / Froid*) sont affichés aux deux bouts d'une réglette, et une
position cible secrète est tirée au hasard. L'équipe qui donne l'indice propose **un mot** ; l'autre équipe
doit placer le curseur au bon endroit. Plus on est proche, plus on marque de points.

- Règles complètes : `docs/REGLES.md`
- Spécification fonctionnelle (écrans, flux, données, score) : `docs/SPEC.md`
- Banque de paires de concepts et critères de qualité : `docs/CONCEPTS.md`
- Décisions de conception validées : `docs/DECISIONS.md`

Nom du jeu : **Le Curseur**.

**Statut : conception terminée, toutes les décisions de `docs/DECISIONS.md` sont validées.
Aucun code écrit pour l'instant.** Toute nouvelle ambiguïté de règle se note dans `docs/DECISIONS.md`.

## Contraintes techniques (non négociables)

- **HTML + CSS + JavaScript « vanilla »**. Aucun framework, aucune bibliothèque, aucune dépendance npm.
- **Une seule page** (`index.html`) : les écrans sont des sections affichées/masquées, pas de navigation.
- **Aucune étape de build.** Le jeu doit fonctionner en ouvrant `index.html` directement (`file://`)
  et sur un hébergement statique (GitHub Pages).
  - Donc **pas de modules ES** (`type="module"` ne marche pas en `file://`) : scripts classiques chargés
    dans l'ordre, un seul objet global par fichier.
  - Pas de `fetch` de fichiers locaux (même raison) : les données sont dans un fichier `.js`.
- Fonctionne hors-ligne, aucun appel réseau, aucune police ou image distante.
- **Mobile d'abord** : le jeu se joue sur un téléphone tenu en portrait, au doigt. Doit aussi rester
  utilisable sur ordinateur (souris, clavier).

## Structure prévue

```
index.html          # structure de toutes les sections/écrans, charge les scripts dans l'ordre
style.css           # styles, mobile d'abord
js/concepts.js      # window.CONCEPTS = [ ["Chaud", "Froid"], ... ]  (source de vérité des paires)
js/game.js          # logique pure : état, tirages, calcul du score — aucun accès au DOM
js/ui.js            # rendu des écrans, gestion des événements, liaison avec game.js
docs/               # règles, spec, concepts, décisions
```

Ordre de chargement dans `index.html` : `concepts.js`, `game.js`, `ui.js`.

Séparer strictement la logique (`game.js`, testable sans navigateur) de l'interface (`ui.js`).

## Conventions

- **Interface en français** (textes, boutons, messages). Code, noms de variables et de fonctions en anglais.
- Pas de texte d'interface en dur dispersé dans le JS : regrouper les libellés en haut de `ui.js`.
- JavaScript moderne mais sans transpilation : `const`/`let`, fonctions fléchées, template strings OK.
- Positions sur la réglette : **nombres de 0 à 100** (0 = concept de gauche, 100 = concept de droite).
- Le hasard passe par une seule fonction (`random()` dans `game.js`) pour pouvoir le remplacer en test.
- Accessibilité de base : vrais `<button>`, contrastes suffisants, zones tactiles ≥ 44 px, curseur
  manipulable au clavier.
- Garder le code simple et lisible : c'est un petit jeu, pas d'architecture superflue.

## Règles de score (rappel, détail dans `docs/SPEC.md`)

Écart = |position devinée − position cible|, en points de pourcentage de la réglette.

| Écart        | Points |
|--------------|--------|
| ≤ 7          | 4      |
| ≤ 14         | 3      |
| ≤ 21         | 2      |
| ≤ 28         | 1      |
| > 28         | 0      |

Bornes incluses. Ces seuils doivent être des constantes nommées dans `game.js`, pas des nombres magiques.

## Points d'attention

- **Secret de la cible** : la position cible ne doit jamais être visible par l'équipe qui devine avant
  qu'elle ait validé. Chaque passage de téléphone passe par l'écran « Tour de l'équipe X » + « Prêt »,
  qui ne montre aucune information secrète.
- On **ne peut pas passer son tour** : le bouton de validation de l'indice reste désactivé tant que
  l'indice est vide. On peut en revanche changer de paire de concepts.
- Une paire de concepts ne doit pas réapparaître pendant la même partie.
- Un rechargement accidentel ne doit pas faire perdre la partie : sauvegarde en `localStorage`,
  reprise sur un écran « Tour de l'équipe X » (jamais directement sur un écran secret).
- Le score est **commun** aux deux équipes (jeu coopératif) ; le récap détaille la contribution de chaque équipe.

## Vérification

Pas de suite de tests ni de framework. Pour vérifier un changement :

1. Ouvrir `index.html` dans un navigateur (ou via Playwright/Chromium, préinstallé dans l'environnement
   cloud) en émulant un téléphone en portrait (ex. 390×844).
2. Jouer une partie complète courte (1 tour) et dérouler la checklist de `docs/SPEC.md` § « Recette ».
3. La logique de `game.js` peut être vérifiée avec `node` (script jetable, hors dépôt) puisqu'elle
   n'accède pas au DOM.

## Propriété intellectuelle

Le concept (deviner une position sur une échelle entre deux opposés) est générique. Ne pas reprendre le
nom, les visuels, les textes ou les listes de cartes d'un jeu du commerce existant. Les paires de
`docs/CONCEPTS.md` sont des opposés courants rédigés pour ce projet.
