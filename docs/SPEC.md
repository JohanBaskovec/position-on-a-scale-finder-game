# Spécification fonctionnelle

Les choix marqués **[D-n]** renvoient à `DECISIONS.md` (valeur par défaut, à confirmer).

## 1. Vocabulaire

| Terme            | Sens                                                                                  |
|------------------|---------------------------------------------------------------------------------------|
| Paire            | Deux concepts opposés : gauche (position 0) et droite (position 100).                |
| Cible            | Position secrète tirée au hasard, entier de 0 à 100.                                  |
| Donneur          | Équipe qui voit la cible et donne l'indice.                                           |
| Devineur         | Équipe qui place le curseur.                                                          |
| Manche (« tour » dans le menu) | Chaque équipe a été donneuse une fois. 1 manche = 2 indices. **[D-1]** |
| Indice           | Le mot saisi par le donneur.                                                          |

## 2. Écrans

Tous les écrans sont des `<section>` de `index.html` ; un seul est visible à la fois.

### 2.1 Menu (`menu`)
- Titre du jeu.
- Champ « Équipe 1 » (défaut : « Équipe A »), champ « Équipe 2 » (défaut : « Équipe B »).
  Noms obligatoires, max ~20 caractères, les deux noms doivent être différents.
- Nombre de tours : sélecteur − / + (min 1, max 20, défaut 5). **[D-1]**
- Lien « Règles » (affiche un résumé des règles).
- Bouton « Jouer ». Désactivé si la saisie est invalide.
- Les derniers noms/réglages utilisés sont pré-remplis (localStorage). **[D-8]**
- Si une partie en cours a été sauvegardée : bouton « Reprendre la partie ». **[D-8]**

### 2.2 Passage du téléphone (`handoff`)
- Grand texte : « Tour de l'équipe *X* ».
- Sous-titre selon le rôle : « À vous de faire deviner » ou « À vous de deviner ».
- Rappel discret : tour *n* / *total*, score actuel. **[D-2]**
- Bouton « Prêt ».
- **N'affiche jamais la cible, l'indice ni les concepts.**

### 2.3 Donner l'indice (`give`)
- Nom de l'équipe donneuse, numéro du tour.
- Réglette avec le concept gauche et le concept droit aux extrémités.
- La cible affichée sur la réglette, avec les zones de points visibles (bandes 4/3/2/1 autour de la cible)
  pour aider le donneur à calibrer son indice.
- Bouton « Autres concepts » : remplace la paire par une paire non encore utilisée dans la partie.
  La cible ne change pas. Nombre illimité. **[D-4]**
- Champ texte « Votre indice » (un mot recommandé, non imposé techniquement). **[D-3]**
- Bouton « Valider l'indice », désactivé tant que le champ est vide (espaces retirés).
- Aucun bouton « Passer ».

### 2.4 Deviner (`guess`)
- Nom de l'équipe qui devine.
- Les deux concepts et l'indice, bien en évidence.
- Réglette avec un curseur déplaçable, position initiale au centre (50). **[D-6]**
  - Déplaçable au doigt (glisser ou toucher un point de la réglette), à la souris et au clavier (flèches).
  - Pas d'indication de la cible.
- Bouton « Valider ».

### 2.5 Résultat (`reveal`)
- Réglette montrant la cible (avec ses zones) et le curseur de l'équipe.
- Écart et points marqués (« +3 points »), score actuel. **[D-2]**
- Bouton « Continuer » :
  - s'il reste des indices à jouer → écran `handoff` pour l'équipe qui vient de deviner, en rôle donneur
    (elle a déjà le téléphone, mais l'écran évite que l'autre équipe voie la nouvelle cible) **[D-5]** ;
  - sinon → `recap`.

### 2.6 Récapitulatif (`recap`)
- Score total (et/ou par équipe **[D-2]**).
- Tableau ou liste, une ligne par indice : n°, équipe donneuse → équipe devineuse, paire, indice,
  cible, réponse, écart, points.
