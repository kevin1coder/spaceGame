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
const ACH_TIERS = [
  { name: 'Cuivre',  color: '#c87533' },
  { name: 'Argent',  color: '#cfd6e0' },
  { name: 'Or',      color: '#ffd166' },
  { name: 'Cristal', color: '#7fe7ff' },
  { name: 'Plasma',  color: '#c58bff' },
];
const ACHIEVEMENTS = [
  { id: 'clicks',   name: 'Mineur assidu',     icon: 'pick',        unit: 'clics',                steps: [10, 100, 1e3, 1e4, 1e5],   metric: () => S.stats.clicks },
  { id: 'ferrite',  name: 'Magnat du ferrite', icon: 'drill',       unit: 'ferrite en stock',     steps: [1e3, 1e4, 1e5, 1e6, 1e7],  metric: () => S.res.ferrite },
  { id: 'mines',    name: 'Industriel',        icon: 'factory',     unit: 'niveaux de mines',     steps: [5, 15, 30, 50, 80],        metric: () => G.mineSum() },
  { id: 'fleet',    name: 'Amiral',            icon: 'shipCruiser', unit: 'vaisseaux',            steps: [1, 10, 50, 200, 1000],     metric: () => G.fleetCount() + G.expedShips() },
  { id: 'raids',    name: 'Défenseur',         icon: 'laser',       unit: 'attaques repoussées',  steps: [1, 10, 25, 50, 100],       metric: () => S.stats.raidsWon },
  { id: 'boss',     name: 'Chasseur de chefs', icon: 'star',        unit: 'trophées',             steps: [1, 3, 5, 10, 20],          metric: () => S.raid.trophies },
  { id: 'moons',    name: 'Terraformeur',      icon: 'moon',        unit: 'lunes',                steps: [1, 2, 3],                  metric: () => S.moons.length },
  { id: 'expeds',   name: 'Explorateur',       icon: 'warp',        unit: 'expéditions',          steps: [1, 5, 15, 40, 100],        metric: () => S.stats.expeds },
  { id: 'map',      name: 'Cartographe',       icon: 'gate',        unit: 'systèmes explorés',    steps: [2, 4, 6, 9, 12],           metric: () => G.mapExploredCount() },
];

/* ---------- Carte galactique ---------- */
const MAP_SIZE = 12;
const STAR_NAMES = ['Achernar', 'Bellatrix', 'Capella', 'Diphda', 'Electra', 'Fomalhaut', 'Hadar', 'Izar', 'Kochab', 'Lesath',
  'Mirach', 'Naos', 'Phact', 'Rasalas', 'Sadr', 'Tureis', 'Wezen', 'Zosma', 'Alnair', 'Menkar'];
