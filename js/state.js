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
    stats: { clicks: 0, raidsWon: 0, expeds: 0 },
    log: [],
    seenIntro: false,
    ui: { collapsed: {} },
    auto: {},   // bâtiments sélectionnés pour l'achat automatique (+ « lowest »)
    view: 'planet',   // corps affiché : 'planet' ou index de la lune (0, 1, 2)
    moons: [],
    fleet: { destroyer: 0, frigate: 0 },   // vaisseaux construits (défense / exploration)
    raid: { wave: 1, step: 0, last: null, plan: {}, fx: {}, trophies: 0 },   // vagues pirates, événements, trophées
    exped: {},                                                               // expéditions en cours
    ach: {},                                                                 // succès débloqués
    map: { seed: (Math.random() * 2 ** 31) | 0, explored: { 0: true }, probe: null },   // carte galactique
  };
}

/* Une lune : des mines, une technologie (navette) et son propre compteur de matière */
function newMoon() {
  const res = {}, mines = {}, tech = {};
  RES_KEYS.forEach(r => res[r] = 0);
  Object.keys(MINES).forEach(k => mines[k] = 0);
  Object.keys(MOON_TECHS).forEach(k => tech[k] = 0);
  return { res, mines, tech, seed: (Math.random() * 2 ** 31) | 0, name: moonName(), cargoOn: true };
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
  moonIdx() { return typeof S.view === 'number' && S.moons[S.view] ? S.view : -1; },
  curMoon() { return S.moons[Math.max(0, this.moonIdx())]; },
  INF_CAPS: { ferrite: Infinity, deuterium: Infinity, darkMatter: Infinity },
  /* Compteur utilisé pour payer : chaque lune a le sien */
  wallet(kind) { return kind === 'm' || kind === 'x' ? this.curMoon().res : S.res; },
  /* Production des mines d'une lune (sans stockage : capacité illimitée) */
  moonRates(moon = this.curMoon()) {
    const out = { caps: this.INF_CAPS };
    for (const r of RES_KEYS) out[r] = 0;
    if (!moon) return out;
    for (const id in MINES) {
      const r = MINES[id].res;
      out[r] += this.mineOutput(id, moon.mines[id]) * this.bonus(r);
    }
    return out;
  },
  /* Production qui alimente un compteur, et sa capacité */
  walletRates(kind) { return kind === 'm' || kind === 'x' ? this.moonRates() : this.rates(); },

  /* Ascenseur Gravitationnel : toutes les 30 s, envoie le stock de la lune vers la planète.
     Le niveau augmente la quantité transportée (par matériau et par envoi). */
  CARGO_PERIOD: 30,
  cargoCap(L) { return L > 0 ? 1000 * Math.pow(2, L - 1) : 0; },
  cargoT: [],
  cargoIn(i) { return Math.max(0, this.CARGO_PERIOD - (this.cargoT[i] || 0)); },
  MANUAL_CAP: 500,
  cargoShip(i, manual = false) {
    const moon = S.moons[i], L = moon.tech.cargo;
    const cap = manual ? Math.max(this.MANUAL_CAP, this.cargoCap(L)) : this.cargoCap(L);
    const caps = this.rates().caps, got = {};
    for (const r of RES_KEYS) {
      const n = Math.max(0, Math.min(moon.res[r], cap, caps[r] - S.res[r]));
      moon.res[r] -= n; S.res[r] += n; got[r] = n;
    }
    return got;
  },

  costOf(kind, id, level) {
    const def = this.defOf(kind, id);
    const disc = kind === 'b' || kind === 'm' ? Math.pow(0.97, S.techs.ai)
      : kind === 's' ? this.shipDiscount() : 1;
    const infl = S.raid && this.fxActive('inflation') ? 2 : 1;   // hyperinflation
    const out = {};
    for (const k in def.cost) out[k] = Math.floor(def.cost[k] * Math.pow(def.factor, level - 1) * disc * infl);
    return out;
  },

  mineOutput(id, L) { return MINES[id].base * this.growth(L); },
  storageCap(L) { return Math.floor(5000 * Math.floor(2.5 * Math.exp(20 * L / 33)) * (1 + 0.1 * S.techs.logistics)); },

  rushMult() { return S.raid && this.fxActive('rush') ? 5 : 1; },   // ruée minière : clics ×5

  bonus(res) {
    const t = S.techs;
    const all = 0.03 * ((S.raid && S.raid.trophies) || 0) + 0.01 * this.achCount() + this.mapAllBonus() + 0.02 * t.physics + 0.03 * t.ions + 0.05 * t.hyperspace + 0.05 * S.click.terraform;
    const m = S.raid && this.fxActive('ice') ? 0.1 : 1;   // ère glaciaire
    const map = this.mapResBonus(res);
    if (res === 'ferrite') return (1 + 0.04 * t.deepDrilling + all + map) * m;
    if (res === 'deuterium') return (1 + 0.04 * t.deutRefining + all + map) * m;
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
  canBuildShips(id, n) { return !this.reqsMissing(SHIPS[id].req).length && this.canAfford(this.shipCost(id, n)); },
  buildShips(id, n) {
    if (!this.canBuildShips(id, n)) return { ok: false, msg: 'Ressources insuffisantes.' };
    const cost = this.shipCost(id, n);
    for (const r in cost) S.res[r] -= cost[r];
    S.fleet[id] += n;
    const d = SHIPS[id];
    this.emit(`${n} × ${d.name} ${d.fem ? 'construite' : 'construit'}${n > 1 ? 's' : ''} — flotte : ${S.fleet[id]}`, 'success', true);
    return { ok: true };
  },
  /* ---------- Vagues pirates ---------- */
  RAID_PERIOD: 30,
  raidT: 0,
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
    // événements à part fixe (pirates : 40 %)
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
  /* L'événement d'un créneau est tiré à l'avance, pour être annoncé dans la liste */
  plannedEvent(step) {
    if (!S.raid.plan[step]) {
      const ev = this.pickEvent();
      if (ev.id === 'tax') ev.rate = this.taxRate();   // taux connu dès l'annonce
      S.raid.plan[step] = ev;
    }
    return S.raid.plan[step];
  },
  fxActive(name) { return (S.raid.fx[name] || 0) > Date.now(); },
  fxLeft(name) { return Math.max(0, ((S.raid.fx[name] || 0) - Date.now()) / 1000); },
  /* Événement du créneau courant : { id, via } (via = 'signal' si révélé par un signal inconnu) */
  nextEvent() {
    const step = S.raid.step, planned = this.plannedEvent(step);
    delete S.raid.plan[step];
    let id = planned.id, via = null;
    // une condition a pu changer depuis le tirage (sauf événement « sticky » : la subvention reste due)
    if (EVENTS[id].cond && !EVENTS[id].sticky && !EVENTS[id].cond(this)) id = this.pickEvent().id;
    if (id === 'signal') { via = 'signal'; id = this.pickEvent('signal').id; }
    return { id, via, rate: id === planned.id ? planned.rate : undefined };
  },
  taxRate() { return (3 + Math.floor(Math.random() * 8)) / 100; },   // 3 à 10 %
  runEvent(id, via = null, opts = {}) {
    const res = EVENTS[id].apply(this, opts) || {};
    S.raid.last = { type: 'event', id, via, ...res, t: Date.now() };
    S.raid.step++;
    this.emit(`${via ? 'Signal inconnu → ' : ''}${EVENTS[id].name}`, EVENTS[id].kind === 'pos' ? 'success' : 'warn', true);
    return S.raid.last;
  },
  waveTier(w) { return WAVE_TIERS.filter(t => w >= t.from).pop(); },
  // puissance de feu des pirates : croissance polynomiale (20, 104 à la vague 10, 318 à la 20, ~1 500 à la 50)
  wavePower(w) { return Math.round(20 + 2 * Math.pow(w - 1, 1.7)); },
  STEAL_MAX: 0.10,   // défaite sans aucune défense : 10 % des ressources pillées (20 % pour un chef pirate)
  /* Combat : la flotte gagne si sa puissance ≥ celle des pirates.
     Les pirates infligent des dégâts qui détruisent des vaisseaux (bouclier + coque). */
  BOSS_MULT: 5,
  bossPower(w = S.raid.wave) { return this.wavePower(w) * this.BOSS_MULT; },
  /* boss : attaque du Chef pirate (puissance ×5, butin ×4 + matière noire + trophée, pillage doublé) */
  raid(boss = false) {
    const w = S.raid.wave, E = boss ? this.bossPower(w) : this.wavePower(w), P = this.fleetPower();
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
      const ratio = this.STEAL_MAX * (boss ? 2 : 1) * (1 - Math.min(1, P / E));
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

  armorShare(L = S.click.armor || 0) { return Math.min(0.5, 0.05 * L); },

  fleetPower() { return Object.keys(SHIPS).reduce((a, id) => a + S.fleet[id] * SHIPS[id].atk, 0); },
  fleetCount() { return Object.values(S.fleet).reduce((a, b) => a + b, 0); },

  usedFields() { return Object.values(S.buildings).reduce((a, b) => a + b, 0); },

  /* ---------- Clic ---------- */
  ferritePerClick(L = S.click.pickFerrite) { return 3 + 3 * L; },
  deutPerClick(L = S.click.pickDeut) { return 2 * L; },
  /* Robot Mineur : clics automatiques par seconde (0,25/s au niv. 1, ×1,5 par niveau) */
  robotRate(L = S.click.robot) { return L > 0 ? 0.25 * Math.pow(1.5, L - 1) : 0; },

  /* Clic : rapporte la production d'une seconde de chaque mine (au moins 1 de chaque matériau),
     ×5 pendant une ruée minière. body : 'planet' ou index d'une lune */
  clickGains(body = 'planet') {
    const m = this.rushMult(), moon = typeof body === 'number' && S.moons[body];
    const rt = moon ? this.moonRates(moon) : this.rates(), out = {};
    for (const r of RES_KEYS) out[r] = Math.max(1, rt[r]) * m;
    return out;
  },

  /* ---------- Achat automatique ---------- */
  autoUnlocked(id) {
    const L = S.click.autoBuy;
    return AUTO_UNLOCKS.slice(0, L).some(u => id === 'lowest' ? u.lowest : (u.ids || []).includes(id));
  },
  lowestMine() {
    return Object.keys(MINES).reduce((a, b) => S.buildings[b] < S.buildings[a] ? b : a);
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
      // « trading » regroupe le capital et l'espérance du Trading Interstellaire
      if (SHIPS[id]) {
        const n = [100, 10, 1].find(k => this.canBuildShips(id, k));
        if (n) { this.buildShips(id, n); bought = true; }
        continue;
      }
      const list = id === 'trading' ? [['c', 'jackpot'], ['c', 'casinoLuck']]
        : id === 'pick' ? [['c', 'pickFerrite'], ['c', 'pickDeut']]
        : [[BUILDINGS[id] ? 'b' : TECHS[id] ? 't' : CLICK_TECHS[id] ? 'c' : null, id]];
      for (const [kind, k] of list) {
        if (kind && this.check(kind, k).ok) { this.upgrade(kind, k, true); bought = true; }
      }
    }
    return bought;
  },

  /* ---------- Jackpot : un tirage toutes les 10 s ---------- */
  JACKPOT_PERIOD: 10,
  jackT: 0,
  jackpotIn() { return Math.max(0, this.JACKPOT_PERIOD - this.jackT); },
  jackpotScale: { ferrite: 1, deuterium: 0.5, darkMatter: 0.2 },
  /* gain d'une opération : base fixe + (1 + 0,5 × niveau) secondes de production */
  jackpotBase(L, r, rate) { return L > 0 ? 25 * this.jackpotScale[r] * L + rate * (1 + 0.5 * L) : 0; },
  jackpotAvg(L = S.click.jackpot, r = 'ferrite') {
    return this.jackpotBase(L, r, this.rates()[r]) * 1.1;
  },
  /* Probabilité de gagner : 40 % + 5 % par niveau de chance (95 % max) */
  casinoChance(L = S.click.casinoLuck) { return Math.min(0.95, 0.4 + 0.05 * L); },
  jackpotRoll() {
    if (Math.random() >= this.casinoChance()) return { lost: true };
    const L = S.click.jackpot, rt = this.rates();
    const w = Math.random();
    const r = w < 0.6 ? 'ferrite' : w < 0.9 ? 'deuterium' : 'darkMatter';
    const big = Math.random() < 0.05;
    const amt = this.jackpotBase(L, r, rt[r]) * (0.2 + Math.random() * 1.8) * (big ? 10 : 1);
    const add = Math.max(0, Math.min(Math.round(amt), rt.caps[r] - S.res[r]));
    S.res[r] += add;
    return { r, amount: add, big };
  },

  /* ---------- Transferts (échange 3:1 dans les deux sens) ---------- */
  xferBatch(L) { return L > 0 ? Math.round(10 * Math.pow(1.8, L - 1)) : 0; },   // unités de la ressource rare par échange
  /* Commerce : n unités du matériau le plus précieux par échange ; ratio r par cran
     (ferrite → deutérium → matière noire), r² entre ferrite et matière noire */
  EXCHANGE_RATIO: 3,   // 3 ferrite = 1 deutérium, 3 deutérium = 1 matière noire
  exchangeUnlocked(from, to) {
    const k = EXCHANGE_PAIRS.findIndex(([a, b]) => a === from && b === to);
    return k >= 0 && k < (S.click.exchanger || 0);
  },
  /* niveau « d'efficacité » : 1 jusqu'au niveau 6, puis +1 par niveau */
  exchangeEffLevel(L = S.click.exchanger || 0) { return Math.max(1, L - EXCHANGE_PAIRS.length + 1); },
  exchangeQuote(from, to) {
    if (!this.exchangeUnlocked(from, to)) return { n: 0 };
    const E = this.exchangeEffLevel();
    // ratio fixe 3:1 (les niveaux n'augmentent que la quantité échangée)
    const caps = this.rates().caps, r = this.EXCHANGE_RATIO, batch = this.xferBatch(E);
    const steps = RES_KEYS.indexOf(to) - RES_KEYS.indexOf(from), k = Math.pow(r, Math.abs(steps));
    // vers plus précieux : on donne k « from » par unité reçue ; vers moins précieux : 1 « from » donne k « to »
    const n = steps > 0
      ? Math.min(batch, Math.floor(S.res[from] / k), Math.floor(caps[to] - S.res[to]))
      : Math.min(batch, Math.floor(S.res[from]), Math.floor((caps[to] - S.res[to]) / k));
    const give = steps > 0 ? n * k : n, get = steps > 0 ? n : n * k;
    return { n: Math.max(0, n), give, get };
  },
  exchange(from, to) {
    const q = this.exchangeQuote(from, to);
    if (q.n < 1) return { ok: false, msg: 'Échange impossible : matériaux ou stockage insuffisants.' };
    S.res[from] -= q.give; S.res[to] += q.get;
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
    for (const id in req.buildings || {})
      if (S.buildings[id] < req.buildings[id]) miss.push(`${BUILDINGS[id].name} ${req.buildings[id]}`);
    for (const id in req.techs || {})
      if (S.techs[id] < req.techs[id]) miss.push(`${TECHS[id].name} ${req.techs[id]}`);
    return miss;
  },

  canAfford(cost, wallet = S.res) { return RES_KEYS.every(r => wallet[r] >= (cost[r] || 0)); },

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
  check(kind, id) {
    const isB = kind === 'b';
    const def = this.defOf(kind, id);
    const lvl = this.levels(kind)[id] + 1;
    const cost = this.costOf(kind, id, lvl);
    if (def.max && lvl > def.max) return { ok: false, code: 'max', label: 'Niveau max', cost };
    if (this.reqsMissing(def.req, def.reqClick).length) return { ok: false, code: 'locked', label: 'Verrouillé', cost };
    if (isB && this.usedFields() >= MAX_FIELDS) return { ok: false, code: 'fields', label: 'Planète pleine', cost, msg: 'Plus aucune case disponible.' };
    if (!this.canAfford(cost, this.wallet(kind))) return { ok: false, code: 'money', label: 'Ressources insuffisantes', cost, msg: 'Ressources insuffisantes.' };
    return { ok: true, cost, lvl };
  },

  /* Amélioration instantanée */
  upgrade(kind, id, auto = false) {
    const c = this.check(kind, id);
    if (!c.ok) return c;
    const wallet = this.wallet(kind);
    for (const r in c.cost) wallet[r] -= c.cost[r];
    this.levels(kind)[id] = c.lvl;
    if (kind === 'c' && id === 'terraform') this.syncMoons();
    if (kind === 'c' && id === 'peace') S.raid.plan = {};
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
      const m = this.moonRates(moon);
      for (const r of RES_KEYS) moon.res[r] += m[r] * dt;
    }
    S.time = now;
  },

  /* auto : clic du Robot Mineur (non compté dans les statistiques)
     body : corps cliqué ('planet' ou index de la lune) */
  click(auto = false, body = 'planet') {
    const onMoon = typeof body === 'number' && S.moons[body];
    const w = onMoon ? S.moons[body].res : S.res;
    const caps = onMoon ? this.INF_CAPS : this.rates().caps;
    const gains = this.clickGains(onMoon ? body : 'planet');
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
    for (const k of ['res', 'buildings', 'techs', 'click', 'auto', 'planet', 'stats', 'ui', 'fleet', 'raid', 'exped', 'ach', 'map']) s[k] = Object.assign(newState()[k], data[k]);
    // migration : l'ancienne « Pioche Renforcée » devient la Pioche à Ferrite
    if (s.click.pickaxe) { s.click.pickFerrite = Math.max(s.click.pickFerrite, s.click.pickaxe); }
    // les drones de forage deviennent le Robot Mineur
    if (s.click.drone) { s.click.robot = Math.max(s.click.robot, s.click.drone); }
    // retire les technologies supprimées
    for (const k in s.click) if (!CLICK_TECHS[k]) delete s.click[k];
    if (!s.click.exchanger) s.click.exchanger = Math.max(s.click.xferDeut || 0, s.click.xferDark || 0);
    // lunes : migration de l'ancienne lune unique, puis complétion des champs
    const list = Array.isArray(data.moons) ? data.moons : (data.moon ? [data.moon] : []);
    s.moons = list.map(d => {
      const m = newMoon();
      return { res: Object.assign(m.res, d.res), mines: Object.assign(m.mines, d.mines), tech: Object.assign(m.tech, d.tech), seed: d.seed || m.seed, name: d.name || m.name, cargoOn: d.cargoOn !== false };
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
    this.rev++;
    this.save();
  },
};
