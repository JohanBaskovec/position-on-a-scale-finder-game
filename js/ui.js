/*
 * Interface du jeu « Le Curseur » : rendu des écrans et événements.
 * La logique vit dans game.js (objet global Game) ; les paires dans concepts.js (CONCEPTS).
 */
(function () {
  'use strict';

  // --- Libellés (tous les textes de l'interface générés par le JS) -------------

  const LABELS = {
    roundOf: (n, total) => `Tour ${n} / ${total}`,
    score: (n) => `Score commun : ${n} point${n > 1 ? 's' : ''}`,
    roundsHint: (n) => `${n * 2} indices au total : chaque équipe fait deviner ${n} fois.`,
    giverRole: 'À vous de faire deviner',
    guesserRole: 'À vous de deviner',
    giverWarning: "L'autre équipe ne doit pas voir l'écran suivant.",
    guesserWarning: '',
    giveLine: (team) => `${team}, faites deviner`,
    guessLine: (team) => `${team}, à vous de deviner`,
    points: (n) => (n > 1 ? `+${n} points` : n === 1 ? '+1 point' : '0 point'),
    distance: (d) => (d === 0 ? 'En plein dans le mille !' : `Écart de ${d} %`),
    continue: 'Continuer',
    seeRecap: 'Voir le récapitulatif',
    clueQuote: (clue) => `« ${clue} »`,
    teamTableHeads: ['Équipe', 'Devine', 'Fait deviner'],
    turnMeta: (t) => `Cible ${t.target} · Réponse ${t.guess} · écart ${t.distance}`,
    sliderLabel: 'Position entre les deux concepts',
    errors: {
      'empty-name': 'Donnez un nom à chaque équipe.',
      'same-name': 'Les deux équipes doivent avoir des noms différents.',
      'bad-rounds': 'Choisissez un nombre de tours valide.',
    },
  };

  const STORAGE_KEYS = { settings: 'curseur.settings', game: 'curseur.game' };
  const P = Game.PHASES;

  // --- Utilitaires ------------------------------------------------------------

  const $ = (id) => document.getElementById(id);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function storageGet(key) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* stockage indisponible : le jeu fonctionne sans */ }
  }

  function storageRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (e) { /* idem */ }
  }

  function teamSpan(settings, team) {
    return el('span', `t${team}`, settings.teamNames[team]);
  }

  // --- Réglette ---------------------------------------------------------------

  /**
   * Construit une réglette.
   * opts : { pair, target?, guess?, bands?, compact?, interactive?, onChange? }
   * Renvoie { root, getValue }.
   */
  function createScale(opts) {
    const root = el('div', 'scale' + (opts.compact ? ' compact' : ''));

    const labels = el('div', 'scale-labels');
    labels.append(el('span', 'scale-label left', opts.pair[0]), el('span', 'scale-label right', opts.pair[1]));

    const track = el('div', 'scale-track' + (opts.interactive ? ' interactive' : ''));
    const bg = el('div', 'scale-bg');
    track.append(bg);

    if (opts.bands && opts.target != null) drawBands(bg, opts.target, !opts.compact);

    if (opts.target != null) {
      const marker = el('div', 'marker-target');
      marker.style.left = `${opts.target}%`;
      track.append(marker);
    }

    let value = opts.guess != null ? opts.guess : null;
    let handle = null;
    if (value != null) {
      handle = el('div', 'handle');
      handle.style.left = `${value}%`;
      track.append(handle);
    }

    if (opts.interactive) {
      track.tabIndex = 0;
      track.setAttribute('role', 'slider');
      track.setAttribute('aria-label', LABELS.sliderLabel);
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');

      const setValue = (v) => {
        value = Math.min(100, Math.max(0, Math.round(v)));
        handle.style.left = `${value}%`;
        track.setAttribute('aria-valuenow', String(value));
        track.setAttribute('aria-valuetext', `${opts.pair[0]} ${100 - value} %, ${opts.pair[1]} ${value} %`);
        if (opts.onChange) opts.onChange(value);
      };
      const fromPointer = (event) => {
        const rect = track.getBoundingClientRect();
        setValue(((event.clientX - rect.left) / rect.width) * 100);
      };

      track.addEventListener('pointerdown', (event) => {
        track.setPointerCapture(event.pointerId);
        track.focus({ preventScroll: true });
        fromPointer(event);
      });
      track.addEventListener('pointermove', (event) => {
        if (track.hasPointerCapture(event.pointerId)) fromPointer(event);
      });
      track.addEventListener('keydown', (event) => {
        const steps = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
        if (event.key in steps) setValue(value + steps[event.key] * (event.shiftKey ? 10 : 1));
        else if (event.key === 'Home') setValue(0);
        else if (event.key === 'End') setValue(100);
        else return;
        event.preventDefault();
      });
      track.setAttribute('aria-valuenow', String(value));
    }

    root.append(labels, track);
    return { root, getValue: () => value };
  }

  /** Zones de points centrées sur la cible (empilées : plus c'est proche, plus c'est foncé). */
  function drawBands(container, target, withNumbers) {
    const bands = Game.SCORE_BANDS;
    for (let i = bands.length - 1; i >= 0; i--) {
      const left = Math.max(0, target - bands[i].max);
      const right = Math.min(100, target + bands[i].max);
      const band = el('div', 'band');
      band.style.left = `${left}%`;
      band.style.width = `${right - left}%`;
      container.append(band);
    }
    if (!withNumbers) return;
    bands.forEach((band, i) => {
      const inner = i === 0 ? 0 : bands[i - 1].max;
      [-1, 1].forEach((side) => {
        const a = Math.min(100, Math.max(0, target + side * inner));
        const b = Math.min(100, Math.max(0, target + side * band.max));
        if (Math.abs(b - a) < 4.5) return;
        const num = el('span', 'band-num', String(band.points));
        num.style.left = `${(a + b) / 2}%`;
        container.append(num);
      });
    });
  }

  function mount(container, node) {
    container.replaceChildren(node);
  }

  // --- État -------------------------------------------------------------------

  let settings = loadSettings();
  let game = null;
  let guessValue = Game.DEFAULT_GUESS;
  let giveScale = null;

  function loadSettings() {
    const saved = storageGet(STORAGE_KEYS.settings);
    if (saved && Game.validateSettings(saved).ok) return saved;
    return Game.defaultSettings();
  }

  function persist() {
    if (!game) return; // au menu : ne pas effacer une partie sauvegardée proposée à la reprise
    if (game.phase === P.RECAP) storageRemove(STORAGE_KEYS.game);
    else storageSet(STORAGE_KEYS.game, game);
  }

  // --- Écrans -----------------------------------------------------------------

  const screens = {
    menu: $('screen-menu'),
    handoff: $('screen-handoff'),
    give: $('screen-give'),
    guess: $('screen-guess'),
    reveal: $('screen-reveal'),
    recap: $('screen-recap'),
  };

  const SCREEN_FOR_PHASE = {
    [P.HANDOFF_GIVE]: 'handoff',
    [P.HANDOFF_GUESS]: 'handoff',
    [P.GIVE]: 'give',
    [P.GUESS]: 'guess',
    [P.REVEAL]: 'reveal',
    [P.RECAP]: 'recap',
  };

  function themeTeam() {
    if (!game) return null;
    const turn = Game.currentTurn(game);
    if (game.phase === P.HANDOFF_GIVE || game.phase === P.GIVE) return turn.giverTeam;
    if (game.phase === P.HANDOFF_GUESS || game.phase === P.GUESS) return turn.guesserTeam;
    return null;
  }

  function render() {
    const name = game ? SCREEN_FOR_PHASE[game.phase] : 'menu';
    for (const [key, node] of Object.entries(screens)) node.hidden = key !== name;

    const team = themeTeam();
    if (team == null) delete document.body.dataset.team;
    else document.body.dataset.team = String(team);

    const inGame = game && game.phase !== P.RECAP;
    $('topbar').hidden = !inGame;
    if (inGame) {
      $('topbar-info').textContent = LABELS.roundOf(Game.roundNumber(game), game.settings.roundCount);
    }

    renderers[name]();
    persist();
    window.scrollTo(0, 0);
  }

  const renderers = {
    menu: renderMenu,
    handoff: renderHandoff,
    give: renderGive,
    guess: renderGuess,
    reveal: renderReveal,
    recap: renderRecap,
  };

  // Menu

  function renderMenu() {
    $('team-0').value = settings.teamNames[0];
    $('team-1').value = settings.teamNames[1];
    $('rounds-value').textContent = String(settings.roundCount);
    $('resume-btn').hidden = !Game.isValidSavedGame(storageGet(STORAGE_KEYS.game));
    updateMenu();
  }

  function readMenuSettings() {
    return {
      teamNames: [$('team-0').value, $('team-1').value],
      roundCount: settings.roundCount,
    };
  }

  function updateMenu() {
    const check = Game.validateSettings(readMenuSettings());
    $('menu-error').textContent = check.ok ? '' : LABELS.errors[check.error];
    $('play-btn').disabled = !check.ok;
    $('rounds-hint').textContent = LABELS.roundsHint(settings.roundCount);
    $('rounds-minus').disabled = settings.roundCount <= Game.ROUNDS.min;
    $('rounds-plus').disabled = settings.roundCount >= Game.ROUNDS.max;
  }

  function changeRounds(delta) {
    const next = settings.roundCount + delta;
    if (next < Game.ROUNDS.min || next > Game.ROUNDS.max) return;
    settings.roundCount = next;
    $('rounds-value').textContent = String(next);
    updateMenu();
  }

  function startGame(fromSettings) {
    const toSave = { teamNames: fromSettings.teamNames.map(Game.cleanText), roundCount: fromSettings.roundCount };
    settings = toSave;
    storageSet(STORAGE_KEYS.settings, toSave);
    game = Game.createGame(toSave, CONCEPTS);
    render();
  }

  // Passage du téléphone (aucune information secrète)

  function renderHandoff() {
    const turn = Game.currentTurn(game);
    const giving = game.phase === P.HANDOFF_GIVE;
    const team = giving ? turn.giverTeam : turn.guesserTeam;
    $('handoff-round').textContent = LABELS.roundOf(Game.roundNumber(game), game.settings.roundCount);
    $('handoff-team').textContent = game.settings.teamNames[team];
    $('handoff-role').textContent = giving ? LABELS.giverRole : LABELS.guesserRole;
    $('handoff-warning').textContent = giving ? LABELS.giverWarning : LABELS.guesserWarning;
    $('handoff-score').textContent = LABELS.score(Game.totals(game).total);
  }

  // Donner l'indice

  function renderGive() {
    const turn = Game.currentTurn(game);
    $('give-team').textContent = LABELS.giveLine(game.settings.teamNames[turn.giverTeam]);
    $('clue-input').value = '';
    $('clue-btn').disabled = true;
    renderGiveScale();
  }

  function renderGiveScale() {
    const turn = Game.currentTurn(game);
    giveScale = createScale({ pair: turn.pair, target: turn.target, bands: true });
    mount($('give-scale'), giveScale.root);
  }

  // Deviner

  function renderGuess() {
    const turn = Game.currentTurn(game);
    guessValue = Game.DEFAULT_GUESS;
    $('guess-team').textContent = LABELS.guessLine(game.settings.teamNames[turn.guesserTeam]);
    $('guess-clue').textContent = LABELS.clueQuote(turn.clue);
    const scale = createScale({
      pair: turn.pair,
      guess: guessValue,
      interactive: true,
      onChange: (v) => { guessValue = v; },
    });
    mount($('guess-scale'), scale.root);
  }

  // Résultat

  function renderReveal() {
    const turn = Game.currentTurn(game);
    $('reveal-points').textContent = LABELS.points(turn.points);
    $('reveal-detail').textContent = `${LABELS.distance(turn.distance)} · ${LABELS.clueQuote(turn.clue)}`;
    const scale = createScale({ pair: turn.pair, target: turn.target, guess: turn.guess, bands: true });
    mount($('reveal-scale'), scale.root);
    $('reveal-score').textContent = LABELS.score(Game.totals(game).total);
    $('continue-btn').textContent = game.turns.length >= Game.totalTurns(game) ? LABELS.seeRecap : LABELS.continue;
  }

  // Récapitulatif

  function renderRecap() {
    const totals = Game.totals(game);
    $('recap-total').textContent = `${totals.total} pt${totals.total > 1 ? 's' : ''}`;

    const table = $('recap-teams');
    table.replaceChildren();
    LABELS.teamTableHeads.forEach((text) => table.append(el('span', 'th', text)));
    [0, 1].forEach((team) => {
      table.append(teamSpan(game.settings, team));
      table.append(el('span', 'num', String(totals.byTeam[team].asGuesser)));
      table.append(el('span', 'num', String(totals.byTeam[team].asGiver)));
    });

    const list = $('recap-list');
    list.replaceChildren();
    game.turns.forEach((turn, i) => {
      const card = el('li', 'turn-card');
      const head = el('div', 'turn-head');
      const who = el('span', 'turn-who');
      who.append(teamSpan(game.settings, turn.giverTeam), ' → ', teamSpan(game.settings, turn.guesserTeam));
      head.append(el('span', 'turn-num', `${i + 1}.`), who, el('span', 'turn-points', LABELS.points(turn.points)));
      card.append(head, el('p', 'turn-clue', LABELS.clueQuote(turn.clue)));
      card.append(createScale({ pair: turn.pair, target: turn.target, guess: turn.guess, bands: true, compact: true }).root);
      card.append(el('p', 'turn-meta', LABELS.turnMeta(turn)));
      list.append(card);
    });
  }

  // --- Événements ---------------------------------------------------------------

  function setupEvents() {
    // Menu
    $('team-0').addEventListener('input', updateMenu);
    $('team-1').addEventListener('input', updateMenu);
    $('rounds-minus').addEventListener('click', () => changeRounds(-1));
    $('rounds-plus').addEventListener('click', () => changeRounds(1));
    $('menu-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const current = readMenuSettings();
      if (Game.validateSettings(current).ok) startGame(current);
    });
    $('resume-btn').addEventListener('click', () => {
      const saved = storageGet(STORAGE_KEYS.game);
      if (!Game.isValidSavedGame(saved)) return;
      saved.phase = Game.resumePhase(saved.phase);
      game = saved;
      render();
    });

    // Passage
    $('ready-btn').addEventListener('click', () => {
      if (Game.ready(game)) render();
    });

    // Indice
    $('clue-input').addEventListener('input', () => {
      $('clue-btn').disabled = Game.cleanText($('clue-input').value) === '';
    });
    $('clue-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        $('clue-btn').click();
      }
    });
    $('reroll-btn').addEventListener('click', () => {
      if (Game.rerollPair(game, CONCEPTS)) {
        renderGiveScale();
        persist();
      }
    });
    $('clue-btn').addEventListener('click', () => {
      if (Game.submitClue(game, $('clue-input').value)) render();
    });

    // Réponse
    $('guess-btn').addEventListener('click', () => {
      if (Game.submitGuess(game, guessValue)) render();
    });

    // Résultat
    $('continue-btn').addEventListener('click', () => {
      if (Game.advance(game, CONCEPTS)) render();
    });

    // Récap
    $('replay-btn').addEventListener('click', () => startGame(game.settings));
    $('menu-btn').addEventListener('click', () => {
      game = null;
      render();
    });

    // Quitter
    const dialog = $('quit-dialog');
    $('quit-btn').addEventListener('click', () => dialog.showModal());
    dialog.addEventListener('close', () => {
      if (dialog.returnValue === 'quit') {
        game = null;
        storageRemove(STORAGE_KEYS.game);
        render();
      }
      dialog.returnValue = '';
    });
  }

  setupEvents();
  render();
})();
