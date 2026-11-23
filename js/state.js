/* ============================================================
   État du jeu, formules, simulation, sauvegarde
   ============================================================ */

const SAVE_KEY = 'novaColonies.save.v2';
const MAX_OFFLINE_MS = 7 * 24 * 3600 * 1000;
const MAX_FIELDS = Infinity;   // plus de limite de cases (elle bloquait silencieusement les bâtiments)

let S = null;

function newState() {
  const buildings = {}, techs = {}, res = {}, click = {};
  Object.keys(BUILDINGS).forEach(k => buildings[k] = 0);
  Object.keys(TECHS).forEach(k => techs[k] = 0);
  Object.keys(CLICK_TECHS).forEach(k => click[k] = 0);
  RES_KEYS.forEach(r => res[r] = 0);
  return {
    v: 2,
    created: Date.now(),
    time: Date.now(),
    res, buildings, techs, click,
    planet: { name: planetName(), seed: (Math.random() * 2 ** 31) | 0 },
    stats: { clicks: 0, raidsWon: 0, expeds: 0, playTime: 0 },
    log: [],
    seenIntro: false,
    ui: { collapsed: {} },
    auto: {},   // bâtiments sélectionnés pour l'achat automatique (+ « lowest »)
    view: 'planet',   // corps affiché : 'planet' ou index de la lune (0, 1, 2)
    moons: [],
    fleet: { destroyer: 0, frigate: 0, warship: 0 },   // vaisseaux construits (défense / exploration)
    artifacts: {},                          // artefacts trouvés en expédition (nombre d'exemplaires)
    raid: { wave: 1, step: 0, last: null, plan: {}, fx: {}, trophies: 0 },   // vagues pirates, événements, trophées
    exped: {},                                                               // expéditions en cours
    ach: {},                                                                 // succès débloqués
    map: { seed: (Math.random() * 2 ** 31) | 0, explored: { 0: true }, probe: null, owner: null, garrison: null, news: [], t: 0 },   // carte galactique
  };
}

