# Décisions de conception

Toutes les décisions ci-dessous ont été validées par l'utilisateur. Toute nouvelle question va dans ce tableau.

| #   | Question | Décision | Statut |
|-----|----------|-------------------|--------|
| D-1 | Que compte « nombre de tours » dans le menu ? | Un tour = chaque équipe fait deviner une fois (2 indices). 5 tours = 10 indices, pour que les deux équipes aient exactement le même nombre d'essais. | validé |
| D-2 | Score commun (coop) ou un score par équipe ? Qui marque : l'équipe qui devine, celle qui donne l'indice, les deux ? | Score **commun** (le jeu est coopératif), avec le détail de la contribution de chaque équipe dans le récap. | validé |
| D-3 | L'indice est-il tapé dans l'appli ou dit à voix haute ? Un seul mot imposé ? | Tapé (affiché aux devineurs et dans le récap). Un mot conseillé, mais espaces autorisés (ex. « pomme de terre »). | validé |
| D-4 | « Autres concepts » : illimité ? change aussi la cible ? | Illimité, la cible ne change pas. | validé |
| D-5 | Après le résultat, l'équipe qui vient de deviner passe-t-elle directement à son indice ? | Non : on repasse par « Tour de l'équipe X / Prêt », car l'autre équipe regarde souvent le résultat et verrait la nouvelle cible. | validé |
| D-6 | Position initiale du curseur de l'équipe qui devine | Au centre (50). | validé |
| D-7 | Cible : n'importe où entre 0 et 100, extrémités comprises ? | Oui, tirage uniforme sur 0–100. | validé |
| D-8 | Sauvegarder la partie en cours (rechargement accidentel) et les derniers réglages ? | Oui, en `localStorage`, reprise sur un écran de passage. | validé |
| D-9 | Inverser aléatoirement le sens des paires (Froid/Chaud au lieu de Chaud/Froid) ? | Oui. | validé |
| D-10 | Nom du jeu affiché | « Le Curseur ». | validé |
| D-11 | Les zones de points (bandes 4/3/2/1) sont-elles montrées au donneur ? | Oui, autour de la cible, pour l'aider à calibrer. Montrées à tous au moment du résultat. | validé |
