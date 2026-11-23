/* ============================================================
   Expéditions, succès et carte galactique
   (logique ajoutée à G, affichage ajouté à UI)
   ============================================================ */

/* ---------- Expédition : tous les explorers partent 30 s et reviennent avec
   entre 100 et 10 000 fois leur nombre en matériaux (60 % ferrite, 30 % deutérium, 10 % matière noire) ---------- */
const EXPEDITIONS = {
  voyage: {
    name: 'Expédition', icon: 'warp', color: '#7fd3ff', dur: 30, risk: 0,
    desc: "Tous les explorers partent 30 s et rapportent des matériaux.",
    reward: n => {
      const total = n * (100 + Math.random() * 9900);
      return { ferrite: total * 0.6, deuterium: total * 0.3, darkMatter: total * 0.1 };
    },
  },
};

/* ---------- Succès à paliers : cuivre, argent, or, cristal, plasma ----------
   Chaque palier atteint donne +1 % de toute production. */
/* palier n° k (1..) d'un succès → style (cuivre…plasma) ; a.tiers permet de sauter des styles */
const achTier = (a, k) => ACH_TIERS[a.tiers ? a.tiers[k - 1] : k - 1];
const ACH_TIERS = [
  { name: 'Cuivre',  color: '#c87533' },
  { name: 'Argent',  color: '#cfd6e0' },
  { name: 'Or',      color: '#ffd166' },
  { name: 'Cristal', color: '#7fe7ff' },
  { name: 'Plasma',  color: '#c58bff' },
];
const ACHIEVEMENTS = [
  { id: 'clicks',   name: 'Mineur assidu',     icon: 'pick',        unit: 'clics',                steps: [10, 100, 1e3, 5e3, 1e4],    metric: () => S.stats.clicks },
  { id: 'ferrite',  name: 'Magnat des matières', icon: 'drill',     unit: 'matières en stock (toutes)', steps: [1e4, 1e5, 1e6, 1e7, 1e8], metric: () => RES_KEYS.reduce((a, r) => a + S.res[r], 0) },
  { id: 'mines',    name: 'Industriel',        icon: 'factory',     unit: 'niveaux de mines',     steps: [10, 30, 50, 75, 100],      metric: () => G.mineSum() },
  { id: 'fleet',    name: 'Amiral',            icon: 'shipCruiser', unit: 'explorers et destroyers', steps: [1, 10, 50, 200, 1000],     metric: () => G.fleetTotal('frigate') + (S.fleet.warship || 0) + G.mapDeployed() },   // explorers et destroyers (sans les boucliers EM)
  { id: 'raids',    name: 'Défenseur',         icon: 'laser',       unit: 'attaques repoussées',  steps: [1, 5, 15, 30, 50],         metric: () => S.stats.raidsWon },
  { id: 'moons',    name: 'Terraformeur',      icon: 'moon',        unit: 'lunes',                steps: [1, 2, 3], tiers: [0, 2, 4],                  metric: () => S.moons.length },
  { id: 'expeds',   name: 'Explorateur',       icon: 'warp',        unit: 'expéditions',          steps: [1, 5, 15, 40, 100],        metric: () => S.stats.expeds },
  { id: 'map',      name: 'Cartographe',       icon: 'gate',        unit: 'systèmes conquis',    steps: [2, 4, 6, 9, 12],           metric: () => G.mapExploredCount() },
];

/* ---------- Carte galactique ---------- */
/* Clans qui habitent la galaxie */
const CLANS = {
  zorgath: { name: 'Zorgaths', color: '#ff5d5d' },
  velien:  { name: 'Véliens',  color: '#5fd38d' },
  kryx:    { name: 'Kryx',     color: '#c58bff' },
  ondaris: { name: 'Ondaris',  color: '#ffd166' },
};
const MAP_SIZE = 12;
const STAR_NAMES = ['Achernar', 'Bellatrix', 'Capella', 'Diphda', 'Electra', 'Fomalhaut', 'Hadar', 'Izar', 'Kochab', 'Lesath',
  'Mirach', 'Naos', 'Phact', 'Rasalas', 'Sadr', 'Tureis', 'Wezen', 'Zosma', 'Alnair', 'Menkar'];
const SYS_TYPES = {
  home:       { name: 'Système natal',          color: '#4fc3ff', bonus: 'Votre colonie' },
  ferrite:    { name: 'Gisement de ferrite',    color: '#d9a066', bonus: '+500 % de ferrite',          w: 20 },
  deuterium:  { name: 'Nébuleuse de deutérium', color: '#4fd1c5', bonus: '+500 % de deutérium',        w: 20 },
  darkMatter: { name: 'Faille de matière noire', color: '#a77bff', bonus: '+500 % de matière noire',   w: 15 },
  cache:      { name: 'Épave abandonnée',       color: '#ffd166', bonus: 'Butin unique à la découverte', w: 20 },
  relic:      { name: 'Ruines anciennes',       color: '#ff8c5a', bonus: '+300 % de toute production', w: 10 },
  empty:      { name: 'Système désert',         color: '#7b8ca6', bonus: 'Rien à signaler',          w: 15 },
};