/* Une lune : des mines, une technologie (navette) et son propre compteur de matière */
function newMoon() {
  const res = {}, mines = {}, tech = {};
  RES_KEYS.forEach(r => res[r] = 0);
  Object.keys(MINES).forEach(k => mines[k] = 0);
  Object.keys(MOON_TECHS).forEach(k => tech[k] = 0);
  const seed = (Math.random() * 2 ** 31) | 0, mat = moonMat(seed);
  res[mat] = 0;
  return { res, mines, tech, mat, seed, name: moonName(), cargoOn: true, mined: 0 };
}
/* matière d'une lune : déterminée par son type de planète */
function moonMat(seed) { return MAT_BY_TYPE[planetTraits(seed, 'moon').type] || 'quartz'; }
/* matériau lunaire tiré au sort, différent de ceux des autres lunes */
function lunarMat(except = []) {
  const taken = ((typeof S !== 'undefined' && S && S.moons) ? S.moons.map(m => m.mat) : []).concat(except);
  const free = Object.keys(LUNAR_MATS).filter(k => !taken.includes(k));
  const pool = free.length ? free : Object.keys(LUNAR_MATS);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* Nom aléatoire de planète, du type « Gliese-581 » */
function planetName() {
  return `${PLANET_NAMES[Math.floor(Math.random() * PLANET_NAMES.length)]}-${2 + Math.floor(Math.random() * 998)}`;
}

/* Nom aléatoire unique, du type « Alpha#2 » */
function moonName() {
  const taken = (typeof S !== 'undefined' && S && S.moons) ? S.moons.map(m => m.name) : [];
  for (let i = 0; i < 50; i++) {
    const n = `${MOON_NAMES[Math.floor(Math.random() * MOON_NAMES.length)]}#${1 + Math.floor(Math.random() * 9)}`;
    if (!taken.includes(n)) return n;
  }
  return `Lune#${taken.length + 1}`;
}

const G = {
  rev: 0,
  listeners: [],

  on(fn) { this.listeners.push(fn); },
  emit(msg, type = 'info', silent = false) {
    S.log.unshift({ t: Date.now(), msg, type });
    if (S.log.length > 40) S.log.length = 40;
    this.rev++;
    if (!silent) this.listeners.forEach(f => f(msg, type));
  },

  /* ---------- Formules ---------- */
  growth(L) { return L * Math.pow(1.15, L); },

  /* kind : 'b' bâtiment, 'm' mine de lune, 'x' techno de lune, 't' recherche, 'c' technologie */
  defOf(kind, id) {
    if (kind === 's') return SHIPS[id];
    return kind === 'b' || kind === 'm' ? BUILDINGS[id] : kind === 't' ? TECHS[id] : kind === 'x' ? MOON_TECHS[id] : CLICK_TECHS[id];
  },
  levels(kind) {
    if (kind === 's') return S.fleet;
    if (kind === 'm') return this.curMoon().mines;
    if (kind === 'x') return this.curMoon().tech;
    return kind === 'b' ? S.buildings : kind === 't' ? S.techs : S.click;
  },

  /* ---------- Lunes ---------- */
  MAX_MOONS: 3,
  moonCount() { return Math.min(this.MAX_MOONS, S.click.terraform); },
  /* crée les lunes manquantes (une par niveau de Terraformage) */
  syncMoons() { while (S.moons.length < this.moonCount()) S.moons.push(newMoon()); },
  /* les lunes disparaissent une fois la carte galactique créée (elles ont servi au lancement) */
  moonsGone() { return S.click.gate > 0; },
  moonIdx() { return !this.moonsGone() && typeof S.view === 'number' && S.moons[S.view] ? S.view : -1; },
  curMoon() { return S.moons[Math.max(0, this.moonIdx())]; },
  INF_CAPS: { ferrite: Infinity, deuterium: Infinity, darkMatter: Infinity },
  /* Compteur utilisé pour payer : chaque lune a le sien */
  // le Commerce (niveau commun) se paie et s'utilise avec le compteur du corps affiché
  wallet(kind, id, auto) {
    if (kind === 'x' && MOON_TECHS[id] && MOON_TECHS[id].planetPaid) return S.res;
    if (kind === 'm' || kind === 'x') return this.curMoon().res;
    return S.res;
  },
  shareWallet() { return this.moonIdx() >= 0 ? this.curMoon().res : S.res; },
  /* Production des mines d'une lune (sans stockage : capacité illimitée) */
  moonRates(moon = this.curMoon()) {
    const out = { caps: this.INF_CAPS };
    for (const r of RES_KEYS) out[r] = 0;
    if (!moon) return out;
    out[moon.mat] = 0;   // plus de production automatique : seulement les clics
    return out;
  },
  /* robot d'extraction lunaire : unités par seconde */
  /* l'extraction ronge la lune : son diamètre diminue (jusqu'à moitié au niveau 25) */
  /* Masse d'une lune : juste de quoi payer le Tremplin jusqu'au niveau 10 (via le Commerce lunaire),
     les 20 niveaux d'Extraction, sans marge. */
  moonMass(mat) {
    const sum = (def, n) => { let s = 0; const c = Object.values(def.cost)[0]; for (let L = 1; L <= n; L++) s += c * Math.pow(def.factor, L - 1); return s; };
    const v = LUNAR_MATS[mat].value / RES_VALUE.darkMatter;   // matière noire obtenue par unité
    const need = sum(MOON_TECHS.jump, MOON_TECHS.jump.max) / v + sum(MOON_TECHS.extract, MOON_TECHS.extract.max);
    return Math.ceil(need);   // sans marge : tout juste de quoi finir
  },
  /* Matière lunaire qu'il faut encore extraire pour finir la lune (Extraction 20 et Tremplin 10),
     compte tenu des stocks actuels : la lune n'est jamais vide tant que ce n'est pas fini. */
  moonDeficit(moon) {
    const left = (id, from) => { const d = MOON_TECHS[id], c = Object.values(d.cost)[0]; let s = 0; for (let L = from + 1; L <= d.max; L++) s += c * Math.pow(d.factor, L - 1); return s; };
    const v = LUNAR_MATS[moon.mat].value / RES_VALUE.darkMatter;
    const dm = Math.max(0, left('jump', moon.tech.jump || 0) - (moon.res.darkMatter || 0));
    return Math.max(0, Math.ceil(left('extract', moon.tech.extract || 0) + dm / v - (moon.res[moon.mat] || 0)));
  },
  // matière restante : la masse non extraite, mais jamais moins que ce qu'il faut pour finir (pas de blocage)
  moonLeft(moon) { return Math.max(0, this.moonMass(moon.mat) - (moon.mined || 0), this.moonDeficit(moon)); },
  moonLeftFrac(moon) { return moon ? Math.min(1, this.moonLeft(moon) / this.moonMass(moon.mat)) : 1; },
  /* diamètre : suit la masse restante ; la lune disparaît une fois épuisée */
  moonScale(moon) { const f = this.moonLeftFrac(moon); return f > 0 ? 0.25 + 0.75 * f : 0; },
  /* matériau extrait par clic selon le niveau d'Extraction */
  clickYield(L) { return Math.round(2 * Math.pow(1.85, L || 0)); },
  extractRate(L) { return L > 0 ? 2 * Math.pow(1.6, L - 1) : 0; },
  /* Commerce lunaire : n unités du matériau de la lune → matériau r de la planète (selon les valeurs) */
  /* dir : 'darkMatter' (matériau lunaire → matière noire de la lune) ou 'lunar' (matière noire → matériau lunaire) */
  moonTradeQuote(dir, moon = this.curMoon()) {
    // commerce lunaire gratuit et sans niveau : tout le stock est converti d'un coup
    const v = LUNAR_MATS[moon.mat].value / RES_VALUE.darkMatter, b = Infinity;
    if (dir === 'lunar') {
      const n = Math.floor(Math.min(b * v, moon.res.darkMatter || 0));
      return { n, get: Math.floor(n / v), v, from: 'darkMatter', to: moon.mat };
    }
    const n = Math.floor(Math.min(b, moon.res[moon.mat] || 0));
    return { n, get: Math.floor(n * v), v, from: moon.mat, to: 'darkMatter' };
  },
  moonTrade(dir) {
    const moon = this.curMoon(), q = this.moonTradeQuote(dir, moon);
    if (q.n < 1 || q.get < 1) return { ok: false, msg: 'Échange impossible : stock insuffisant.' };
    moon.res[q.from] -= q.n; moon.res[q.to] = (moon.res[q.to] || 0) + q.get;
    return { ok: true, ...q };
  },
  /* Espace galactique : les 3 lunes doivent avoir leur ascenseur au niveau voulu */
  /* structure du tremplin selon la lune : chantier, réservoir, rail d'accélération (les trois étages d'un lanceur) */
  gateStyle(i) { return ['yard', 'tank', 'rail'][i % 3]; },
  moonsJumpOk(L) { return S.moons.length >= this.MAX_MOONS && S.moons.every(m => (m.tech.jump || 0) >= L); },
  moonsCargoOk(L) { return S.moons.length >= this.MAX_MOONS && S.moons.every(m => (m.tech.cargo || 0) >= L); },
  /* Production qui alimente un compteur, et sa capacité */
  walletRates(kind) { return kind === 'm' || kind === 'x' ? this.moonRates() : this.rates(); },

  /* Ascenseur Gravitationnel : toutes les 30 s, envoie le stock de la lune vers la planète.
     Le niveau augmente la quantité transportée (par matériau et par envoi). */
  CARGO_PERIOD: 30,
  /* matière noire montée par seconde vers la lune selon le niveau de l'ascenseur */
  cargoRate(L) { return L > 0 ? 5 * Math.pow(2, L - 1) : 0; },
  cargoCap(L) { return L > 0 ? 1000 * Math.pow(2, L - 1) : 0; },
  cargoT: [],
  cargoIn(i) { return Math.max(0, this.CARGO_PERIOD - (this.cargoT[i] || 0)); },
  MANUAL_CAP: 500,
  cargoShip(i, manual = false) {
    const moon = S.moons[i], caps = this.rates().caps, got = {};
    if (!manual && !(moon.tech.cargo > 0)) return got;
    const n = Math.max(0, Math.min(moon.res.darkMatter || 0, caps.darkMatter - S.res.darkMatter));
    moon.res.darkMatter -= n; S.res.darkMatter += n; got.darkMatter = n;
    return got;
  },

  art(id) { return (S && S.artifacts && S.artifacts[id]) || 0; },   // nombre d'exemplaires d'un artefact

  costOf(kind, id, level) {
    const def = this.defOf(kind, id);
    const disc = kind === 'b' || kind === 'm' ? Math.pow(0.97, S.techs.ai)
      : kind === 's' ? this.shipDiscount() : 1;
    const infl = S.raid && this.fxActive('inflation') ? 2 : 1;   // hyperinflation
    const gear = (kind === 'b' || kind === 'm') && MINES[id] ? Math.pow(0.98, this.art('gear')) : 1;   // Rouage ancien
    const out = {};
    for (const k in def.cost) out[k === 'lunar' ? this.curMoon().mat : k] = Math.floor(def.cost[k] * Math.pow(def.factor, level - 1) * disc * infl * gear);
    // entrepôts : le prix ne dépasse jamais 90 % de la capacité actuelle de chaque matière
    // (sinon l'amélioration deviendrait impossible à payer)
    if (kind === 'b' && def.cat === 'storage')
      for (const k in out) out[k] = Math.min(out[k], Math.floor(0.9 * this.storageCap(S.buildings[STORES[k]])));
    return out;
  },

  mineOutput(id, L) { return MINES[id].base * this.growth(L); },
  // capacité des entrepôts : plus faible sur les premiers niveaux (10 % au niveau 0, pleine à partir du niveau 10)
  storageCap(L) { return Math.floor(5000 * Math.floor(2.5 * Math.exp(20 * L / 33)) * Math.min(1, 0.1 + 0.09 * L) * (1 + 0.1 * S.techs.logistics + 0.1 * this.art('relic'))); },

  rushMult() { return S.raid && this.fxActive('rush') ? 5 : 1; },   // ruée minière : clics ×5

  bonus(res) {
    const t = S.techs;
    const all = 0.03 * ((S.raid && S.raid.trophies) || 0) + 0.01 * this.achCount() + this.mapAllBonus() + 0.02 * t.physics + 0.03 * t.ions + 0.05 * t.hyperspace + 0.05 * S.click.terraform + 0.01 * this.art('compass');
    const m = S.raid && this.fxActive('ice') ? 0.25 : 1;   // ère glaciaire
    const map = this.mapResBonus(res);
    if (res === 'ferrite') return (1 + 0.04 * t.deepDrilling + 0.02 * this.art('meteor') + all + map) * m;
    if (res === 'deuterium') return (1 + 0.04 * t.deutRefining + 0.02 * this.art('frost') + all + map) * m;
    return (1 + 0.05 * t.dmCondensation + all + map) * m;
  },

  rates() {
    const out = { caps: {} };
    for (const r of RES_KEYS) out[r] = 0;
    for (const id in MINES) {
      const r = MINES[id].res;
      out[r] += this.mineOutput(id, S.buildings[id]) * this.bonus(r);
    }
    for (const r of RES_KEYS) out.caps[r] = this.storageCap(S.buildings[STORES[r]]);
    return out;
  },

  /* Usine Spatiale : −5 % sur les vaisseaux par niveau au-delà du 3e (qui débloque le Croiseur) */
  shipDiscount(L = S.buildings.shipyard) { return Math.pow(0.95, Math.max(0, L - 2)); },
  shipCost(id, n) {
    const c = this.costOf('s', id, 1), out = {};
    for (const k in c) out[k] = c[k] * n;
    return out;
  },
  /* nombre maximal de vaisseaux constructibles avec le stock actuel */
  maxShips(id) {
    if (this.reqsMissing(SHIPS[id].req).length) return 0;
    const c = this.costOf('s', id, 1);
    let n = Infinity;
    for (const k in c) if (c[k] > 0) n = Math.min(n, Math.floor(S.res[k] / c[k]));
    return isFinite(n) ? Math.max(0, n) : 0;
  },
  canBuildShips(id, n) { return !this.reqsMissing(SHIPS[id].req).length && this.canAfford(this.shipCost(id, n)); },
  buildShips(id, n) {
    if (!this.canBuildShips(id, n)) return { ok: false, msg: 'Ressources insuffisantes.' };
    const cost = this.shipCost(id, n);
    for (const r in cost) S.res[r] -= cost[r];
    S.fleet[id] += n;
    if (SHIPS[id].role === 'galaxy' && this.mapGain) this.mapGain(0, n);   // nouveaux destroyers visibles sur la carte
    const d = SHIPS[id];
    this.emit(`${n} × ${d.name} ${d.fem ? 'construite' : 'construit'}${n > 1 ? 's' : ''} — flotte : ${S.fleet[id]}`, 'success', true);
    return { ok: true };
  },
  /* ---------- Vagues pirates ---------- */
  RAID_PERIOD: 30,
  raidT: 0,
  /* le tout premier événement arrive 20 s après le début de la partie */
  firstEvent() { this.raidT = S.raid.step === 0 && !S.raid.last ? this.RAID_PERIOD - 20 : 0; },
  raidIn() { return Math.max(0, this.RAID_PERIOD - this.raidT); },
  mineSum() { return Object.keys(MINES).reduce((a, id) => a + S.buildings[id], 0); },
  /* Poids des événements possibles (conditions + Paix Publique, qui ne réduit que les rébellions) */
  peaceFactor(L = S.click.peace || 0) { return Math.pow(0.8, L); },
  eventWeights(exclude) {
    const w = {};
    for (const id in EVENTS) {
      const d = EVENTS[id];
      if (d.share || id === exclude || (d.cond && !d.cond(this))) continue;
      w[id] = d.weight;
    }
    // Paix Publique : le poids retiré aux rébellions et à l'hyperinflation passe au calme intersidéral
    const f = this.peaceFactor();
    for (const id of ['rebellion', 'hyperinflation']) {
      if (w[id] == null) continue;
      const cut = w[id] * (1 - f);
      w[id] -= cut;
      if (w.calm != null) w.calm += cut;
    }
    // événements à part fixe (pirates : 50 %)
    const rest = Object.values(w).reduce((a, b) => a + b, 0);
    for (const id in EVENTS) {
      const d = EVENTS[id];
      if (d.share && id !== exclude) w[id] = rest * d.share / (1 - d.share);
    }
    return w;
  },
  eventProbs(exclude) {
    const w = this.eventWeights(exclude), tot = Object.values(w).reduce((a, b) => a + b, 0) || 1, p = {};
    for (const id in w) p[id] = w[id] / tot;
    return p;
  },
  pickEvent(exclude) {
    const p = this.eventProbs(exclude), ids = Object.keys(p);
    let x = Math.random();
    for (const id of ids) { x -= p[id]; if (x <= 0) return { id, p: p[id] }; }
    return { id: ids[ids.length - 1], p: p[ids[ids.length - 1]] };
  },
  /* tirage pour un créneau donné : pas d'ère glaciaire dans les 7 premiers événements de la partie */
  pickFor(step, exclude) {
    for (let k = 0; k < 50; k++) { const ev = this.pickEvent(exclude); if (!(ev.id === 'iceAge' && step < 7)) return ev; }
    return { id: 'calm', p: 0 };
  },
  /* L'événement d'un créneau est tiré à l'avance, pour être annoncé dans la liste */
  plannedEvent(step) {
    if (!S.raid.plan[step]) {
      const ev = this.pickFor(step);
      if (ev.id === 'tax') ev.rate = this.taxRate();   // taux connu dès l'annonce
      if (ev.id === 'rebellion') ev.rate = this.rebelRate();
      S.raid.plan[step] = ev;
      this.freezePower(step);
    }
    return S.raid.plan[step];
  },
  /* Puissance d'une vague figée dès son annonce : elle n'évolue plus ensuite.
     Vague supposée = vague actuelle + nombre de vagues pirates annoncées avant elle. */
  freezePower(step) {
    const ev = S.raid.plan[step];
    if (!ev || (ev.id !== 'pirates' && ev.id !== 'boss') || ev.E != null) return;
    let w = S.raid.wave;
    for (let k = S.raid.step; k < step; k++) if (S.raid.plan[k] && S.raid.plan[k].id === 'pirates') w++;
    ev.w = w;
    ev.E = ev.id === 'boss' ? this.bossPower(w) : this.wavePower(w);
    // une vague pirate n'est jamais plus faible que la précédente annoncée
    if (ev.id === 'pirates') { ev.E = Math.max(ev.E, S.raid.maxE || 0); S.raid.maxE = ev.E; }
  },
  fxActive(name) { return (S.raid.fx[name] || 0) > Date.now(); },
  fxLeft(name) { return Math.max(0, ((S.raid.fx[name] || 0) - Date.now()) / 1000); },
  /* Événement du créneau courant : { id, via } (via = 'signal' si révélé par un signal inconnu) */
  nextEvent() {
    const step = S.raid.step, planned = this.plannedEvent(step);
    delete S.raid.plan[step];
    let id = planned.id, via = planned.via || null;
    // une condition a pu changer depuis le tirage (sauf événement « sticky » : la subvention reste due)
    if (EVENTS[id].cond && !EVENTS[id].sticky && !EVENTS[id].cond(this)) id = this.pickFor(step).id;
    if (id === 'signal') { via = 'signal'; id = this.pickFor(step, 'signal').id; }
    this.nextE = id === planned.id ? planned.E : null;   // puissance annoncée (figée)
    return { id, via, rate: id === planned.id ? planned.rate : undefined };
  },
  /* Signal inconnu : l'événement réel est révélé 0,5 s avant d'arriver */
  revealSignal() {
    const p = S.raid.plan[S.raid.step];
    if (!p || p.id !== 'signal' || this.raidIn() > 0.5) return false;
    const e = this.pickFor(S.raid.step, 'signal');
    p.id = e.id; p.via = 'signal';
    this.freezePower(S.raid.step);
    if (e.id === 'tax') p.rate = this.taxRate();
    if (e.id === 'rebellion') p.rate = this.rebelRate();
    this.rev++;
    return true;
  },
  /* rébellion : 5 à 50 % des vaisseaux, par pas de 5 % */
  rebelRate() { return 0.05 * (1 + Math.floor(Math.random() * 10)); },
  taxRate() { return (3 + Math.floor(Math.random() * 8)) / 100; },   // 3 à 10 %
  /* skipStep : le créneau a déjà été consommé (impôt appliqué en différé) */
  runEvent(id, via = null, opts = {}, skipStep = false) {
    const res = EVENTS[id].apply(this, opts) || {};
    S.raid.last = { type: 'event', id, via, ...res, t: Date.now() };
    if (!skipStep) S.raid.step++;
    this.emit(`${via ? 'Signal inconnu → ' : ''}${EVENTS[id].name}`, EVENTS[id].kind === 'pos' ? 'success' : 'warn', true);
    return S.raid.last;
  },
  waveTier(w) { return WAVE_TIERS.filter(t => w >= t.from).pop(); },
  // puissance de feu des pirates : croissance polynomiale (20, 104 à la vague 10, 318 à la 20, ~1 500 à la 50)
  /* Puissance d'une vague : la plus forte entre la progression de base et 50 à 100 % de votre flotte
     (proportion fixe pour chaque vague) : les pirates suivent votre niveau, sans être imbattables. */
  waveBase(w) { return Math.round(20 * Math.pow(1.15, w - 1) + 10 * Math.pow(w - 1, 1.5)); },
  waveRoll(w) { const x = Math.sin(w * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); },   // [0, 1) fixe par vague
  wavePower(w) { return Math.round(Math.max(this.waveBase(w), this.fleetPower() * (0.5 + 0.5 * this.waveRoll(w)))); },
  STEAL_MAX: 0.25,   // défaite contre les pirates sans aucune défense : 25 % des ressources pillées (chef pirate compris)
  MAP_STEAL: 0.10,   // raid perdu d'un clan sur le système natal : 10 % au maximum
  /* Combat : la flotte gagne si sa puissance ≥ celle des pirates.
     Les pirates infligent des dégâts qui détruisent des vaisseaux (bouclier + coque). */
  BOSS_MULT: 5,
  // chef pirate : 5 × la progression de base, ou 120 à 160 % de votre flotte
  bossPower(w = S.raid.wave) { return Math.round(Math.max(this.waveBase(w) * this.BOSS_MULT, this.fleetPower() * (1.2 + 0.4 * this.waveRoll(w + 0.5)))); },
  /* boss : attaque du Chef pirate (puissance ×5, butin ×4 + matière noire + trophée, pillage doublé) */
  raid(boss = false) {
    const w = S.raid.wave, E = this.nextE != null ? this.nextE : boss ? this.bossPower(w) : this.wavePower(w), P = this.fleetPower();
    this.nextE = null;
    const win = P > 0 && P >= E;
    const lost = {}, stolen = {}, salvage = {};
    Object.keys(SHIPS).forEach(id => lost[id] = 0);
    // pertes : la flotte perd autant de puissance de feu que celle de l'attaquant
    // (seulement 25 % en cas de victoire ; en cas de défaite, toute la flotte y passe)
    let pool = win ? E * 0.25 : E;
    for (let guard = 0; guard < 500000; guard++) {
      let cands = Object.keys(SHIPS).filter(id => S.fleet[id] > 0 && SHIPS[id].atk > 0 && SHIPS[id].atk <= pool);
      if (!cands.length) {
        // reste inférieur au plus petit vaisseau : destruction avec une probabilité proportionnelle
        const small = Object.keys(SHIPS).filter(id => S.fleet[id] > 0 && SHIPS[id].atk > 0).sort((a, b) => SHIPS[a].atk - SHIPS[b].atk)[0];
        if (small && pool > 0 && Math.random() < pool / SHIPS[small].atk) { S.fleet[small]--; lost[small]++; }
        break;
      }
      let k = Math.random() * cands.reduce((a, id) => a + S.fleet[id], 0), pick = cands[cands.length - 1];
      for (const id of cands) { k -= S.fleet[id]; if (k < 0) { pick = id; break; } }
      pool -= SHIPS[pick].atk; S.fleet[pick]--; lost[pick]++;
    }
    // Cuirassé : chaque vaisseau détruit a une chance d'être sauvé (5 % par niveau, 50 % max)
    const armor = this.armorShare(), saved = {};
    for (const id in lost) {
      saved[id] = 0;
      for (let k = 0; k < lost[id]; k++) if (Math.random() < armor) saved[id]++;
      lost[id] -= saved[id]; S.fleet[id] += saved[id];
    }
    if (win) {
      const caps = this.rates().caps;
      const k = boss ? 4 : 1;
      salvage.ferrite = Math.min(E * 5 * k, Math.max(0, caps.ferrite - S.res.ferrite));
      salvage.deuterium = Math.min(E * 2 * k, Math.max(0, caps.deuterium - S.res.deuterium));
      if (boss) salvage.darkMatter = Math.min(E, Math.max(0, caps.darkMatter - S.res.darkMatter));
      for (const r in salvage) S.res[r] += salvage[r];
      if (boss) S.raid.trophies++;
      S.stats.raidsWon++;
    } else {
      // au prorata de l'écart de puissance : avec la moitié de la puissance des pirates, on perd 5 %
      const ratio = this.STEAL_MAX * (1 - Math.min(1, P / E)) * Math.max(0, 1 - 0.1 * this.art('seal'));
      for (const r of RES_KEYS) { stolen[r] = S.res[r] * ratio; S.res[r] -= stolen[r]; }
    }
    const tier = this.waveTier(w);
    S.raid.last = { type: 'raid', boss, w, name: boss ? 'Chef pirate' : tier.name, win, E, P, lost, saved, stolen, salvage, t: Date.now() };
    S.raid.step++;
    if (win && !boss) S.raid.wave++;   // en cas de défaite, la même vague revient
    const nLost = Object.values(lost).reduce((a, b) => a + b, 0);
    this.emit(`${boss ? 'Chef pirate' : `Vague ${w} (${tier.name})`} : ${win ? 'victoire' : 'défaite'}${boss && win ? ' — trophée gagné' : ''}${nLost ? `, ${nLost} vaisseau${nLost > 1 ? 'x' : ''} perdu${nLost > 1 ? 's' : ''}` : ''}`, win ? 'success' : 'warn', true);
    return S.raid.last;
  },

  armorShare(L = S.click.armor || 0) { return Math.min(0.65, 0.05 * L + 0.03 * this.art('aegis')); },

  fleetPower() { return Math.round(Object.keys(SHIPS).reduce((a, id) => a + S.fleet[id] * SHIPS[id].atk, 0) * (1 + 0.05 * this.art('cannon'))); },
  fleetCount() { return Object.values(S.fleet).reduce((a, b) => a + b, 0); },

  usedFields() { return Object.values(S.buildings).reduce((a, b) => a + b, 0); },

  /* ---------- Clic ---------- */
  ferritePerClick(L = S.click.pickFerrite) { return 3 + 3 * L; },
  deutPerClick(L = S.click.pickDeut) { return 2 * L; },
  /* Robot Mineur : clics automatiques par seconde (0,25/s au niv. 1, ×1,5 par niveau) */
  robotRate(L = S.click.robot) { return L > 0 ? 0.25 * Math.pow(1.5, L - 1) : 0; },

  /* Clic : rapporte la production d'une seconde de chaque mine (au moins 1 ferrite),
     ×5 pendant une ruée minière. body : 'planet' ou index d'une lune */
  clickGains(body = 'planet') {
    const m = this.rushMult(), moon = typeof body === 'number' && S.moons[body];
    const rt = this.rates(), out = {};   // sur une lune comme sur la planète : production de la planète mère
    const heart = 1 + 0.01 * this.art('starHeart');
    // au moins 1 ferrite par clic (production d'une seconde de la mine de ferrite) ; jamais d'autre matériau
    for (const r of RES_KEYS) out[r] = r === 'ferrite' ? Math.max(1, rt[r]) * m * heart : 0;   // le clic ne rapporte que du ferrite
    return out;
  },

  /* ---------- Achat automatique ---------- */
  autoUnlocked(id) {
    const L = S.click.autoBuy;
    return AUTO_UNLOCKS.slice(0, L).some(u => id === 'lowest' ? u.lowest : (u.ids || []).includes(id));
  },
  lowestMine() {
    return Object.keys(MINES).filter(id => !BUILDINGS[id].hidden).reduce((a, b) => S.buildings[b] < S.buildings[a] ? b : a);
  },
  /* Achète tout ce qui est sélectionné et abordable. Retourne true si un achat a eu lieu */
  autoBuyTick() {
    if (!S.click.autoBuy) return false;
    let bought = false;
    if (S.auto.lowest && this.autoUnlocked('lowest')) {
      const m = this.lowestMine();
      if (this.check('b', m).ok) { this.upgrade('b', m, true); bought = true; }
    }
    for (const id in S.auto) {
      if (id === 'lowest' || !S.auto[id] || !this.autoUnlocked(id)) continue;
      // « trading » regroupe le capital et l'espérance de l'Accélérateur de particules
      if (SHIPS[id]) {
        // « MAX » : le plus grand nombre possible ; « AUTO » : le plus grand lot entre ×100, ×10 et ×1
        let n = S.auto[id] === 'max' ? this.maxShips(id) : ([100, 10, 1].find(k => this.canBuildShips(id, k)) || 0);
        // marge d'arrondi : pour les très grands nombres, « n − 1 » ne change rien, on réduit en proportion
        for (let g = 0; g < 20 && n > 0 && !this.canBuildShips(id, n); g++) n = n > 1e6 ? Math.floor(n * (1 - 1e-6)) : n - 1;
        if (n > 0 && this.canBuildShips(id, n)) { this.buildShips(id, n); bought = true; }
        continue;
      }
      const list = id === 'trading' ? [['c', 'jackpot'], ['c', 'casinoLuck']]
        : id === 'pick' ? [['c', 'pickFerrite'], ['c', 'pickDeut']]
        : [[BUILDINGS[id] ? 'b' : TECHS[id] ? 't' : CLICK_TECHS[id] ? 'c' : null, id]];
      for (const [kind, k] of list) {
        if (kind && this.check(kind, k, true).ok) { this.upgrade(kind, k, true); bought = true; }
      }
    }
    return bought;
  },

  /* ---------- Jackpot : un tirage toutes les 10 s ---------- */
  JACKPOT_PERIOD: 10,
  jackT: 0,
  jackpotPeriod() { return Math.max(2, this.JACKPOT_PERIOD - 0.2 * this.art('hourglass')); },   // 2 s minimum   // Sablier temporel
  jackpotIn() { return Math.max(0, this.jackpotPeriod() - this.jackT); },
  jackpotScale: { ferrite: 1, deuterium: 0.5, darkMatter: 2 },
  /* gain d'une opération : base fixe + (1 + 0,5 × niveau) secondes de production */
  // matière noire produite par une collision réussie : 100 × niveau × 1,15^(niveau−1)
  jackpotBase(L, r, rate) { return L > 0 ? (100 * L * Math.pow(1.15, L - 1) + rate * (1 + 0.5 * L)) * (1 + 0.05 * this.art('voidShard')) : 0; },
  jackpotAvg(L = S.click.jackpot, r = 'darkMatter') {
    return this.jackpotBase(L, r, this.rates()[r]) * 1.1;
  },
  /* Probabilité de gagner : 40 % + 5 % par niveau de chance (95 % max) */
  casinoChance(L = S.click.casinoLuck) { return Math.min(0.95, 0.05 + 0.05 * L); },   // 5 % au départ, +5 % par niveau
  jackpotRoll() {
    if (Math.random() >= this.casinoChance()) return { lost: true };
    const L = S.click.jackpot, rt = this.rates();
    const w = Math.random();
    const r = 'darkMatter';   // l'accélérateur ne produit que de la matière noire
    const big = false;   // plus de jackpot ×10
    const amt = this.jackpotBase(L, r, rt[r]) * (0.2 + Math.random() * 1.8) * (big ? 10 : 1);
    const add = Math.max(0, Math.min(Math.round(amt), rt.caps[r] - S.res[r]));
    S.res[r] += add;
    return { r, amount: add, big };
  },

  /* ---------- Transferts (échange 3:1 dans les deux sens) ---------- */
  xferBatch(L) { return L > 0 ? Math.round(20 * Math.pow(2.1, L - 1)) : 0; },   // unités de la ressource rare par échange
  /* Commerce : n unités du matériau le plus précieux par échange ; ratio r par cran
     (ferrite → deutérium → matière noire), r² entre ferrite et matière noire */
  EXCHANGE_RATIO: 3,   // 3 ferrite = 1 deutérium, 3 deutérium = 1 matière noire
  exchangeUnlocked(from, to) {
    const k = EXCHANGE_PAIRS.findIndex(([a, b]) => a === from && b === to);
    return k >= 0 && k < (S.click.exchanger || 0);
  },
  /* niveau « d'efficacité » : 1 jusqu'au niveau 6, puis +1 par niveau */
  exchangeEffLevel(L = S.click.exchanger || 0) { return Math.max(1, L - EXCHANGE_PAIRS.length + 1); },
  /* quantité donnée par clic depuis une matière (même valeur pour toutes : 9 × le volume du niveau en ferrite) */
  exchangeGive(from, L = S.click.exchanger || 0) { return Math.round(this.xferBatch(Math.max(1, L)) * 9 / RES_VALUE[from]); },
  exchangeQuote(from, to) {
    if (!this.exchangeUnlocked(from, to)) return { n: 0 };
    // ratio fixe 3:1 ; chaque niveau augmente la quantité maximale échangée
    const W = this.shareWallet(), caps = this.moonIdx() >= 0 ? this.INF_CAPS : this.rates().caps;
    // quantité donnée par clic : la même pour les deux destinations (voir exchangeGive), au ratio 3 par cran
    const vf = RES_VALUE[from], vt = RES_VALUE[to];
    const give0 = Math.min(this.exchangeGive(from), Math.floor(W[from]), Math.floor(Math.max(0, caps[to] - W[to]) * vt / vf));
    const get = Math.floor(give0 * vf / vt), give = Math.ceil(get * vt / vf);
    return { n: Math.max(0, get), give, get };
  },
  /* Conversion automatique (si activée) : plan d'échanges pour couvrir un coût, ou null.
     Ratio du Commerce (3:1 par cran), seulement dans les sens d'échange débloqués ;
     on puise d'abord dans les matériaux les moins précieux. */
  autoTradeOn() { return S.click.autoTrade > 0 && S.ui.autoTradeOn !== false; },
  convertPlan(cost, W) {
    if (!this.autoTradeOn()) return null;
    const left = {}, plan = [];
    for (const r of RES_KEYS) left[r] = W[r] - (cost[r] || 0);
    for (const to of RES_KEYS) {
      let need = -left[to];
      if (need <= 0) continue;
      for (const from of RES_KEYS) {
        if (from === to || need <= 0 || left[from] <= 0 || !this.exchangeUnlocked(from, to)) continue;
        const steps = RES_KEYS.indexOf(to) - RES_KEYS.indexOf(from), k = Math.pow(this.EXCHANGE_RATIO, Math.abs(steps));
        let give, get;
        if (steps > 0) { get = Math.min(Math.ceil(need), Math.floor(left[from] / k)); give = get * k; }
        else { give = Math.min(Math.ceil(need / k), Math.floor(left[from])); get = give * k; }
        if (give <= 0) continue;
        left[from] -= give; left[to] += get; need -= get;
        plan.push({ from, to, give, get });
      }
      if (need > 0) return null;
    }
    return plan.length ? plan : null;
  },
  exchange(from, to) {
    const q = this.exchangeQuote(from, to);
    if (q.n < 1) return { ok: false, msg: 'Échange impossible : matériaux ou stockage insuffisants.' };
    const W = this.shareWallet();
    W[from] -= q.give; W[to] += q.get;
    return { ok: true, ...q };
  },
  xferRatio(L) { return 1 + 2 * Math.pow(0.9, Math.max(0, L - 1)); },            // 3:1 au niv. 1, tend vers 1:1
  /* dir : 'fwd' (from → to) ou 'back' (to → from). Retourne n unités de la ressource rare */
  xferAmount(id, dir) {
    const d = CLICK_TECHS[id], L = S.click[id];
    if (!L) return 0;
    const caps = this.rates().caps;
    const batch = this.xferBatch(L), ratio = this.xferRatio(L);
    const n = dir === 'fwd'
      ? Math.min(batch, Math.floor(S.res[d.from] / ratio), Math.floor(caps[d.to] - S.res[d.to]))
      : Math.min(batch, Math.floor(S.res[d.to]), Math.floor((caps[d.from] - S.res[d.from]) / ratio));
    return Math.max(0, n);
  },
  transfer(id, dir) {
    const d = CLICK_TECHS[id];
    const n = this.xferAmount(id, dir);
    if (n < 1) return { ok: false, msg: 'Échange impossible : ressources ou stockage insuffisants.' };
    const ratio = this.xferRatio(S.click[id]);
    if (dir === 'fwd') { S.res[d.from] -= n * ratio; S.res[d.to] += n; }
    else { S.res[d.to] -= n; S.res[d.from] += n * ratio; }
    return { ok: true, n };
  },

  reqsMissing(req, reqClick) {
    const miss = [];
    for (const id in reqClick || {})
      if (S.click[id] < reqClick[id]) miss.push(`${CLICK_TECHS[id].name} ${reqClick[id]}`);
    if (!req) return miss;
    if (req.moonsJump && !this.moonsJumpOk(req.moonsJump)) miss.push(`3 lunes avec Tremplin niv. ${req.moonsJump}`);
    for (const id in req.buildings || {})
      if (S.buildings[id] < req.buildings[id]) miss.push(`${BUILDINGS[id].name} ${req.buildings[id]}`);
    for (const id in req.techs || {})
      if (S.techs[id] < req.techs[id]) miss.push(`${TECHS[id].name} ${req.techs[id]}`);
    return miss;
  },

  canAfford(cost, wallet = S.res) { return Object.keys(cost).every(r => (wallet[r] || 0) >= (cost[r] || 0)); },   // toutes les matières du coût (lunaires comprises)

  /* Secondes avant de pouvoir payer (Infinity si impossible) */
  etaFor(cost, kind = 'b') {
    const rt = this.walletRates(kind), wallet = this.wallet(kind);
    let worst = 0;
    for (const r of RES_KEYS) {
      const need = (cost[r] || 0) - wallet[r];
      if (need <= 0) continue;
      const name = RESOURCES[r].name.toLowerCase();
      if (cost[r] > rt.caps[r]) return { t: Infinity, reason: `stockage de ${name} insuffisant` };
      if (rt[r] <= 0) {
        const byClick = this.clickGains()[r] > 0;
        return { t: Infinity, reason: byClick ? (kind === 'm' ? 'Cliquez sur la lune' : 'Cliquez sur la planète') : `Pas encore de ${name}`, click: true };
      }
      worst = Math.max(worst, need / rt[r]);
    }
    return { t: worst };
  },

  /* Vérifie si une amélioration est possible. kind : 'b' | 't' */
  check(kind, id, auto = false) {
    const isB = kind === 'b';
    const def = this.defOf(kind, id);
    const lvl = this.levels(kind)[id] + 1;
    const cost = this.costOf(kind, id, lvl);
    if (def.max && lvl > def.max) return { ok: false, code: 'max', label: 'Niveau max', cost };
    if (this.reqsMissing(def.req, def.reqClick).length) return { ok: false, code: 'locked', label: 'Verrouillé', cost };
    if (isB && this.usedFields() >= MAX_FIELDS) return { ok: false, code: 'fields', label: 'Planète pleine', cost, msg: 'Plus aucune case disponible.' };
    const W = this.wallet(kind, id, auto);
    if (!this.canAfford(cost, W)) {
      // Conversion automatique : on complète avec les autres matériaux, au ratio du Commerce
      const convert = W === S.res ? this.convertPlan(cost, W) : null;
      if (!convert) return { ok: false, code: 'money', label: 'Ressources insuffisantes', cost, msg: 'Ressources insuffisantes.' };
      return { ok: true, cost, lvl, convert };
    }
    return { ok: true, cost, lvl };
  },

  /* Amélioration instantanée */
  upgrade(kind, id, auto = false) {
    const c = this.check(kind, id, auto);
    if (!c.ok) return c;
    const wallet = this.wallet(kind, id, auto);
    if (c.convert) for (const x of c.convert) { wallet[x.from] -= x.give; wallet[x.to] += x.get; }   // conversions automatiques
    for (const r in c.cost) wallet[r] -= c.cost[r];
    this.levels(kind)[id] = c.lvl;
    if (kind === 'c' && id === 'terraform') this.syncMoons();
    if (kind === 'c' && id === 'peace') S.raid.plan = {};
    // achat auto : ce que le nouveau niveau débloque est activé par défaut
    if (kind === 'c' && id === 'autoBuy') {
      const u = AUTO_UNLOCKS[c.lvl - 1];
      if (u) { if (u.lowest) S.auto.lowest = true; for (const k of u.ids || []) if (S.auto[k] == null || S.auto[k] === false) S.auto[k] = true; }
    }
    if (kind === 's') { this.emit(`${this.defOf(kind, id).name} ${this.defOf(kind, id).fem ? "construite" : "construit"} — flotte : ${c.lvl}`, 'success', true); return c; }
    const where = kind === 'm' || kind === 'x' ? `${this.curMoon().name} · ` : '';
    this.emit(`${auto ? '[Auto] ' : ''}${where}${this.defOf(kind, id).name} → niveau ${c.lvl}`, 'success', true);
    return c;
  },

  /* ---------- Simulation ---------- */
  advance(now) {
    const dt = (now - S.time) / 1000;
    if (dt <= 0) return;
    const rt = this.rates();
    for (const r of RES_KEYS) {
      if (S.res[r] < rt.caps[r]) S.res[r] = Math.min(rt.caps[r], S.res[r] + rt[r] * dt);
    }
    // production des lunes : chacune dans son propre compteur
    for (const moon of S.moons) {
      // (production lunaire uniquement par clic ; ascenseur masqué, sans effet)
    }
    S.time = now;
  },

  /* auto : clic du Robot Mineur (non compté dans les statistiques)
     body : corps cliqué ('planet' ou index de la lune) */
  click(auto = false, body = 'planet') {
    const onMoon = typeof body === 'number' && S.moons[body];
    const w = onMoon ? S.moons[body].res : S.res;
    const caps = onMoon ? new Proxy({}, { get: () => Infinity }) : this.rates().caps;
    let gains;
    if (onMoon) {
      const n = Math.min(this.moonLeft(onMoon), this.clickYield(onMoon.tech.extract) * this.rushMult());
      onMoon.mined = (onMoon.mined || 0) + n;
      gains = { [onMoon.mat]: n };
    } else gains = this.clickGains('planet');
    const got = {};
    for (const r in gains) {
      const add = Math.max(0, Math.min(gains[r], caps[r] - w[r]));
      w[r] += add;
      got[r] = add;
    }
    if (!auto) S.stats.clicks++;
    return { got };
  },

  /* ---------- Sauvegarde ---------- */
  save() {
    try {
      this.advance(Date.now());
      localStorage.setItem(SAVE_KEY, JSON.stringify(S));
      return true;
    } catch (e) { return false; }
  },

  hydrate(data) {
    const d = newState();
    const s = Object.assign(d, data);
    for (const k of ['res', 'buildings', 'techs', 'click', 'auto', 'planet', 'stats', 'ui', 'fleet', 'raid', 'exped', 'ach', 'map', 'artifacts']) s[k] = Object.assign(newState()[k], data[k]);
    // migration : l'ancienne « Pioche Renforcée » devient la Pioche à Ferrite
    if (s.click.pickaxe) { s.click.pickFerrite = Math.max(s.click.pickFerrite, s.click.pickaxe); }
    // les drones de forage deviennent le Robot Mineur
    if (s.click.drone) { s.click.robot = Math.max(s.click.robot, s.click.drone); }
    // retire les technologies supprimées
    for (const k in s.click) if (!CLICK_TECHS[k]) delete s.click[k];
    if (!s.click.exchanger) s.click.exchanger = Math.max(s.click.xferDeut || 0, s.click.xferDark || 0);
    // lunes : migration de l'ancienne lune unique, puis complétion des champs
    const list = Array.isArray(data.moons) ? data.moons : (data.moon ? [data.moon] : []);
    const used = [];
    s.moons = list.map(d => {
      const m = newMoon();
      const mat = moonMat(d.seed || m.seed);
      used.push(mat);
      const tech = Object.assign(m.tech, d.tech);
      if (!d.mat) {
        // ancienne lune : son stock de matériaux part vers la planète, ses mines deviennent le niveau d'extraction
        for (const r of RES_KEYS) s.res[r] = (s.res[r] || 0) + ((d.res && d.res[r]) || 0);
        tech.extract = Math.max(tech.extract || 0, ...Object.values(d.mines || {}).map(Number).filter(isFinite), 0);
      }
      const res = {}; RES_KEYS.forEach(r => res[r] = 0); res[mat] = Math.max(0, (d.mat && d.res && d.res[d.mat]) || 0);   // stock négatif (ancien bug) remis à 0
      if (d.mat && d.res) res.darkMatter = Math.max(0, d.res.darkMatter || 0);   // matière noire propre à la lune
      return { res, mines: Object.assign(m.mines, d.mines), tech, mat, seed: d.seed || m.seed, name: d.name || m.name, cargoOn: d.cargoOn !== false, mined: d.mined || 0 };
    });
    delete s.moon;
    delete s.ach.research;   // succès « Érudit » retiré
    if (data.fleet && 'cruiser' in data.fleet) {
      const f = data.fleet, power = (f.cruiser || 0) * 50 + (f.frigate || 0) * 150 + (f.destroyer || 0) * 400;
      s.fleet = { destroyer: Math.round(power / SHIPS.destroyer.atk), frigate: 0 };
      for (const id in s.exped) {   // expéditions en cours : les vaisseaux reviennent comme explorers
        const e = s.exped[id], n = Object.values(e.ships).reduce((a, b) => a + b, 0);
        e.ships = { destroyer: 0, frigate: n };
      }
    }
    for (const k in s.fleet) if (!SHIPS[k]) delete s.fleet[k];
    for (const k in s.ach) if (typeof s.ach[k] !== 'number' || s.ach[k] > 10) { s.ach = {}; break; }   // ancien format (horodatages)
    s.raid = Object.assign({ wave: 1, step: 0, last: null, trophies: 0 }, data.raid || {});
    s.raid.plan = s.raid.plan || {}; s.raid.fx = s.raid.fx || {};
    if (s.raid.last && s.raid.last.type === 'tax') s.raid.last = null;   // ancien format
    for (const k in s.buildings) if (!BUILDINGS[k]) delete s.buildings[k];   // bâtiments supprimés
    if (s.planet.name === 'Colonie Alpha') s.planet.name = planetName();   // ancien nom par défaut
    if (s.click.terraform > this.MAX_MOONS) s.click.terraform = this.MAX_MOONS;
    S = s; this.syncMoons();
    if (s.view === 'moon') s.view = 0;
    if (typeof s.view !== 'number' || !s.moons[s.view]) s.view = 'planet';
    return s;
  },

  /* Charge la sauvegarde et retourne un résumé hors-ligne éventuel */
  load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { data = null; }
    S = data ? this.hydrate(data) : newState();
    this.firstEvent();
    const now = Date.now();
    if (now - S.time > MAX_OFFLINE_MS) S.time = now - MAX_OFFLINE_MS;
    const elapsed = now - S.time;
    const before = { ...S.res };
    this.advance(now);
    this.rev++;
    if (data && elapsed > 60 * 1000) {
      const gains = {};
      RES_KEYS.forEach(r => gains[r] = S.res[r] - before[r]);
      return { elapsed: elapsed / 1000, gains };
    }
    return null;
  },

  exportSave() {
    this.save();
    return btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  },
  importSave(str) {
    const data = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
    if (!data || !data.buildings || !data.res || !('deuterium' in data.res)) throw new Error('Sauvegarde invalide');
    S = this.hydrate(data);
    this.advance(Date.now());
    this.rev++;
    this.save();
  },
  reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    S = newState();
    S.seenIntro = true;
    this.firstEvent();
    this.rev++;
    this.save();
  },
};
