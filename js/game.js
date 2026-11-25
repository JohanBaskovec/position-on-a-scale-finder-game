/*
 * Logique pure du jeu « Le Curseur » : aucun accès au DOM ni au stockage.
 * L'état d'une partie est un objet JSON simple (sérialisable pour la sauvegarde).
 *
 * Positions : entiers de 0 (concept de gauche) à 100 (concept de droite).
 */
(function (root) {
  'use strict';

  // --- Constantes -----------------------------------------------------------

  // Écart maximal (inclus, en points de pourcentage de la réglette) pour chaque palier de points.
  const SCORE_BANDS = Object.freeze([
    Object.freeze({ max: 7, points: 4 }),
    Object.freeze({ max: 14, points: 3 }),
    Object.freeze({ max: 21, points: 2 }),
    Object.freeze({ max: 28, points: 1 }),
  ]);

  const POSITION_MIN = 0;
  const POSITION_MAX = 100;
  const DEFAULT_GUESS = 50;
  const ROUNDS = Object.freeze({ min: 1, max: 20, default: 5 });
  const MAX_NAME_LENGTH = 20;
  const MAX_CLUE_LENGTH = 40;

  const PHASES = Object.freeze({
    HANDOFF_GIVE: 'handoff-give',
    GIVE: 'give',
    HANDOFF_GUESS: 'handoff-guess',
    GUESS: 'guess',
    REVEAL: 'reveal',
    RECAP: 'recap',
  });

  // --- Hasard (point d'entrée unique, remplaçable en test) -------------------

  let rng = Math.random;

  function random() {
    return rng();
  }

  function setRandom(fn) {
    rng = fn || Math.random;
  }

  function randomInt(min, max) {
    return min + Math.floor(random() * (max - min + 1));
  }

  // --- Réglages --------------------------------------------------------------

  function cleanText(text) {
    return String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  }

  function defaultSettings() {
    return { teamNames: ['Les Bleus', 'Les Oranges'], roundCount: ROUNDS.default };
  }

  /** Renvoie { ok, error } avec error ∈ null | 'empty-name' | 'same-name' | 'bad-rounds'. */
  function validateSettings(settings) {
    const names = (settings.teamNames || []).map(cleanText);
    if (names.length !== 2 || names.some((n) => !n)) return { ok: false, error: 'empty-name' };
    if (names[0].toLowerCase() === names[1].toLowerCase()) return { ok: false, error: 'same-name' };
    const n = settings.roundCount;
    if (!Number.isInteger(n) || n < ROUNDS.min || n > ROUNDS.max) return { ok: false, error: 'bad-rounds' };
    return { ok: true, error: null };
  }

  function normalizeSettings(settings) {
    return {
      teamNames: settings.teamNames.map((n) => cleanText(n).slice(0, MAX_NAME_LENGTH)),
      roundCount: settings.roundCount,
    };
  }

  // --- Score -----------------------------------------------------------------

  function scoreFor(distance) {
    for (const band of SCORE_BANDS) {
      if (distance <= band.max) return band.points;
    }
    return 0;
  }

  // --- Partie ----------------------------------------------------------------

  /** Tire une paire non encore utilisée (sens aléatoire) et la marque comme utilisée. */
  function drawPair(game, concepts) {
    let available = [];
    for (let i = 0; i < concepts.length; i++) {
      if (!game.usedPairIndexes.includes(i)) available.push(i);
    }
    if (available.length === 0) {
      game.usedPairIndexes = [];
      available = concepts.map((_, i) => i);
    }
    const index = available[Math.floor(random() * available.length)];
    game.usedPairIndexes.push(index);
    const pair = concepts[index].slice();
    if (random() < 0.5) pair.reverse();
    return { index, pair };
  }

  function startTurn(game, giverTeam, concepts) {
    const { index, pair } = drawPair(game, concepts);
    game.turns.push({
      giverTeam,
      guesserTeam: 1 - giverTeam,
      pair,
      pairIndex: index,
      target: randomInt(POSITION_MIN, POSITION_MAX),
      rerollCount: 0,
      clue: null,
      guess: null,
      distance: null,
      points: null,
    });
    game.phase = PHASES.HANDOFF_GIVE;
  }

  function createGame(settings, concepts) {
    const game = {
      settings: normalizeSettings(settings),
      startingTeam: randomInt(0, 1),
      turns: [],
      phase: PHASES.HANDOFF_GIVE,
      usedPairIndexes: [],
    };
    startTurn(game, game.startingTeam, concepts);
    return game;
  }

  function currentTurn(game) {
    return game.turns[game.turns.length - 1];
  }

  /** Nombre total d'indices : chaque équipe fait deviner une fois par tour. */
  function totalTurns(game) {
    return game.settings.roundCount * 2;
  }

  /** Numéro de tour affiché (1 tour = un indice par équipe). */
  function roundNumber(game) {
    return Math.ceil(game.turns.length / 2);
  }

  /** « Prêt » : passe d'un écran de passage à l'écran de jeu correspondant. */
  function ready(game) {
    if (game.phase === PHASES.HANDOFF_GIVE) game.phase = PHASES.GIVE;
    else if (game.phase === PHASES.HANDOFF_GUESS) game.phase = PHASES.GUESS;
    else return false;
    return true;
  }

  /** Remplace la paire de concepts ; la cible ne change pas. */
  function rerollPair(game, concepts) {
    if (game.phase !== PHASES.GIVE) return false;
    const turn = currentTurn(game);
    const { index, pair } = drawPair(game, concepts);
    turn.pair = pair;
    turn.pairIndex = index;
    turn.rerollCount += 1;
    return true;
  }

  /** Valide l'indice. Refusé s'il est vide : on ne peut pas passer son tour. */
  function submitClue(game, clue) {
    if (game.phase !== PHASES.GIVE) return false;
    const clean = cleanText(clue).slice(0, MAX_CLUE_LENGTH);
    if (!clean) return false;
    currentTurn(game).clue = clean;
    game.phase = PHASES.HANDOFF_GUESS;
    return true;
  }

  function clampPosition(value) {
    return Math.min(POSITION_MAX, Math.max(POSITION_MIN, Math.round(value)));
  }

  function submitGuess(game, guess) {
    if (game.phase !== PHASES.GUESS) return false;
    const turn = currentTurn(game);
    turn.guess = clampPosition(guess);
    turn.distance = Math.abs(turn.guess - turn.target);
    turn.points = scoreFor(turn.distance);
    game.phase = PHASES.REVEAL;
    return true;
  }

  /** Après le résultat : tour suivant (l'équipe qui vient de deviner donne l'indice) ou récap. */
  function advance(game, concepts) {
    if (game.phase !== PHASES.REVEAL) return false;
    if (game.turns.length >= totalTurns(game)) {
      game.phase = PHASES.RECAP;
    } else {
      startTurn(game, currentTurn(game).guesserTeam, concepts);
    }
    return true;
  }

  /** Score commun + détail par équipe (points rapportés en donnant l'indice / en devinant). */
  function totals(game) {
    const result = {
      total: 0,
      byTeam: [
        { asGiver: 0, asGuesser: 0 },
        { asGiver: 0, asGuesser: 0 },
      ],
    };
    for (const turn of game.turns) {
      if (turn.points == null) continue;
      result.total += turn.points;
      result.byTeam[turn.giverTeam].asGiver += turn.points;
      result.byTeam[turn.guesserTeam].asGuesser += turn.points;
    }
    return result;
  }

  // --- Sauvegarde / reprise ---------------------------------------------------

  /** Vérification légère d'une partie relue depuis le stockage. */
  function isValidSavedGame(game) {
    try {
      return (
        game &&
        Object.values(PHASES).includes(game.phase) &&
        game.phase !== PHASES.RECAP &&
        validateSettings(game.settings).ok &&
        Array.isArray(game.turns) &&
        game.turns.length >= 1 &&
        game.turns.length <= totalTurns(game) &&
        Array.isArray(game.usedPairIndexes) &&
        game.turns.every(
          (t) => Array.isArray(t.pair) && t.pair.length === 2 && Number.isInteger(t.target) && (t.giverTeam === 0 || t.giverTeam === 1)
        )
      );
    } catch (e) {
      return false;
    }
  }

  /** À la reprise, on ne retombe jamais directement sur un écran contenant un secret. */
  function resumePhase(phase) {
    if (phase === PHASES.GIVE) return PHASES.HANDOFF_GIVE;
    if (phase === PHASES.GUESS) return PHASES.HANDOFF_GUESS;
    return phase;
  }

  const Game = {
    SCORE_BANDS,
    POSITION_MIN,
    POSITION_MAX,
    DEFAULT_GUESS,
    ROUNDS,
    MAX_NAME_LENGTH,
    MAX_CLUE_LENGTH,
    PHASES,
    setRandom,
    defaultSettings,
    validateSettings,
    cleanText,
    scoreFor,
    createGame,
    currentTurn,
    totalTurns,
    roundNumber,
    ready,
    rerollPair,
    submitClue,
    submitGuess,
    advance,
    totals,
    isValidSavedGame,
    resumePhase,
  };

  root.Game = Game;
  if (typeof module !== 'undefined' && module.exports) module.exports = Game;
})(typeof window !== 'undefined' ? window : globalThis);