function genMap(seed) {
  const rnd = mulberry32(seed ^ 0x5bd1e995);
  const nodes = [{ x: 50, y: 30 }];
  for (let tries = 0; nodes.length < MAP_SIZE && tries < 8000; tries++) {
    const p = { x: 7 + rnd() * 86, y: 6 + rnd() * 48 };
    if (nodes.every(n => Math.hypot(n.x - p.x, n.y - p.y) > 14)) nodes.push(p);
  }
  const d = (a, b) => Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
  // chaque système est relié au plus proche des systèmes déjà reliés (du centre vers l'extérieur)
  const order = nodes.map((_, i) => i).sort((a, b) => d(a, 0) - d(b, 0));
  const adj = nodes.map(() => new Set()), placed = [0];
  for (const i of order.slice(1)) {
    const j = placed.reduce((best, k) => d(i, k) < d(i, best) ? k : best, placed[0]);
    adj[i].add(j); adj[j].add(i); placed.push(i);
  }
  // quelques liaisons courtes supplémentaires
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++)
      if (d(i, j) < 21 && rnd() < 0.45) { adj[i].add(j); adj[j].add(i); }
  // types et noms
  const pool = Object.entries(SYS_TYPES).filter(([, t]) => t.w);
  const tot = pool.reduce((a, [, t]) => a + t.w, 0);
  const names = STAR_NAMES.slice().sort(() => rnd() - 0.5);
  nodes.forEach((n, i) => {
    n.name = names[i];
    // système natal : porte toujours le nom de la planète mère (suit les renommages)
    if (i === 0) { n.type = 'home'; Object.defineProperty(n, 'name', { get: () => S.planet.name }); return; }
    let x = rnd() * tot;
    n.type = pool.find(([, t]) => (x -= t.w) <= 0)[0];
  });
  // distance (en sauts) depuis le système natal
  const hops = nodes.map(() => Infinity); hops[0] = 0;
  const queue = [0];
  while (queue.length) { const i = queue.shift(); for (const j of adj[i]) if (hops[j] > hops[i] + 1) { hops[j] = hops[i] + 1; queue.push(j); } }
  return { seed, nodes, adj: adj.map(s => [...s]), hops };
}