- Bouton « Rejouer » (mêmes équipes et réglages, nouveau tirage de l'équipe qui commence).
- Bouton « Menu ».

### 2.7 Quitter une partie
- Un petit bouton « Quitter » (menu) disponible pendant la partie, avec confirmation.

## 3. Flux

```
menu ──Jouer──▶ handoff(donneur = équipe tirée au sort)
                  │ Prêt
                  ▼
                give ──Valider──▶ handoff(devineur) ──Prêt──▶ guess ──Valider──▶ reveal
                  ▲                                                                │
                  │                                          reste des indices ?   │
                  └──Prêt── handoff(donneur = ancien devineur) ◀──── oui ──────────┤
                                                                                   │ non
                                                                                   ▼
                                                                                 recap
```

Nombre total d'indices joués = 2 × nombre de tours du menu **[D-1]**. Les équipes alternent :
l'équipe qui devine au tour *i* donne l'indice au tour *i + 1*.

## 4. Modèle de données

```js
// Réglages (persistés)
settings = {
  teamNames: ["Équipe A", "Équipe B"],
  roundCount: 5,               // nombre de « tours » du menu
}

// Partie en cours (persistée pour reprise) [D-8]
game = {
  settings,                    // copie au lancement
  startingTeam: 0 | 1,         // tiré au sort
  turns: [Turn],               // un élément par indice joué ou en cours
  phase: "handoff-give" | "give" | "handoff-guess" | "guess" | "reveal" | "recap",
  usedPairIndexes: [number],   // paires déjà affichées (y compris celles rejetées via « Autres concepts »)
}

Turn = {
  giverTeam: 0 | 1,
  guesserTeam: 0 | 1,
  pair: ["Chaud", "Froid"],
  target: 0..100,
  rerollCount: number,
  clue: string | null,
  guess: 0..100 | null,
  distance: number | null,
  points: 0..4 | null,
}
```

## 5. Algorithmes

### Tirage de la cible
Entier uniforme dans [0, 100]. **[D-7]**

### Tirage d'une paire
Choisir au hasard parmi les paires dont l'index n'est pas dans `usedPairIndexes`. Si toutes ont été
utilisées (partie très longue), vider la liste et recommencer. On peut aussi tirer au hasard le sens de
la paire (gauche/droite inversés) pour varier. **[D-9]**

### Score
```
distance = |guess - target|
points   = distance <= 7  ? 4
         : distance <= 14 ? 3
         : distance <= 21 ? 2
         : distance <= 28 ? 1
         : 0
```
Seuils en constantes : `SCORE_BANDS = [{max: 7, points: 4}, {max: 14, points: 3}, {max: 21, points: 2}, {max: 28, points: 1}]`.

Le curseur du devineur est un entier (pas de 1) ; les bornes sont incluses.

## 6. Interface et ergonomie

- Portrait, une colonne, gros caractères, boutons pleine largeur en bas d'écran (atteignables au pouce).
- La réglette occupe toute la largeur ; les libellés de concepts au-dessus de chaque extrémité, avec
  retour à la ligne pour les mots longs.
- Les deux équipes ont chacune une couleur, réutilisée sur l'écran de passage et dans le récap.
- Empêcher le zoom au double-tap et le défilement pendant le glissement du curseur (`touch-action`).
- Mode sombre via `prefers-color-scheme` (souhaitable, non prioritaire).
- Pas de son, pas d'animation indispensable (une petite animation de révélation est un bonus).

## 7. Recette (checklist manuelle)

- [ ] Menu : noms vides ou identiques → « Jouer » désactivé.
- [ ] Le premier donneur varie d'une partie à l'autre (tirage au sort).
- [ ] L'écran de passage n'affiche ni cible, ni concepts, ni indice.
- [ ] « Autres concepts » change la paire, pas la cible ; une paire ne revient pas dans la partie.
- [ ] « Valider l'indice » impossible avec un champ vide ou composé d'espaces.
- [ ] Le curseur se déplace au doigt, à la souris et aux flèches du clavier.
- [ ] Points corrects aux bornes : écart 7 → 4, 8 → 3, 14 → 3, 15 → 2, 28 → 1, 29 → 0.
- [ ] Les équipes alternent bien ; nombre total d'indices = 2 × tours.
- [ ] Le récap liste tous les tours avec les bonnes valeurs et le bon total.
- [ ] Rechargement de la page en cours de partie → reprise possible sans révéler la cible au mauvais
      moment (reprise sur un écran de passage).
- [ ] Affichage correct à 360 px de large et sur ordinateur.