const SYS_TYPES = {
  home:       { name: 'Système natal',          color: '#4fc3ff', bonus: 'Votre colonie' },
  ferrite:    { name: 'Gisement de ferrite',    color: '#d9a066', bonus: '+5 % de ferrite',          w: 20 },
  deuterium:  { name: 'Nébuleuse de deutérium', color: '#4fd1c5', bonus: '+5 % de deutérium',        w: 20 },
  darkMatter: { name: 'Faille de matière noire', color: '#a77bff', bonus: '+5 % de matière noire',   w: 15 },
  cache:      { name: 'Épave abandonnée',       color: '#ffd166', bonus: 'Butin unique à la découverte', w: 20 },
  relic:      { name: 'Ruines anciennes',       color: '#ff8c5a', bonus: '+3 % de toute production', w: 10 },
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
    if (i === 0) { n.type = 'home'; return; }
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
    S.exped[id] = { start: now, end: now + EXPEDITIONS[id].dur * 1000, ships, P: this.shipsPower(ships) };
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
    const sent = Object.values(e.ships).reduce((a, b) => a + b, 0);
    const base = d.reward(sent), got = {};
    for (const r in base) { got[r] = Math.max(0, Math.min(base[r], caps[r] - S.res[r])); S.res[r] += got[r]; }
    const trophy = !!d.trophy && Math.random() < d.trophy;
    if (trophy) S.raid.trophies++;
    S.stats.expeds++;
    delete S.exped[id];
    const nLost = Object.values(lost).reduce((a, b) => a + b, 0);
    const gains = Object.keys(got).filter(r => got[r] >= 1).map(r => `+${fmtCost(got[r])} ${RESOURCES[r].name.toLowerCase()}`).join(', ');
    this.emit(`Retour de l'expédition « ${d.name} » : ${gains || 'aucun butin'}${trophy ? ', 🏆 trophée' : ''}${nLost ? `, ${nLost} vaisseau${nLost > 1 ? 'x' : ''} perdu${nLost > 1 ? 's' : ''}` : ''}`, 'success', true);   // journal seulement : le message s'affiche sous « Explorer »
    return { kind: 'exped', id, got, lost, trophy };
  },

  /* --- carte galactique --- */
  map() { if (!this._map || this._map.seed !== S.map.seed) this._map = genMap(S.map.seed); return this._map; },
  mapExploredCount() { return Object.keys(S.map.explored).length; },
  mapReachable(i) { return !S.map.explored[i] && this.map().adj[i].some(j => S.map.explored[j]); },
  probeCost(i) { return { darkMatter: Math.round(150 * Math.pow(2, this.map().hops[i] - 1)) }; },
  probeTime(i) { return 40 * this.map().hops[i]; },
  startProbe(i) {
    if (S.map.probe) return { ok: false, msg: 'Une sonde est déjà en route.' };
    if (!this.mapReachable(i)) return { ok: false, msg: "Système hors de portée : explorez d'abord un système voisin." };
    const cost = this.probeCost(i);
    if (!this.canAfford(cost)) return { ok: false, msg: 'Matière noire insuffisante.' };
    for (const r in cost) S.res[r] -= cost[r];
    const now = Date.now();
    S.map.probe = { i, start: now, end: now + this.probeTime(i) * 1000 };
    return { ok: true };
  },
  resolveProbe() {
    const i = S.map.probe.i, n = this.map().nodes[i], h = this.map().hops[i];
    S.map.explored[i] = true;
    S.map.probe = null;
    const got = {};
    if (n.type === 'cache') {
      const caps = this.rates().caps;
      const loot = { ferrite: 2000 * Math.pow(2, h), deuterium: 800 * Math.pow(2, h), darkMatter: 120 * h };
      for (const r in loot) { got[r] = Math.max(0, Math.min(loot[r], caps[r] - S.res[r])); S.res[r] += got[r]; }
    }
    this.emit(`Système ${n.name} exploré : ${SYS_TYPES[n.type].name} (${SYS_TYPES[n.type].bonus})`, 'success');
    return { kind: 'probe', i, got };
  },
  /* bonus permanents des systèmes explorés */
  mapResBonus(res) { return this.map().nodes.filter((n, i) => S.map.explored[i] && n.type === res).length * 0.05; },
  mapAllBonus() { return this.map().nodes.filter((n, i) => S.map.explored[i] && n.type === 'relic').length * 0.03; },

  /* --- succès --- */
  achTier(a) { const v = a.metric(); return a.steps.filter(x => v >= x).length; },
  achCount() { return Object.values(S.ach).reduce((x, y) => x + y, 0); },     // paliers atteints
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
    if (S.map.probe && S.map.probe.end <= now) out.push(this.resolveProbe());
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

  mapHTML() {
    const M = G.map(), sel = S.ui.mapSel != null ? S.ui.mapSel : null;
    const edges = [];
    M.adj.forEach((list, i) => list.forEach(j => {
      if (j < i) return;
      const a = M.nodes[i], b = M.nodes[j], on = S.map.explored[i] && S.map.explored[j];
      edges.push(`<line class="map-edge ${on ? 'on' : ''}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`);
    }));
    const nodes = M.nodes.map((n, i) => {
      const exp = !!S.map.explored[i], reach = G.mapReachable(i), probing = S.map.probe && S.map.probe.i === i;
      const state = exp ? 'explored' : reach ? 'reachable' : 'unknown';
      const color = exp ? SYS_TYPES[n.type].color : '#7b8ca6';
      return `<g class="map-node ${state} ${sel === i ? 'sel' : ''} ${probing ? 'probing' : ''}" data-action="mapsel" data-id="${i}" style="--c:${color}">
        <circle cx="${n.x}" cy="${n.y}" r="${i === 0 ? 3.2 : 2.3}"/>
        ${probing ? `<circle class="probe-ring" cx="${n.x}" cy="${n.y}" r="4"/>` : ''}
        <text x="${n.x}" y="${n.y + 5.6}">${exp || reach ? n.name : '?'}</text></g>`;
    }).join('');
    // panneau de détail du système sélectionné
    let info = '<div class="map-info muted">Sélectionnez un système sur la carte.</div>';
    if (sel != null) {
      const n = M.nodes[sel], exp = !!S.map.explored[sel], reach = G.mapReachable(sel), t = SYS_TYPES[n.type];
      const probing = S.map.probe && S.map.probe.i === sel;
      let action = '';
      if (probing) action = `<div class="exp-bar"><i data-start="${S.map.probe.start}" data-end="${S.map.probe.end}"></i></div><div class="exp-left" data-end="${S.map.probe.end}"></div>`;
      else if (reach) {
        const c = G.probeCost(sel);
        action = `<button class="btn btn-up probe-btn" data-action="probe" data-id="${sel}" ${S.map.probe || !G.canAfford(c) ? 'disabled' : ''}>
          Envoyer une sonde · ${resIcon('darkMatter')}${fmtCost(c.darkMatter)} · ⏱ ${fmtTime(G.probeTime(sel))}</button>
          ${S.map.probe ? '<div class="tile-note">Une sonde est déjà en route.</div>' : ''}`;
      } else if (!exp) action = `<div class="tile-note">Hors de portée : explorez d'abord un système voisin.</div>`;
      info = `<div class="map-info" style="--c:${exp ? t.color : '#7b8ca6'}">
        <div class="map-title">${exp || reach ? n.name : 'Système inconnu'} <small>${M.hops[sel]} saut${M.hops[sel] > 1 ? 's' : ''}</small></div>
        <div class="map-type">${exp ? `${t.name} · <b>${t.bonus}</b>` : 'Non exploré'}</div>${action}</div>`;
    }
    // résumé des bonus obtenus
    const bon = [];
    for (const r of RES_KEYS) { const b = G.mapResBonus(r); if (b) bon.push(`${resIcon(r)}+${Math.round(b * 100)} %`); }
    if (G.mapAllBonus()) bon.push(`Toute production +${Math.round(G.mapAllBonus() * 100)} %`);
    return `<div class="map-wrap">
      <svg class="galaxy" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">${edges.join('')}${nodes}</svg>
      <div class="map-side">${info}
        <div class="map-bonus"><b>Systèmes explorés : ${G.mapExploredCount()}/${MAP_SIZE}</b>${bon.length ? `<div>${bon.join(' · ')}</div>` : ''}</div>
      </div></div>`;
  },

  /* Médaille d'un succès : logo propre, couleur du palier atteint */
  medalHTML(a, t, big = false) {
    const tier = t ? ACH_TIERS[t - 1] : null;
    return `<span class="medal ${tier ? '' : 'locked'} ${t === ACH_TIERS.length ? 'plasma' : ''} ${big ? 'big' : ''}" style="--t:${tier ? tier.color : '#3a4558'}">${ICONS[a.icon]}</span>`;
  },

  achHTML() {
    return `<div class="ach-grid">${ACHIEVEMENTS.map(a => {
      const t = S.ach[a.id] || 0, next = a.steps[t];
      const tip = `${a.name} — ${t ? `palier ${ACH_TIERS[t - 1].name}` : 'non débloqué'}${next != null ? ` · prochain palier : ${fmtCost(Math.floor(a.metric()))} / ${fmtCost(next)} ${a.unit}` : ' · palier maximum'}`;
      return `<div class="ach" title="${esc(tip)}">${this.medalHTML(a, t)}<b>${a.name}</b>
        <small style="color:${t ? ACH_TIERS[t - 1].color : 'var(--muted)'}">${t ? ACH_TIERS[t - 1].name : '—'}</small>
        <span class="ach-pips">${a.steps.map((_, k) => `<i class="${k < t ? 'on' : ''}" style="--t:${ACH_TIERS[k].color}"></i>`).join('')}</span></div>`;
    }).join('')}</div>`;
  },

  /* Notification de succès, en bas à droite de l'écran */
  achPopup({ a, tier }) {
    const T = ACH_TIERS[tier - 1];
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
  expedBanner(r) {
    this.lastReturn = { ...r, t: Date.now() };
    G.rev++;
    clearTimeout(this.returnTimer);
    this.returnTimer = setTimeout(() => { this.lastReturn = null; G.rev++; }, this.RETURN_MSG_MS);
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