/* ================= Logique ================= */
Object.assign(G, {
  /* --- expéditions --- */
  /* Hypervitesse : −15 % de durée d'expédition par niveau */
  expedDuration(id = 'voyage', L = S.click.hyperspeed || 0) { return EXPEDITIONS[id].dur * Math.pow(0.85, L); },

  /* puissance d'exploration d'un groupe de vaisseaux */
  shipsPower(ships) { return Object.keys(SHIPS).reduce((a, id) => a + (ships[id] || 0) * SHIPS[id].explore, 0); },
  explorePower() { return this.shipsPower(S.fleet); },
  explorerCount() { return Object.keys(SHIPS).filter(id => SHIPS[id].role === 'explore').reduce((a, id) => a + S.fleet[id], 0); },
  /* vaisseaux d'un type : à quai + en expédition */
  fleetTotal(id) { return S.fleet[id] + Object.values(S.exped).reduce((a, e) => a + (e.ships[id] || 0), 0); },
  expedShips() { return Object.values(S.exped).reduce((a, e) => a + Object.values(e.ships).reduce((x, y) => x + y, 0), 0); },
  startExped(id, frac) {
    if (S.exped[id]) return { ok: false, msg: 'Cette expédition est déjà en cours.' };
    const ships = {};
    let n = 0;
    for (const t in SHIPS) {
      if (SHIPS[t].role !== 'explore') { ships[t] = 0; continue; }
      ships[t] = frac >= 1 ? S.fleet[t] : Math.floor(S.fleet[t] * frac); n += ships[t];
    }
    if (!n) return { ok: false, msg: 'Aucun explorer disponible : construisez des explorers (vaisseaux d\'exploration).' };
    for (const t in SHIPS) S.fleet[t] -= ships[t];
    const now = Date.now();
    S.exped[id] = { start: now, end: now + this.expedDuration(id) * 1000, ships, P: this.shipsPower(ships) };
    this.emit(`Expédition « ${EXPEDITIONS[id].name} » lancée (${n} vaisseau${n > 1 ? 'x' : ''})`, 'info', true);
    return { ok: true };
  },
  resolveExped(id) {
    const d = EXPEDITIONS[id], e = S.exped[id], caps = this.rates().caps;
    const lossRatio = d.risk * (0.4 + Math.random() * 1.2), lost = {};
    for (const t in SHIPS) {
      lost[t] = Math.min(e.ships[t], Math.round(e.ships[t] * lossRatio));
      S.fleet[t] += e.ships[t] - lost[t];
    }
    const sent = Object.values(e.ships).reduce((a, b) => a + b, 0), got = {};
    const found = this.rollArtifact(sent);
    const trophy = !!d.trophy && Math.random() < d.trophy;
    if (trophy) S.raid.trophies++;
    S.stats.expeds++;
    delete S.exped[id];
    const nLost = Object.values(lost).reduce((a, b) => a + b, 0);
    const gains = Object.entries(this.artifactCounts(found)).map(([a, k]) => `${ARTIFACTS[a].icon} ${ARTIFACTS[a].name}${k > 1 ? ' ×' + k : ''}`).join(', ');
    this.emit(`Retour de l'expédition : ${gains || 'aucun artefact'}${trophy ? ', 🏆 trophée' : ''}${nLost ? `, ${nLost} vaisseau${nLost > 1 ? 'x' : ''} perdu${nLost > 1 ? 's' : ''}` : ''}`, 'success', true);   // journal seulement : le message s'affiche sous « Explorer »
    return { kind: 'exped', id, got, lost, trophy, found, score: this.lastScore || 0 };
  },

  /* Score d'expédition = nombre d'explorers × aléatoire [0, 1).
     Les points sont répartis entre plusieurs artefacts : à chaque tirage, on prend un artefact
     au hasard parmi ceux dont le seuil tient dans les points restants (pas forcément le plus cher),
     jusqu'à ne plus rien pouvoir payer. La somme des seuils obtenus reste ≤ score.
     Retourne { id: nombre d'exemplaires }. */
  rollArtifact(n) {
    const score = n * Math.random();
    this.lastScore = score;
    let rest = score;
    const counts = {}, ids = Object.keys(ARTIFACTS), add = (id, k) => { counts[id] = (counts[id] || 0) + k; rest -= ARTIFACTS[id].pts * k; };
    // pas de limite au nombre d'artefacts. Pour les très gros scores, la partie où tous les artefacts
    // sont abordables est répartie d'un coup (même proportion moyenne qu'un tirage un par un)
    const maxPts = Math.max(...ids.map(id => ARTIFACTS[id].pts)), meanPts = ids.reduce((x, id) => x + ARTIFACTS[id].pts, 0) / ids.length;
    // (répété : avec de très grands nombres, l'arrondi laisse un reste encore énorme après un passage)
    if (!isFinite(rest)) rest = 0;
    for (let pass = 0; pass < 60 && rest > maxPts * 200; pass++) {
      const per = Math.floor((rest - maxPts * 100) / meanPts / ids.length);   // tirages par artefact
      if (per <= 0) break;
      for (const id of ids) add(id, per);
    }
    // le reste : un tirage à la fois, au hasard parmi les artefacts abordables (borné par sécurité)
    for (let guard = 0; guard < 200000; guard++) {
      const pool = ids.filter(id => ARTIFACTS[id].pts <= rest);
      if (!pool.length) break;
      add(pool[Math.floor(Math.random() * pool.length)], 1);
    }
    for (const id in counts) S.artifacts[id] = this.art(id) + counts[id];
    if (Object.keys(counts).length) this.rev++;
    return counts;
  },
  /* « ☄️ ×2 · 🧭 » : regroupe par type (accepte une liste d'identifiants ou un objet { id: nombre }) */
  artifactCounts(list) {
    if (list && !Array.isArray(list)) return { ...list };
    const c = {}; for (const id of list || []) c[id] = (c[id] || 0) + 1; return c;
  },

  /* --- carte galactique --- */
  map() { if (!this._map || this._map.seed !== S.map.seed) this._map = genMap(S.map.seed); return this._map; },
  /* ---- Conquête galactique (en nombre de destroyers) ----
     owner[i] : 'player' ou id de clan ; garrison[i] : nombre de destroyers ennemis du système ;
     deploy[i] : vos destroyers postés sur le système. La réserve (S.fleet.warship) défend votre système natal.
     Les clans se renforcent et s'attaquent entre eux (et vous attaquent) à chaque tour (MAP_TICK). */
  MAP_TICK: 8,   // durée d'un tour de la carte galactique (s)
  MAP_FLIGHT_MS: 4500,   // durée d'une flèche d'attaque sur la carte
  mapFlights: [],
  mapHits: [],   // pertes affichées sur la carte (texte qui monte au-dessus du système)
  mapHit(node, n, win, label) {
    if (n <= 0) return;
    this.mapHits.push({ node, n, win, t0: Date.now() });
    const name = this.map().nodes[node].name;
    this.lossLog(n, label || (win ? `Conquête de ${name}` : `Assaut sur ${name}`), win);
  },
  mapGain(node, n) { if (n > 0 && S.click.gate > 0) this.mapHits.push({ node, n, gain: true, t0: Date.now() + Math.random() * 600 }); },
  /* Historique des pertes de destroyers (6 dernières) */
  lossLog(n, txt, win) {
    if (n <= 0) return;
    S.stats.lossLog = [{ t: Date.now(), n, txt, win }, ...(S.stats.lossLog || [])].slice(0, 6);
  },
  mapInit() {
    const M = this.map(), m = S.map;
    if (m.owner && m.owner.length === M.nodes.length && m.v === 3) return;
    // ancienne carte (en puissance de feu, avec des defenders postés) : les defenders reviennent dans la réserve
    if (m.deploy && m.v === 2) for (const k in m.deploy) S.fleet.destroyer += m.deploy[k] || 0;
    m.deploy = {}; m.plan = null;
    S.stats.lossLog = [];
    const ids = Object.keys(CLANS), rnd = mulberry32(m.seed ^ 0x7f4a7c15);
    m.v = 3;
    m.explored = { 0: true };
    m.owner = M.nodes.map((_, i) => i === 0 ? 'player' : ids[Math.floor(rnd() * ids.length)]);
    // au déblocage, chaque système ennemi a plus de destroyers que toute votre flotte (×1,3 à ×2,5 selon la distance)
    const ref = Math.max(10, S.fleet.warship || 0);
    m.garrison = M.nodes.map((_, i) => i === 0 ? 0 : Math.round(ref * (1.1 + 0.35 * M.hops[i]) * (0.85 + rnd() * 0.3)));
    m.news = []; m.t = 0; m.capital = {};
    for (const clan of ids) {
      const own = m.owner.map((o, i) => i).filter(i => m.owner[i] === clan);
      if (!own.length) continue;
      const cap = own.reduce((a, b) => M.hops[b] > M.hops[a] ? b : a);
      m.capital[clan] = cap; m.garrison[cap] = Math.round(m.garrison[cap] * 1.5);
    }
  },
  mapOwned() { return (S.map.owner || []).filter(o => o === 'player').length; },
  mapExploredCount() { return S.map.owner ? this.mapOwned() : Object.keys(S.map.explored).length; },
  mapReachable(i) {
    const m = S.map; if (!m.owner) return false;
    return m.owner[i] !== 'player' && this.map().adj[i].some(j => m.owner[j] === 'player');
  },
  /* ---- Destroyers postés sur la carte ----
     Un clic sur une planète (la vôtre ou une voisine ennemie) y envoie 5 % des destroyers de la réserve (1 minimum).
     Sur vos planètes ils forment la garnison ; sur une planète ennemie ils l'attaquent dès qu'ils
     sont plus nombreux que les destroyers ennemis (vérifié à chaque tour). */
  /* planète d'où partent vos destroyers vers i : un de vos systèmes voisins (sinon le système natal) */
  mapSource(i) { const m = S.map; return this.map().adj[i].find(j => m.owner[j] === 'player' && j !== i) ?? 0; },
  mapReserve() { return S.fleet.warship || 0; },
  mapDep(i) { return (S.map.deploy && S.map.deploy[i]) || 0; },
  mapDeployed() { return Object.values(S.map.deploy || {}).reduce((a, b) => a + b, 0); },
  mapDefense(i) { return i === 0 ? this.mapReserve() : this.mapDep(i); },
  mapEnemy(i) { return Math.round(S.map.garrison[i] || 0); },   // destroyers ennemis (affichage)
  mapDeploy(i) {
    this.mapInit();
    const m = S.map;
    if (i === 0) return { ok: true };
    if (m.owner[i] !== 'player' && !this.mapReachable(i)) return { ok: false, msg: 'Hors de portée : la planète doit toucher un de vos systèmes.' };
    if (this.mapReserve() < 1) return { ok: false, msg: 'Plus aucun destroyer en réserve : construisez-en dans Espace galactique.' };
    const n = Math.max(1, Math.round(this.mapReserve() * 0.05));   // 5 % de la réserve (1 minimum)
    S.fleet.warship -= n;
    m.deploy[i] = this.mapDep(i) + n;
    this.mapFlights.push({ from: this.mapSource(i), to: i, t0: Date.now(), you: true });
    this.rev++;
    return { ok: true };
  },
  mapRecall(i) {
    const n = this.mapDep(i);
    if (n < 1) return { ok: false, msg: 'Aucun destroyer sur cette planète.' };
    S.fleet.warship += n; S.map.deploy[i] = 0;
    this.mapFlights.push({ from: i, to: 0, t0: Date.now(), you: true });
    this.rev++;
    return { ok: true };
  },
  /* vos assauts : les destroyers postés sur une planète ennemie attaquent quand ils sont plus nombreux */
  mapAssaults() {
    const m = S.map, M = this.map();
    m.owner.forEach((o, i) => {
      const dep = this.mapDep(i);
      if (o === 'player' || dep < 1) return;
      const E = m.garrison[i], clan = CLANS[o];
      if (dep <= E) return;   // en attente de renforts
      this.mapFlights.push({ from: M.adj[i].find(j => m.owner[j] === 'player') ?? 0, to: i, t0: Date.now(), you: true });
      if (!this.mapFight(dep, E)) {
        // assaut repoussé : tous les destroyers postés sont perdus, la défense est affaiblie
        m.deploy[i] = 0;
        m.garrison[i] = Math.max(0, E - dep * 0.7);
        this.mapHit(i, dep, false);
        this.emit(`Assaut repoussé à ${M.nodes[i].name} par les ${clan.name} (−${dep} destroyer${dep > 1 ? 's' : ''})`, 'warn');
        return;
      }
      const lost = Math.min(dep, Math.ceil(E * 0.7));
      m.deploy[i] = dep - lost;
      this.mapHit(i, lost, true);
      m.owner[i] = 'player'; m.explored[i] = true; m.garrison[i] = 0;
      this.mapNews(`Vous conquérez ${M.nodes[i].name} sur les ${clan.name} (−${lost} destroyers)`);
      this.emit(`Conquête de ${M.nodes[i].name} (−${lost} destroyer${lost > 1 ? 's' : ''})`, 'success');
      if (this.mapOwned() === M.nodes.length) this.emit('🏆 Toute la galaxie est à vous !', 'success');
    });
  },
  /* Combat de la carte : attaquant × aléatoire [0, 1) contre défenseur × aléatoire [0, 1) + 1 */
  mapFight(A, D) { return A * Math.random() > D * Math.random() + 1; },
  /* probabilité de victoire de l'attaquant (intégration sur une grille 60 × 60) */
  mapWinChance(A, D) {
    const n = 60; let w = 0;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (A * (i + 0.5) / n > D * (j + 0.5) / n + 1) w++;
    return w / (n * n);
  },
  mapNews(txt) { S.map.news.unshift({ t: Date.now(), txt }); S.map.news.length = Math.min(S.map.news.length, 5); },
  /* Attaques du prochain tour : chaque clan attaque un voisin à chaque tour,
     en visant vos systèmes une fois sur deux ; au plus un raid sur votre système natal (15 %). */
  mapPlan() {
    const m = S.map, M = this.map(), plan = [];
    let home = false;
    for (const clan of Object.keys(CLANS)) {
      let fronts = [];
      M.adj.forEach((list, i) => { if (m.owner[i] === clan) for (const j of list) if (m.owner[j] !== clan) fronts.push([i, j]); });
      if (!fronts.length) continue;
      // raids sur le système natal : au plus un par tour, et seulement 15 % du temps
      if (home || Math.random() > 0.15) fronts = fronts.filter(([, j]) => j !== 0);
      if (!fronts.length) continue;
      const vsYou = fronts.filter(([, j]) => m.owner[j] === 'player');
      const pool = vsYou.length && Math.random() < 0.5 ? vsYou : fronts;
      const [from, to] = pool[Math.floor(Math.random() * pool.length)];
      if (to === 0) home = true;
      plan.push({ clan, from, to });
    }
    return plan;
  },
  /* destroyers engagés par une attaque planifiée (la moitié seulement pour un raid sur le système natal) */
  planForce(p) { return Math.round(S.map.garrison[p.from] * (p.to === 0 ? 0.3 : 0.6)); },
  /* Planète mère d'un clan : là où il construit la plupart de ses destroyers.
     Si elle est prise, le clan en choisit une nouvelle parmi ses planètes (la mieux défendue). */
  clanCapital(clan) {
    const m = S.map;
    m.capital = m.capital || {};
    const c = m.capital[clan];
    if (c != null && m.owner[c] === clan) return c;
    const own = m.owner.map((o, i) => i).filter(i => m.owner[i] === clan);
    if (!own.length) { delete m.capital[clan]; return null; }
    return (m.capital[clan] = own.reduce((a, b) => m.garrison[b] > m.garrison[a] ? b : a));
  },
  isCapital(i) { const o = S.map.owner[i]; return o !== 'player' && this.clanCapital(o) === i; },
  /* vos destroyers au total (réserve + postés) : sert de référence au niveau des clans */
  mapPlayerTotal() { return this.mapReserve() + this.mapDeployed(); },
  /* Renforts d'un tour : chaque clan produit dans sa planète mère au rythme de votre flotte
     (2 % de vos destroyers + 0,3 par 15 s), avec un rattrapage s'il a moins de 90 % de vos destroyers ;
     ses autres planètes grossissent peu (+1 %). La planète mère envoie ensuite 25 % de sa flotte vers une
     planète du clan au contact de l'ennemi (mouvement de troupes visible sur la carte). */
  mapReinforce() {
    const m = S.map, M = this.map(), k = this.MAP_TICK / 15;
    const ref = Math.max(10, this.mapPlayerTotal());
    for (const clan of Object.keys(CLANS)) {
      const cap = this.clanCapital(clan);
      if (cap == null) continue;
      const own = m.owner.map((o, i) => i).filter(i => m.owner[i] === clan);
      const total = own.reduce((a, i) => a + m.garrison[i], 0);
      for (const i of own) {
        if (i === cap) continue;
        const g = m.garrison[i], ng = g * Math.pow(1.01, k);
        m.garrison[i] = ng; this.mapGain(i, Math.round(ng) - Math.round(g));
      }
      const prod = (0.02 * ref + 0.3) * k + Math.max(0, 0.9 * ref - total) * 0.1 * k;
      const g0 = m.garrison[cap];
      m.garrison[cap] = g0 + prod;
      this.mapGain(cap, Math.round(m.garrison[cap]) - Math.round(g0));
      // envoi de renforts vers le front
      const front = own.filter(i => i !== cap && M.adj[i].some(j => m.owner[j] !== clan));
      if (front.length && m.garrison[cap] >= 4) {
        const to = front[Math.floor(Math.random() * front.length)], n = m.garrison[cap] * 0.25;
        m.garrison[cap] -= n; m.garrison[to] += n;
        this.mapFlights.push({ from: cap, to, t0: Date.now() + Math.random() * 800, move: CLANS[clan].color });
      }
    }
    for (let i = 0; i < m.garrison.length; i++) if (m.owner[i] === 'player') m.garrison[i] = 0;
  },
  /* tour des clans : renforts et guerres */
  mapTick(dt) {
    if (!(S.click.gate > 0)) return;
    this.mapInit();
    const m = S.map, M = this.map();
    if (!m.plan) m.plan = this.mapPlan();
    m.t = (m.t || 0) + dt;
    if (m.t < this.MAP_TICK) return;
    m.t = 0;
    this.mapAssaults();   // vos assauts d'abord (avant les renforts des clans)
    this.mapReinforce();
    // les attaques annoncées au tour précédent ont lieu maintenant (si elles sont encore possibles)
    for (const p of m.plan || []) {
      const { clan, from, to } = p;
      if (m.owner[from] !== clan || m.owner[to] === clan) continue;
      // flèche animée sur la carte : la flotte du clan file vers sa cible
      this.mapFlights.push({ from, to, t0: Date.now() + Math.random() * 1500 });
      const victim = m.owner[to], atk = this.planForce(p);
      if (atk < 1) continue;
      m.garrison[from] -= atk;
      if (to === 0) {
        // système natal : raid contre votre réserve de destroyers ; il ne peut pas être pris
        const def = this.mapReserve();
        // même règle que les pirates : en victoire on perd 25 % des destroyers attaquants,
        // en défaite autant que l'attaquant, et pillage au prorata de l'écart
        if (this.mapFight(atk, def)) {
          const lost = Math.min(def, Math.round(atk));   // on perd autant de destroyers que l'attaquant en a engagé
          const ratio = this.MAP_STEAL * (1 - Math.min(1, def / atk)) * Math.max(0, 1 - 0.1 * this.art('seal'));
          S.fleet.warship -= lost;
          this.mapHit(0, lost, false, `Raid des ${CLANS[clan].name}`);
          for (const r of RES_KEYS) S.res[r] -= S.res[r] * ratio;
          const pct = Math.round(ratio * 1000) / 10;
          this.emit(`⚔ Raid des ${CLANS[clan].name} sur ${M.nodes[0].name} : défaite (−${lost} destroyers${pct ? `, −${String(pct).replace('.', ',')} % de matières` : ''})`, 'warn');
        } else {
          const lost = Math.min(def, Math.round(atk * 0.25));
          S.fleet.warship -= lost;
          this.mapHit(0, lost, true, `Raid des ${CLANS[clan].name}`);
          this.emit(`⚔ Raid des ${CLANS[clan].name} sur ${M.nodes[0].name} : repoussé (−${lost} destroyers)`, 'info');
        }
        continue;
      }
      const def = victim === 'player' ? this.mapDep(to) : m.garrison[to];
      if (this.mapFight(atk, def)) {   // issue tirée au sort (avantage de +1 au défenseur)
        m.owner[to] = clan; m.garrison[to] = Math.max(1, atk - def);
        if (victim === 'player') {
          // vos destroyers postés y sont tous perdus
          const lost = this.mapDep(to); m.deploy[to] = 0;
          this.mapHit(to, lost, false, `Perte de ${M.nodes[to].name}`);
          delete m.explored[to]; this.emit(`Les ${CLANS[clan].name} vous prennent ${M.nodes[to].name}${lost ? ` (−${lost} destroyers)` : ''}`, 'warn');
        }
        this.mapNews(`Les ${CLANS[clan].name} s'emparent de ${M.nodes[to].name}`);
      } else if (victim === 'player') {
        // même règle que les pirates : on perd 25 % des destroyers attaquants
        const lost = Math.min(this.mapDep(to), Math.round(atk * 0.25));
        m.deploy[to] = this.mapDep(to) - lost;
        this.mapHit(to, lost, true, `Défense de ${M.nodes[to].name}`);
        this.emit(`Les ${CLANS[clan].name} attaquent ${M.nodes[to].name} : repoussés${lost ? ` (−${lost} destroyers)` : ''}`, 'info');
      } else {
        m.garrison[to] = Math.max(0, def - atk * 0.7);
        this.mapNews(`${M.nodes[to].name} résiste aux ${CLANS[clan].name}`);
      }
    }
    m.plan = this.mapPlan();   // attaques du prochain tour, annoncées dans le tableau
    this.rev++;
  },
  /* bonus permanents des systèmes explorés */
  mapResBonus(res) { return this.map().nodes.filter((n, i) => S.map.explored[i] && n.type === res).length * 5; },   // +500 % par système conquis
  mapAllBonus() { return this.map().nodes.filter((n, i) => S.map.explored[i] && n.type === 'relic').length * 3; },   // +300 % de toute production par ruine

  /* --- succès --- */
  achTier(a) { const v = a.metric(); return a.steps.filter(x => v >= x).length; },
  achCount() { return ACHIEVEMENTS.reduce((x, a) => x + (S.ach[a.id] || 0), 0); },   // succès supprimés ignorés     // paliers atteints
  achTotal() { return ACHIEVEMENTS.reduce((x, a) => x + a.steps.length, 0); },
  checkAch() {
    const out = [];
    for (const a of ACHIEVEMENTS) {
      const t = this.achTier(a), prev = S.ach[a.id] || 0;
      if (t > prev) { S.ach[a.id] = t; out.push({ a, tier: t }); }
    }
    if (out.length) this.rev++;
    return out;
  },

  /* fin des expéditions et des sondes (fonctionne aussi après une absence) */
  tickExpansion() {
    const now = Date.now(), out = [];
    // anciennes missions supprimées : les vaisseaux rentrent simplement
    for (const id in S.exped) if (!EXPEDITIONS[id]) { for (const t in S.exped[id].ships) if (SHIPS[t]) S.fleet[t] += S.exped[id].ships[t]; delete S.exped[id]; }
    for (const id in S.exped) if (S.exped[id].end <= now) out.push(this.resolveExped(id));
    if (out.length) this.rev++;
    return out;
  },
});

/* ================= Affichage ================= */
Object.assign(UI, {
  expedHTML() {
    const home = G.explorerCount();
    return `<div class="tiles">${Object.keys(EXPEDITIONS).map(id => {
      const d = EXPEDITIONS[id], e = S.exped[id];
      const icons = Object.keys(d.reward(1)).map(r => resIcon(r)).join('') + (d.trophy ? '🏆' : '');
      let body;
      if (e) {
        const n = Object.values(e.ships).reduce((a, b) => a + b, 0);
        body = `<div class="tile-note">${n} explorer${n > 1 ? 's' : ''} · 🔭 ${fmtCost(e.P)}</div>
          <div class="exp-bar"><i data-start="${e.start}" data-end="${e.end}"></i></div>
          <div class="exp-left" data-end="${e.end}"></div>`;
      } else {
        const est = d.reward(G.explorePower());
        body = `<div class="tile-note">${d.desc}</div>
          <div class="tile-note">⏱ ${fmtTime(d.dur)} · Risque ${Math.round(d.risk * 100)} %</div>
          <div class="tile-note">Gain (100 %) ≈ ${Object.keys(est).map(r => `${resIcon(r)}${fmtCost(est[r])}`).join(' ')}</div>
          <div class="split-btn"><div class="split-halves three">${[0.25, 0.5, 1].map(f =>
            `<button class="btn btn-ship" data-action="exped" data-id="${id}:${f}" ${home ? '' : 'disabled'}>${f * 100} %</button>`).join('')}</div></div>`;
      }
      return `<div class="tile exp-tile" style="--c:${d.color}" title="${esc(d.name)} — ${esc(d.desc)}">
        <div class="tile-art icon">${ICONS[d.icon]}<span class="tile-lvl">${e ? 'En route' : 'Prête'}</span></div>
        <div class="tile-info"><div class="tile-row"><h3>${d.name}</h3><span class="tile-gain">${icons}</span></div>${body}</div>
      </div>`;
    }).join('')}</div>
    <div class="tile-note exp-help">Seuls les <b>explorers</b> (vaisseaux d'exploration) partent en expédition. Les pertes dépendent du risque de la mission.</div>`;
  },

  /* Flèches rouges des attaques en cours (redessinées à chaque image) */
  flightsSVG() {
    const M = G.map(), now = Date.now(), D = G.MAP_FLIGHT_MS;
    G.mapFlights = G.mapFlights.filter(f => now - f.t0 < D);
    G.mapHits = G.mapHits.filter(h => now - h.t0 < 3500);
    const hits = G.mapHits.map(h => {
      const n = M.nodes[h.node], q = (now - h.t0) / 3500;
      if (h.gain) return `<text class="map-hit gain" x="${n.x}" y="${(n.y - 7 - q * 4).toFixed(2)}" opacity="${Math.min(1, (1 - q) * 3).toFixed(2)}">+${h.n}</text>`;
      return `<text class="map-hit ${h.win ? 'win' : 'lose'}" x="${n.x}" y="${(n.y - 7 - q * 5).toFixed(2)}" opacity="${Math.min(1, (1 - q) * 3).toFixed(2)}">−${h.n} destroyer${h.n > 1 ? 's' : ''}</text>`;
    }).join('');
    return hits + G.mapFlights.filter(f => now >= f.t0).map(f => {
      const a = M.nodes[f.from], b = M.nodes[f.to];
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      const sx = a.x + ux * 3, sy = a.y + uy * 3, ex = b.x - ux * 3.6, ey = b.y - uy * 3.6;   // hors des disques
      const p = Math.min(1, (now - f.t0) / (D * 0.7)), fade = Math.min(1, (D - (now - f.t0)) / (D * 0.3));
      const hx = sx + (ex - sx) * p, hy = sy + (ey - sy) * p, ang = Math.atan2(uy, ux) * 180 / Math.PI;
      return `<g class="flight ${f.you ? 'you' : f.move ? 'move' : ''}" ${f.move ? `style="--mc:${f.move}"` : ''} opacity="${fade.toFixed(2)}">
        <line class="fl-path" x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}"/>
        <line class="fl-trail" x1="${sx}" y1="${sy}" x2="${hx}" y2="${hy}"/>
        <path class="fl-ship" d="M1.8 0 L-1.2 -1.1 L-0.6 0 L-1.2 1.1z" transform="translate(${hx} ${hy}) rotate(${ang})"/></g>`;
    }).join('');
  },

  /* Étoiles qui scintillent en fond de carte. Le retard d'animation suit l'horloge :
     la carte est redessinée souvent, sans que le scintillement ne reparte de zéro. */
  mapStarsSVG() {
    const rnd = mulberry32((S.map.seed || 1) ^ 0x51ed2701), now = Date.now() / 1000;
    let out = '<g class="map-stars">';
    for (let k = 0; k < 90; k++) {
      const x = rnd() * 100, y = rnd() * 60, r = 0.08 + rnd() * 0.22, dur = 1.8 + rnd() * 3.2, ph = rnd() * dur;
      out += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" style="animation-duration:${dur.toFixed(2)}s;animation-delay:-${((now + ph) % dur).toFixed(2)}s"/>`;
    }
    return out + '</g>';
  },

  mapHTML() {
    G.mapInit();
    const M = G.map(), m = S.map, sel = S.ui.mapSel != null ? S.ui.mapSel : null;
    const col = i => m.owner[i] === 'player' ? '#4fc3ff' : CLANS[m.owner[i]].color;
    const edges = [];
    M.adj.forEach((list, i) => list.forEach(j => {
      if (j < i) return;
      const a = M.nodes[i], b = M.nodes[j], same = m.owner[i] === m.owner[j];
      edges.push(`<line class="map-edge ${same ? 'on' : ''}" style="--c:${same ? col(i) : '#2a3a55'}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);
    }));
    const nodes = M.nodes.map((n, i) => {
      const mine = m.owner[i] === 'player', reach = G.mapReachable(i);
      const dep = G.mapDep(i);
      // nombre de destroyers : réserve (système natal), garnison (vos systèmes) ou flotte ennemie
      const top = i === 0 ? '★ ×' + fmtCost(G.mapReserve()) : mine ? '×' + fmtCost(dep) : '×' + fmtCost(G.mapEnemy(i));
      return `<g class="map-node ${mine ? 'mine' : 'clan'} ${reach ? 'reachable' : ''} ${sel === i ? 'sel' : ''}" data-action="mapdeploy" data-id="${i}" style="--c:${col(i)}">
        <circle cx="${n.x}" cy="${n.y}" r="${i === 0 ? 3.4 : 2.6}"/>
        <text x="${n.x}" y="${n.y + 5.6}">${G.isCapital(i) ? '♛ ' : ''}${esc(n.name)}</text>
        <text class="g" x="${n.x}" y="${n.y - 3.8}">${top}</text>
        ${dep && !mine ? `<text class="dep" x="${n.x}" y="${n.y - 7}">×${dep} destroyer${dep > 1 ? 's' : ''}</text>` : ''}</g>`;
    }).join('');
    const bon = [];
    for (const r of RES_KEYS) { const b = G.mapResBonus(r); if (b) bon.push(`${resIcon(r)}+${Math.round(b * 100)} %`); }
    if (G.mapAllBonus()) bon.push(`Toute production +${Math.round(G.mapAllBonus() * 100)} %`);
    return `<div class="map-wrap">
      <svg class="galaxy" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">${this.mapStarsSVG()}${edges.join('')}${nodes}<g class="map-flights">${this.flightsSVG()}</g></svg>
      ${bon.length ? `<div class="map-side"><div class="map-bonus">${bon.join(' · ')}</div></div>` : ''}</div>`;
  },

  /* Médaille d'un succès : logo propre, couleur du palier atteint */
  medalHTML(a, t, big = false) {
    const tier = t ? achTier(a, t) : null;
    return `<span class="medal ${tier ? '' : 'locked'} ${tier === ACH_TIERS[ACH_TIERS.length - 1] ? 'plasma' : ''} ${big ? 'big' : ''}" style="--t:${tier ? tier.color : '#3a4558'}">${ICONS[a.icon]}</span>`;
  },

  achHTML() {
    return `<div class="ach-grid">${ACHIEVEMENTS.map(a => {
      const t = S.ach[a.id] || 0, next = a.steps[t];
      // info-bulle : un détail par ligne
      const tip = [
        a.name,
        `Palier actuel : ${t ? achTier(a, t).name : 'non débloqué'}`,
        next != null ? `Progression : ${fmtCost(Math.floor(a.metric()))} / ${fmtCost(next)} ${a.unit}` : 'Palier maximum atteint',
        '',
        ...a.steps.map((v, k) => `${k < t ? '✓' : '·'} ${achTier(a, k + 1).name} : ${fmtCost(v)} ${a.unit}`),
      ].join('\n');
      return `<div class="ach" title="${esc(tip)}">${this.medalHTML(a, t)}<b>${a.name}</b>
        <small style="color:${t ? achTier(a, t).color : 'var(--muted)'}">${t ? achTier(a, t).name : '—'}</small>
        <span class="ach-pips">${a.steps.map((_, k) => `<i class="${k < t ? 'on' : ''}" style="--t:${achTier(a, k + 1).color}"></i>`).join('')}</span></div>`;
    }).join('')}</div>`;
  },

  /* Notification de succès, en bas à droite de l'écran */
  achPopup({ a, tier }) {
    const T = achTier(a, tier);
    const t = document.createElement('div');
    t.className = 'toast ach-toast';
    t.style.setProperty('--t', T.color);
    t.innerHTML = `${this.medalHTML(a, tier, true)}<div><small>Succès ${T.name} · +1 % production</small><b>${esc(a.name)}</b><span>${fmtCost(a.steps[tier - 1])} ${esc(a.unit)}</span></div>`;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 6000);
    setTimeout(() => t.remove(), 6500);
  },

  /* Retour des explorers : message sous le mot « Explorer » de la flotte (8 s) */
  RETURN_MSG_MS: 8000,
  /* Message flottant au-dessus du logo d'un vaisseau de la flotte (sous la planète) */
  floatOverShip(shipId, html, cls) {
    const panel = document.querySelector('.planet-panel');
    const ico = document.querySelector(`#fleet li[data-ship="${shipId}"] .fl-ico`);
    if (!panel || !ico) return;
    panel.querySelectorAll(`.ship-float[data-ship="${shipId}"]`).forEach(e => e.remove());
    const pr = panel.getBoundingClientRect(), ir = ico.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = `floater raid-float ship-float ${cls}`;
    f.dataset.ship = shipId;
    f.innerHTML = html;
    f.style.left = (ir.left + ir.width / 2 - pr.left) + 'px';
    f.style.top = (ir.top - pr.top + panel.scrollTop - 52) + 'px';
    f.style.setProperty('--dx', '0px');
    panel.appendChild(f);
    setTimeout(() => f.remove(), 6500);
  },

  /* Retour d'expédition : message au-dessus du logo des explorers */
  expedBanner(r) {
    const counts = Object.entries(G.artifactCounts(r.found)).sort((a, b) => ARTIFACTS[b[0]].pts - ARTIFACTS[a[0]].pts);
    const nLost = Object.values(r.lost).reduce((a, b) => a + b, 0);
    const list = counts.map(([a, k]) => `<span style="color:${ARTIFACT_RARITY[ARTIFACTS[a].rarity].color}">${ARTIFACTS[a].icon}×${fmtCount(k)}</span>`).join(' ');   // logo + nombre (sans le nom)
    const html = `<em class="jp raidt">🚀 Retour d'expédition</em>`
      + (list || '<span class="muted">Aucun artefact</span>')
      + ` <span class="muted">· ${Math.floor(r.score || 0)} pts</span>`
      + (r.trophy ? ' <span class="trophy">🏆</span>' : '')
      + (nLost ? ` <span class="muted">· −${nLost}</span>` : '');
    if (S.ui.galaxy && S.click.gate > 0) return;   // onglet Galaxie : pas de message de retour
    this.floatOverShip('frigate', html, 'win');
  },
  expedReturnHTML() {
    const r = this.lastReturn;
    if (!r || Date.now() - r.t > this.RETURN_MSG_MS) return '';
    const gains = this.gainsHTML(r.got);
    const nLost = Object.values(r.lost).reduce((a, b) => a + b, 0);
    // l'animation d'apparition ne se joue qu'au retour, pas à chaque rafraîchissement (évite le clignotement)
    const fresh = Date.now() - r.t < 400;
    return `<span class="fl-return ${fresh ? 'fresh' : ''}">✅ Retour · ${EXPEDITIONS[r.id].name}<br>${gains || '<span class="muted">aucun butin</span>'}`
      + (r.trophy ? ' <span class="trophy">🏆</span>' : '')
      + (nLost ? ` <span class="muted">−${nLost}</span>` : '') + '</span>';
  },

  /* barres de progression des expéditions et des sondes */
  updateTimers() {
    const now = Date.now();
    document.querySelectorAll('.exp-bar i[data-end]').forEach(el => {
      const s = +el.dataset.start, e = +el.dataset.end;
      el.style.width = `${Math.min(100, (now - s) / (e - s) * 100)}%`;
    });
    // sous la planète : secondes avant le prochain retour d'expédition
    document.querySelectorAll('.away-left[data-end]').forEach(el => {
      el.textContent = `(${Math.max(0, Math.ceil((+el.dataset.end - now) / 1000))} s)`;
    });
    document.querySelectorAll('.exp-left[data-end]').forEach(el => {
      el.textContent = `Retour dans ${fmtTime((+el.dataset.end - now) / 1000)}`;
    });
  },
});
