/* ============================================================
   Interface : barre de ressources, page unique à sections
   repliables (tuiles), planète / lunes cliquables, casino,
   robot, navettes, toasts
   ============================================================ */

const $ = s => document.querySelector(s);

/* Au-delà de 1 000 T : notation en puissance de 10 (« 1,23×10¹⁵ ») */
function fmtSci(n, digits = 2) {
  let e = Math.floor(Math.log10(Math.abs(n))), m = n / Math.pow(10, e);
  if (Math.abs(+m.toFixed(digits)) >= 10) { e++; m /= 10; }   // 9,999 → 1×10ⁿ⁺¹
  const sup = String(e).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('');
  return `${m.toFixed(digits).replace(/\.?0+$/, '').replace('.', ',')}×10${sup}`;
}
function fmt(n) {
  if (!isFinite(n)) return '∞';
  const a = Math.abs(n);
  if (a >= 1e15) return fmtSci(n);
  if (a < 1e6) return Math.floor(n).toLocaleString('fr-FR');
  if (a < 1e9) return (n / 1e6).toFixed(2).replace('.', ',') + ' M';
  if (a < 1e12) return (n / 1e9).toFixed(2).replace('.', ',') + ' Md';
  return (n / 1e12).toFixed(2).replace('.', ',') + ' T';
}
/* Quantités de matière : arrondies à l'unité */
function fmtRate(n) { return fmt(Math.round(n)); }
/* Valeurs compactes : 3 chiffres au maximum (379 · 1,23k · 12,3k · 123k · 1,23M …) */
function fmtCost(n) {
  if (n < 1000) return String(Math.floor(n));
  if (n >= 999.5e12) return fmtSci(n, 2);
  const units = [['k', 1e3], ['M', 1e6], ['Md', 1e9], ['T', 1e12]];
  let i = 0;
  while (i < units.length - 1 && n / units[i][1] >= 999.5) i++;
  const v = n / units[i][1];
  const s = v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0);
  // on ne retire les zéros finaux que dans la partie décimale (sinon 420k deviendrait 42k)
  const t = s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
  return t.replace('.', ',') + units[i][0];
}
/* Nombre d'exemplaires : en entier jusqu'à 6 chiffres, puis en unités (1,23M · 45,6Md …) */
function fmtCount(n) { return n < 1e6 ? String(Math.floor(n)) : fmtCost(n); }
function fmtTime(sec) {
  if (!isFinite(sec)) return '∞';
  sec = Math.max(0, Math.ceil(sec));
  const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  if (d) return `${d}j ${h}h`;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}
function resIcon(r) { return `<span class="rl">${RES_LOGOS[r]}</span>`; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const diff = t => `<span class="diff">(${t})</span>`;

/* Matériaux nécessaires, affichés par-dessus l'image (une ligne par matériau) */
function artCosts(kind, id, cost, pos = 'left', prefix = '') {
  if (!cost) return '';
  const lines = Object.entries(cost).filter(([, v]) => v > 0)
    .map(([r, v]) => `<span class="cost" data-u="${kind}:${id}" data-res="${r}" data-amt="${v}">${resIcon(r)}${fmtCost(v)}</span>`).join('');
  return lines ? `<div class="art-costs ${pos}">${prefix}${lines}</div>` : '';
}
function upBtn(action, id, label, disabledLabel) {
  return `<button class="btn btn-up" data-action="${action}" data-id="${id}">${disabledLabel || label}</button>`;
}

const GROUPS = [
  { id: 'mines',      title: 'Extraction' },
  { id: 'click',      title: 'Technologies',  sub: 'Politique et automatisation' },
  { id: 'buildings',  title: 'Espace orbital' },
  { id: 'galaxy',     title: 'Espace galactique' },
  { id: 'log',        title: 'Journal',       sub: 'Derniers événements' },
];
const MOON_GROUPS = [
  { id: 'moonMines', title: 'Mines lunaires', sub: 'Production de la lune' },
  { id: 'moonTech',  title: 'Technologies lunaires', sub: 'Payées en matière noire de la lune' },
];

const UI = {
  renderedRev: -1,
  robotPend: { ferrite: 0, deuterium: 0, darkMatter: 0 },
  robotLast: 0,
  moonRs: [],

  init(planet) {
    this.planet = planet;
    // les actions se déclenchent dès l'appui (pointerdown) : un clic n'est plus perdu si la tuile
    // est redessinée entre l'appui et le relâchement (ex. achat automatique en continu)
    document.body.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const el = e.target.closest('[data-action]');
      if (!el || el.disabled) return;
      this.act(el.dataset.action, el.dataset.id, el);
    });
    // clavier (Entrée / Espace) : le clic n'a pas d'appui de pointeur (detail = 0)
    document.body.addEventListener('click', e => {
      if (e.detail !== 0) return;
      const el = e.target.closest('[data-action]');
      if (el && !el.disabled) this.act(el.dataset.action, el.dataset.id, el);
    });
    G.on((msg, type) => this.toast(msg, type));
    $('#modalClose').addEventListener('click', () => $('#modal').hidden = true);
    this.buildResbar();
    this.bindPlanetClick();
  },

  /* Corps affiché (planète ou lune) et son renderer */
  viewKind() { return G.moonIdx() >= 0 ? 'm' : 'b'; },
  body() {
    const i = G.moonIdx();
    if (i < 0) return this.planet;
    if (!this.moonRs[i]) this.moonRs[i] = new PlanetRenderer($('#planetCanvas'), $('#planetWrap'), S.moons[i].seed, 'moon');
    return this.moonRs[i];
  },
  setView(v) {
    // onglet « Galaxie » : la carte galactique remplace la planète dans le bloc de gauche
    S.ui.galaxy = v === 'galaxy';
    if (S.ui.galaxy) {
      document.querySelectorAll('.ship-float').forEach(e => e.remove());   // retire les messages (expédition, combat pirate) affichés
      G.rev++; this.update(true); return;
    }
    S.view = v === 'planet' ? 'planet' : +v;
    if (G.moonIdx() < 0) S.view = 'planet';
    this.body().resize();
    G.rev++;
    this.update(true);
  },

  act(action, id, el) {
    let r = null;
    switch (action) {
      case 'build': r = G.upgrade('b', id); if (r.ok) this.flash = 'b:' + id; break;
      case 'moonbuild': r = G.upgrade('m', id); if (r.ok) this.flash = 'm:' + id; break;
      case 'moontech': r = G.upgrade('x', id); if (r.ok) this.flash = 'x:' + id; break;
      case 'research': r = G.upgrade('t', id); if (r.ok) this.flash = 't:' + id; break;
      case 'ship': {
        const [sid, n] = id.split(':');
        r = G.buildShips(sid, +n);
        if (r.ok) this.flash = 's:' + sid;
        break;
      }
      case 'autotrade': S.ui.autoTradeOn = !G.autoTradeOn(); G.rev++; break;
      case 'cargotoggle': { const m = G.curMoon(); m.cargoOn = !m.cargoOn; G.rev++; break; }
      case 'clickup': r = G.upgrade('c', id); if (r.ok) this.flash = 'c:' + id; break;
      case 'view': this.setView(id); return;
      case 'exped': { const [eid, f] = id.split(':'); r = G.startExped(eid, +f); G.rev++; break; }
      case 'sendexp': r = G.startExped('voyage', 1); G.rev++; break;
      case 'mapsel': S.ui.mapSel = +id; G.rev++; break;
      case 'mapdeploy': S.ui.mapSel = +id; r = G.mapDeploy(+id); G.rev++; break;   // clic sur une planète : +1 destroyer
      case 'maprecall': r = G.mapRecall(+id); G.rev++; break;
      case 'auto':
        // vaisseaux : 3 états (désactivé → activé ×1/×10/×100 → max) ; autres tuiles : on / off
        S.auto[id] = SHIPS[id] ? (!S.auto[id] ? true : S.auto[id] === 'max' ? false : 'max') : !S.auto[id];
        G.rev++;
        break;
      case 'swap': {
        const [from, to] = id.split(':');
        r = G.exchange(from, to);
        if (r.ok) { this.updateResbar(); this.updateCards(); }
        else this.toast(r.msg, 'error');
        return;
      }
      case 'xfer': {
        const [tid, dir] = id.split(':');
        r = G.transfer(tid, dir);
        if (r.ok) { this.updateResbar(); this.updateCards(); }
        else this.toast(r.msg, 'error');
        return;
      }
      case 'toggle': {
        const sec = el.closest('.group');
        const closed = sec.classList.toggle('collapsed');
        S.ui.collapsed[id] = closed;
        el.setAttribute('aria-expanded', String(!closed));
        return;
      }
      case 'rename': {
        const n = prompt('Nouveau nom de la planète :', S.planet.name);
        if (n && n.trim()) { S.planet.name = n.trim().slice(0, 24); G.rev++; G.save(); }
        break;
      }
      case 'options': this.modal(this.optionsHTML()); return;
      case 'save': G.save() ? this.toast('Partie sauvegardée.', 'success') : this.toast('Échec de la sauvegarde.', 'error'); return;
      case 'export': { const ta = $('#saveData'); ta.value = G.exportSave(); ta.select(); this.toast('Sauvegarde exportée : copiez le texte.', 'info'); return; }
      case 'copy': { const ta = $('#saveData'); ta.select(); navigator.clipboard?.writeText(ta.value).then(() => this.toast('Copié dans le presse-papiers.', 'success')).catch(() => {}); return; }
      case 'import': {
        const v = $('#saveData').value;
        if (!v.trim()) return this.toast('Collez une sauvegarde dans la zone de texte.', 'error');
        try { G.importSave(v); this.planet.setSeed(S.planet.seed); this.moonRs = []; $('#modal').hidden = true; this.toast('Sauvegarde importée.', 'success'); }
        catch (e) { this.toast('Sauvegarde invalide.', 'error'); }
        break;
      }
      case 'reset':
        if (confirm('Effacer définitivement votre partie et recommencer ?')) {
          G.reset(); this.planet.setSeed(S.planet.seed); this.moonRs = []; $('#modal').hidden = true; this.toast('Nouvelle partie commencée.', 'info');
        }
        break;
    }
    if (r && !r.ok && r.msg) this.toast(r.msg, 'error');
    this.update(true);
  },

  /* ---------- Barre de ressources (compteur du corps affiché) ---------- */
  buildResbar() {
    $('#resbar').innerHTML = RES_KEYS.map(r => `
      <div class="res" data-res="${r}">
        <div class="res-icon" style="--c:${RESOURCES[r].color}">${RES_LOGOS[r]}</div>
        <div class="res-txt">
          <div class="res-name">${RESOURCES[r].name}</div>
          <div class="res-amt">0</div>
          <div class="res-rate">+0/s</div>
        </div>
        <div class="res-bar"><i></i></div>
      </div>`).join('');
    this.resEls = {};
    document.querySelectorAll('#resbar .res').forEach(el => {
      this.resEls[el.dataset.res] = { el, amt: el.querySelector('.res-amt'), rate: el.querySelector('.res-rate'), bar: el.querySelector('.res-bar i') };
    });
  },

  updateResbar() {
    const kind = this.viewKind(), w = G.wallet(kind), rt = G.walletRates(kind);
    const where = kind === 'm' ? G.curMoon().name : 'Planète';
    for (const r of RES_KEYS) {
      const e = this.resEls[r], cap = rt.caps[r], v = w[r];
      e.amt.textContent = fmt(v);
      e.rate.textContent = `+${fmtRate(rt[r])}/s`;
      e.bar.style.width = isFinite(cap) ? Math.min(100, v / cap * 100) + '%' : '0%';
      e.el.classList.toggle('full', v >= cap);
      e.el.title = `${where} — ${RESOURCES[r].name} : ${fmt(v)} / ${fmt(cap)}\nProduction : ${fmt(rt[r] * 3600)}/h`;
    }
    $('#resbar').classList.toggle('moon-wallet', kind === 'm');
  },

  /* ---------- Boucle de mise à jour ---------- */
  update(force) {
    const rt = G.rates();
    if (force || this.renderedRev !== G.rev) {
      this.renderContent(rt);
      this.renderPlanetInfo(rt);
      this.renderedRev = G.rev;
    }
    this.updateResbar();
    this.updateCards();
  },

  renderContent(rt) {
    const c = $('#content');
    const moon = this.viewKind() === 'm';
    c.innerHTML =   // (bloc « Conseil » retiré)
      (moon ? MOON_GROUPS : GROUPS).filter(g => g.id !== 'map' || S.click.gate > 0)
        .filter(g => g.id !== 'click' || TECH_TYPES.some(t => Object.values(CLICK_TECHS).some(d => d.type === t.id)))
        .map(g => this.groupHTML(g, rt)).join('');
    this.cards = [...c.querySelectorAll('[data-upg]')].map(el => {
      const kind = el.dataset.kind, id = el.dataset.id;
      return {
        el, kind, id,
        btn: el.matches('.btn-up') ? el : el.querySelector('.btn-up'),
        costs: [...c.querySelectorAll(`.cost[data-u="${kind}:${id}"]`)],
        xfers: [...el.querySelectorAll('[data-action="xfer"]')],
        swaps: [...el.querySelectorAll('[data-action="swap"]')],
        ships: [...el.querySelectorAll('[data-action="ship"]')],
        timer: el.querySelector('.tile-timer'),
      };
    });
    if (this.flash) {
      const [k, id] = this.flash.split(':');
      const el = c.querySelector(`[data-upg][data-kind="${k}"][data-id="${id}"]`);
      if (el) el.closest('.tile').classList.add('flash');
      this.flash = null;
    }
  },

  groupHTML(g, rt) {
    const closed = !!S.ui.collapsed[g.id];
    let body = '', count = '';
    const ids = cat => Object.keys(BUILDINGS).filter(id => BUILDINGS[id].cat === cat);
    const tiles = list => `<div class="tiles">${list.join('')}</div>`;
    switch (g.id) {
      case 'mines': {
        const row = (label, list) => `<div class="tech-row"><div class="tech-row-label">${label}</div>${tiles(list)}</div>`;
        body = row('Mines', ids('mines').filter(id => !BUILDINGS[id].hidden).map(id => this.buildingTile('b', id)))
          + row('Outils · Automatisation', Object.keys(CLICK_TECHS).filter(id => CLICK_TECHS[id].type === 'extraction')
            .sort((a, b) => (a === 'autoBuy') - (b === 'autoBuy')).map(id => this.techTile('c', id)))   // Achat auto à droite
          + row('Stockage', ids('storage').map(id => this.buildingTile('b', id)));
        break;
      }
      case 'moonMines': body = tiles(ids('mines').filter(id => !BUILDINGS[id].hidden).map(id => this.buildingTile('m', id))); break;
      // technologies lunaires + Commerce de la planète mère (niveau commun, payé avec le compteur de la lune)
      case 'moonTech': body = tiles([...Object.keys(MOON_TECHS).map(id => this.techTile('x', id)), this.techTile('c', 'exchanger')]); break;
      case 'click':
        // toutes les technologies sur une seule ligne (dans l'ordre des types)
        body = tiles(TECH_TYPES.flatMap(t => Object.keys(CLICK_TECHS).filter(id => CLICK_TECHS[id].type === t.id)).map(id => this.techTile('c', id)));
        break;
      // Espace galactique : la carte galactique et les destroyers
      case 'galaxy': body = tiles([this.techTile('c', 'gate'), ...Object.keys(SHIPS).filter(id => SHIPS[id].role === 'galaxy').map(id => this.shipTile(id)),
        ...Object.keys(CLICK_TECHS).filter(id => CLICK_TECHS[id].type === 'galaxy').map(id => this.techTile('c', id))]); break;
      case 'buildings': {
        const row = (label, list) => `<div class="tech-row"><div class="tech-row-label">${label}</div>${tiles(list)}</div>`;
        body = row('Chantier spatial', [this.techTile('b', 'shipyard'), ...Object.keys(SHIPS).filter(id => SHIPS[id].role !== 'galaxy').map(id => this.shipTile(id))])
          + row('Terraformage · Exploration', ['terraform', 'hyperspeed'].map(id => this.techTile('c', id)));
        break;
      }
      case 'research': {
        const unlocked = Object.keys(TECHS).filter(id => !G.reqsMissing(TECHS[id].req).length).length;
        count = `${unlocked}/${Object.keys(TECHS).length}`;
        body = tiles(Object.keys(TECHS).map(id => this.techTile('t', id)));
        break;
      }
      case 'exped': {
        const n = Object.keys(S.exped).length;
        count = n ? `${n} en cours` : '';
        body = this.expedHTML();
        break;
      }
      case 'map': count = `${G.mapExploredCount()}/${MAP_SIZE}`; body = this.mapHTML(); break;
      case 'ach': count = `${G.achCount()}/${ACHIEVEMENTS.length}`; body = this.achHTML(); break;
      case 'log':
        body = `<ul class="log">${S.log.slice(0, 20).map(e => `
          <li class="log-${e.type}"><time>${new Date(e.t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time>${esc(e.msg)}</li>`).join('')
          || '<li class="log-empty">Aucun événement pour le moment.</li>'}</ul>`;
        break;
    }
    return `
      <section class="group ${closed ? 'collapsed' : ''}" data-group="${g.id}">
        <button class="group-head" data-action="toggle" data-id="${g.id}" aria-expanded="${!closed}">
          <span class="chev">▾</span>
          <h2>${g.title}</h2>
          ${g.sub ? `<small>${g.sub}</small>` : ''}
          ${count ? `<span class="group-count">${count}</span>` : ''}
        </button>
        <div class="group-body">${body}</div>
      </section>`;
  },

  /* Évolution compacte (à droite du titre) : valeur au niveau suivant + (différence) */
  evo(kind, id, L) {
    const N = L + 1;
    if (kind === 'b' || kind === 'm') {
      if (MINES[id]) {
        const k = G.bonus(MINES[id].res);
        const cur = Math.round(G.mineOutput(id, L) * k), next = Math.round(G.mineOutput(id, N) * k);
        return `<b>${fmtCost(next)}/s</b> ${diff('+' + fmtCost(next - cur))}`;
      }
      if (BUILDINGS[id].cat === 'storage') {
        const cur = G.storageCap(L), next = G.storageCap(N);
        return `<b>${fmtCost(next)}</b> ${diff('+' + fmtCost(next - cur))}`;
      }
      if (id === 'shipyard') {
        const unlock = Object.values(SHIPS).find(d => d.req.buildings.shipyard === N);
        return unlock ? `<b>${unlock.name}</b>` : `<b>−${Math.round((1 - G.shipDiscount(N)) * 100)} %</b> ${diff('−5 %')}`;
      }
      return `<b>Niv. ${N}</b>`;
    }
    if (kind === 't') { const d = TECHS[id]; return `<b>${d.sign}${d.per * N} %</b> ${diff(d.sign + d.per)}`; }
    if (kind === 'x') {
      const cur = G.cargoCap(L), next = G.cargoCap(N);
      return `<b>${fmtCost(next)}</b> ${diff('+' + fmtCost(next - cur))}`;
    }
    switch (id) {
      case 'pickFerrite': return `<b>+${G.ferritePerClick(N)}</b> ${diff('+3')}`;
      case 'pickDeut': return `<b>+${G.deutPerClick(N)}</b> ${diff('+2')}`;
      case 'robot': return `<b>${this.fmtFreq(G.robotRate(N))}</b>`;
      case 'autoBuy': return `<b>${N}/${CLICK_TECHS.autoBuy.max}</b>`;
      case 'autoTrade': return '<b>3:1</b>';
      case 'xferDeut': case 'xferDark': return `<b>${fmtCost(G.xferBatch(N))} u</b> ${diff(this.fmtRatio(G.xferRatio(N)))}`;
      case 'exchanger': {
        // ratio / volume échangé actuel (à droite du titre)
        return `<b title="Unités échangées au maximum">${fmtCost(G.xferBatch(L))}</b>`;
      }
      case 'terraform': return `<b>${N}/${G.MAX_MOONS}</b> ${diff('+1 lune')}`;
      case 'gate': return '<b>Carte</b>';
      case 'hyperspeed': { const a = G.expedDuration('voyage', L), b = G.expedDuration('voyage', N); return `<b>${fmtRate(b)} s</b> ${diff('−' + (a - b).toFixed(1).replace('.', ',') + ' s')}`; }
      case 'armor': return `<b>${Math.round(G.armorShare(N) * 100)} %</b> ${diff('+5 %')}`;
      case 'peace': return `<b>−${Math.round((1 - G.peaceFactor(N)) * 100)} %</b>`;
    }
    return '';
  },

  /* « 3 ferrite → 1 deutérium » : ratio affiché sur le bouton d'échange */
  swapLabel(a, b) {
    const steps = RES_KEYS.indexOf(b) - RES_KEYS.indexOf(a), k = Math.pow(G.EXCHANGE_RATIO, Math.abs(steps));
    const n = v => v === 1 ? '' : v;   // ratio 1 : pas de chiffre
    return `${n(steps > 0 ? k : 1)}${resIcon(a)}<span class="arrow">→</span>${n(steps > 0 ? 1 : k)}${resIcon(b)}`;
  },

  fmtRatio(r) { return `${r.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')}:1`; },

  fmtFreq(r) {
    return r < 1 ? `1/${(1 / r).toFixed(1).replace('.', ',')} s` : `${r.toFixed(1).replace('.', ',')}/s`;
  },

  /* Bouton AUTO (achat automatique) sur les tuiles de bâtiments débloqués */
  autoToggleHTML(id) {
    if (!G.autoUnlocked(id)) return '';
    const on = !!S.auto[id], max = S.auto[id] === 'max';
    const tip = max ? 'construit le plus grand nombre possible' : on ? (SHIPS[id] ? 'activé (×1, ×10 ou ×100)' : 'activé') : 'désactivé';
    return `<button class="auto-tg ${on ? 'on' : ''} ${max ? 'max' : ''}" data-action="auto" data-id="${id}" title="Achat automatique : ${tip}">${max ? 'MAX' : 'AUTO'}</button>`;
  },

  /* Structure commune de toutes les tuiles */
  tile({ kind, id, def, L, art, title, evo, extra = '', action, label, cost, locked, maxed, cls = '', titleAttr, artInfo = '', badge, buttons, costPrefix = '' }) {
    return `
      <div class="tile ${locked ? 'locked' : ''} ${cls}" data-upg data-kind="${kind}" data-id="${id}" style="--c:${def.color}" title="${esc(titleAttr || `${def.name} — ${def.desc}`)}">
        <div class="tile-art ${art.icon ? 'icon' : ''}">${art.html}<span class="tile-lvl">${badge || `Niv. ${L}`}</span>${'bcts'.includes(kind) ? this.autoToggleHTML(id) : ''}${artInfo}${maxed ? '' : artCosts(kind, id, cost, 'left', costPrefix)}</div>
        <div class="tile-info">
          <div class="tile-row"><h3>${title}</h3><span class="tile-gain">${maxed ? '<b>MAX</b>' : evo}</span></div>
          ${extra}
          ${buttons || upBtn(action, id, label, maxed ? 'Niveau max' : locked ? 'Verrouillé' : '')}
        </div>
      </div>`;
  },

  /* Mines, mines lunaires et entrepôts : tuile illustrée */
  buildingTile(kind, id) {
    const def = BUILDINGS[id], L = G.levels(kind)[id];
    return this.tile({
      kind, id, def, L,
      art: { html: MINE_ART[id] || STORE_ART[id] },
      title: def.short, evo: this.evo(kind, id, L),
      action: kind === 'm' ? 'moonbuild' : 'build', label: 'Upgrade',
      cost: G.costOf(kind, id, L + 1),
      cls: kind === 'm' ? 'moon-tile' : '',
      titleAttr: `${kind === 'm' ? `${G.curMoon().name} · ` : ''}${def.name} — ${def.desc}`,
    });
  },

  /* Installations, recherches, technologies, technologies lunaires : tuile à icône */
  techTile(kind, id) {
    if (id === 'jackpot') return this.casinoTileHTML();
    if (id === 'pickFerrite') return this.pickTileHTML();
    if (id === 'pickDeut') return '';
    const def = G.defOf(kind, id), L = G.levels(kind)[id];
    const miss = G.reqsMissing(def.req, def.reqClick);
    const maxed = !!(def.max && L >= def.max);
    const action = { b: 'build', t: 'research', c: 'clickup', x: 'moontech' }[kind];
    let extra = '';
    if (miss.length) extra += `<div class="tile-req">🔒 ${miss.join(' · ')}</div>`;
    let artInfo = '', costPrefix = '';
    if (kind === 'c' && def.from && L > 0) {
      const b = G.xferBatch(L), ratio = G.xferRatio(L);
      const nf = RESOURCES[def.from].name.toLowerCase(), nt = RESOURCES[def.to].name.toLowerCase();
      artInfo = `<div class="art-info">${fmtCost(b)} u · ${this.fmtRatio(ratio)}</div>`;
      extra += `<div class="xfer">
        <button class="btn mini" data-action="xfer" data-id="${id}:fwd" title="Donner ${fmtCost(b * ratio)} ${nf} → recevoir ${fmtCost(b)} ${nt}">${resIcon(def.from)}</button>
        <button class="btn mini" data-action="xfer" data-id="${id}:back" title="Donner ${fmtCost(b)} ${nt} → recevoir ${fmtCost(b * ratio)} ${nf}">${resIcon(def.to)}</button>
      </div>`;
    }
    if (id === 'exchanger') {
      // de haut en bas : unités échangées, ratio, prix
      // ratio et volume affichés à droite du titre : plus de pastilles sur l'image
      const E = G.exchangeEffLevel(L);
      if (L > 0) {
        // deux ratios : vers le matériau plus précieux, et retour vers le moins précieux
        // quantité échangée affichée à côté du ratio (au-dessus du prix)
      }
      extra += `<div class="swap-grid">${EXCHANGE_PAIRS.map(([a, b], k) => k < L
        ? `<button class="btn mini" data-action="swap" data-id="${a}:${b}" title="${RESOURCES[a].name} → ${RESOURCES[b].name}">${this.swapLabel(a, b)}</button>`
        : `<button class="btn mini locked" disabled title="Débloqué au niveau ${k + 1}">🔒 ${this.swapLabel(a, b)}</button>`).join('')}</div>`;
    }
    if (id === 'autoBuy') {
      if (!maxed) extra += `<div class="tile-note">Ajoute : <b>${AUTO_UNLOCKS[L].label}</b></div>`;
      if (L > 0) extra += `<div class="tile-note">Activez <b>AUTO</b> sur les tuiles</div>`;
      if (G.autoUnlocked('lowest')) extra += `<button class="btn mini ${S.auto.lowest ? 'on' : 'off'}" data-action="auto" data-id="lowest">Mine la plus basse : ${S.auto.lowest ? 'ON' : 'OFF'}</button>`;
    }
    if (id === 'autoTrade') {
      if (L > 0) extra += `<button class="btn mini ${G.autoTradeOn() ? 'on' : 'off'}" data-action="autotrade">Conversion : ${G.autoTradeOn() ? 'ON' : 'OFF'}</button>`;
      else extra += `<div class="tile-note">Convertit les matériaux pour les améliorations</div>`;
    }
    if (id === 'armor') extra += `<div class="tile-note">Protège des vaisseaux contre la destruction</div>`;
    if (id === 'hyperspeed') extra += `<div class="tile-note">Expéditions : ${G.expedDuration('voyage', L).toFixed(1).replace('.', ',')} s</div>`;
    if (id === 'gate') extra += `<div class="tile-note">${L ? 'Carte galactique ouverte' : 'Ouvre la carte galactique et l\'exploration'}</div>`;
    if (id === 'peace') extra += `<div class="tile-note">Moins de <b>rébellions</b> et d'<b>hyperinflation</b>, plus de calme</div>`;
    if (id === 'cargo') {
      const on = G.curMoon().cargoOn;
      extra += `<div class="tile-timer">${L > 0 ? '' : 'Envoie le stock vers la planète toutes les 30 s'}</div>`;
      if (L > 0) extra += `<button class="btn mini ${on ? 'on' : 'off'}" data-action="cargotoggle">Envois auto : ${on ? 'ON' : 'OFF'}</button>`;
    }
    return this.tile({
      kind, id, def, L,
      art: STORE_ART[id] ? { html: STORE_ART[id] } : { icon: true, html: ICONS[def.icon] },
      title: def.short || def.name, evo: this.evo(kind, id, L), extra,
      action, label: kind === 't' ? 'Rechercher' : 'Upgrade',
      cost: G.costOf(kind, id, L + 1), locked: miss.length > 0, maxed, artInfo, costPrefix,
    });
  },

  /* Vaisseau : tuile de construction (coût fixe, compteur ×N) */
  shipTile(id) {
    const def = SHIPS[id], n = S.fleet[id];
    const miss = G.reqsMissing(def.req);
    return this.tile({
      kind: 's', id, def, L: n,
      art: { icon: true, html: ICONS[def.icon] },
      badge: `×${n}`,
      title: def.short || def.name, evo: def.role === 'defense' ? `<b>⚔ ${def.atk}</b>` : def.role === 'explore' ? `<b>🔭 ${def.explore}</b>` : '<b>🌌</b>',
      extra: (miss.length ? `<div class="tile-req">🔒 ${miss.join(' · ')}</div>` : '')
        + `<div class="tile-note">${def.role === 'defense' ? 'Défense de la planète' : def.role === 'explore' ? 'Expéditions' : 'Conquête de la galaxie'}</div>`,
      buttons: `<div class="split-btn"><div class="split-halves three">${[1, 10, 100].map(k =>
        `<button class="btn btn-ship" data-action="ship" data-id="${id}:${k}" title="Construire ${k} × ${def.name}">×${k}</button>`).join('')}</div></div>`,
      cost: G.costOf('s', id, 1), locked: miss.length > 0,
    });
  },

  /* Tuile Pioche : ferrite et deutérium par clic, bouton coupé en deux (logos) */
  pickTileHTML() {
    const F = S.click.pickFerrite, D = S.click.pickDeut, A = '<span class="arrow">→</span>';
    return `
      <div class="tile casino pick-tile" style="--c:${RESOURCES.ferrite.color}" title="Pioche — plus de ferrite et de deutérium à chaque clic">
        <div class="tile-art icon">${ICONS.pick}<span class="tile-lvl">Niv. ${F + D}</span>${this.autoToggleHTML('pick')}
          ${artCosts('c', 'pickFerrite', G.costOf('c', 'pickFerrite', F + 1), 'left')}
          ${artCosts('c', 'pickDeut', G.costOf('c', 'pickDeut', D + 1), 'right')}
        </div>
        <div class="tile-info">
          <h3>Pioche</h3>
          <div class="tile-row"><span class="tile-note">${resIcon('ferrite')}niv. ${F}</span><span class="tile-gain">+${G.ferritePerClick(F)} ${A} <b>+${G.ferritePerClick(F + 1)}</b></span></div>
          <div class="tile-row"><span class="tile-note">${resIcon('deuterium')}niv. ${D}</span><span class="tile-gain">+${G.deutPerClick(D)} ${A} <b>+${G.deutPerClick(D + 1)}</b></span></div>
          <div class="split-btn">
            <div class="split-top">Upgrade</div>
            <div class="split-halves">
              <button class="btn btn-up" data-upg data-kind="c" data-id="pickFerrite" data-action="clickup" title="Améliorer la pioche à ferrite">${resIcon('ferrite')}</button>
              <button class="btn btn-up" data-upg data-kind="c" data-id="pickDeut" data-action="clickup" title="Améliorer la pioche à deutérium">${resIcon('deuterium')}</button>
            </div>
          </div>
        </div>
      </div>`;
  },

  /* Tuile Accélérateur de particules : capital (montant) et espérance (chance de succès) */
  casinoTileHTML() {
    const def = CLICK_TECHS.jackpot, L = S.click.jackpot, C = S.click.casinoLuck;
    const pct = x => `${Math.round(x * 100)} %`;
    const luckMax = C >= CLICK_TECHS.casinoLuck.max;
    return `
      <div class="tile casino" style="--c:${def.color}" title="${esc(`${def.name} — ${def.desc}`)}">
        <div class="tile-art icon">${ICONS[def.icon]}<span class="tile-lvl">Niv. ${L}</span>${this.autoToggleHTML('trading')}
          ${artCosts('c', 'jackpot', G.costOf('c', 'jackpot', L + 1), 'left')}
          ${luckMax ? '' : artCosts('c', 'casinoLuck', G.costOf('c', 'casinoLuck', C + 1), 'right')}
        </div>
        <div class="tile-info">
          <h3>${def.short}</h3>
          ${L > 0 ? '<div class="jp-timer"></div>' : '<div class="tile-note">Une collision toutes les 10 s</div>'}
          <div class="tile-row"><span class="tile-note">Puissance</span><span class="tile-gain"><b>${fmtCost(G.jackpotAvg(L + 1))}</b> ${diff('+' + fmtCost(G.jackpotAvg(L + 1) - G.jackpotAvg(L)))}</span></div>
          <div class="tile-row"><span class="tile-note">Espérance</span><span class="tile-gain">${luckMax ? `<b>${pct(G.casinoChance())}</b> MAX` : `<b>${pct(G.casinoChance(C + 1))}</b> ${diff('+5 %')}`}</span></div>
          <div class="split-btn">
            <div class="split-top">Upgrade</div>
            <div class="split-halves">
              <button class="btn btn-up" data-upg data-kind="c" data-id="jackpot" data-action="clickup">Puissance</button>
              <button class="btn btn-up" data-upg data-kind="c" data-id="casinoLuck" data-action="clickup">${luckMax ? 'Max' : 'Espérance'}</button>
            </div>
          </div>
        </div>
      </div>`;
  },

  updateCards() {
    if (!this.cards) return;
    for (const c of this.cards) {
      const chk = G.check(c.kind, c.id);
      const w = G.wallet(c.kind, c.id);
      for (const el of c.costs) el.classList.toggle('missing', w[el.dataset.res] < +el.dataset.amt);
      if (c.btn) {
        c.btn.disabled = !chk.ok;
        // bulle d'aide : pourquoi le bouton est grisé
        const why = chk.ok ? '' : chk.code === 'money' ? 'Ressources insuffisantes' : (chk.msg || chk.label || '');
        if (c.btn.title !== why) c.btn.title = why;
      }
      for (const b of c.ships) { const [sid, n] = b.dataset.id.split(':'); b.disabled = !G.canBuildShips(sid, +n); }
      for (const b of c.swaps || []) { const [a, z] = b.dataset.id.split(':'); b.disabled = G.exchangeQuote(a, z).n < 1; }
      for (const b of c.xfers) { const [tid, dir] = b.dataset.id.split(':'); b.disabled = G.xferAmount(tid, dir) < 1; }
      if (c.timer && c.id === 'cargo' && G.curMoon().tech.cargo > 0) c.timer.textContent = G.curMoon().cargoOn ? `Prochain envoi : ${Math.ceil(G.cargoIn(G.moonIdx()))} s` : 'Envois automatiques en pause';
    }
    document.querySelectorAll('[data-fx]').forEach(el => { el.textContent = `${Math.ceil(G.fxLeft(el.dataset.fx))} s`; });
    if (S.map && S.click.gate > 0) {
      const left = Math.max(0, G.MAP_TICK - (S.map.t || 0));
      document.querySelectorAll('.map-timer').forEach(e => { e.textContent = `${Math.ceil(left)} s`; });
      const mb = document.querySelector('.map-bar'); if (mb) mb.style.width = `${(1 - left / G.MAP_TICK) * 100}%`;
    }
    const cc = document.getElementById('clickCount');
    if (cc) cc.textContent = `⛏ ${fmt(S.stats.clicks || 0)}`;   // clics de minage
    const clk = document.getElementById('gameClock');
    if (clk) { const T = Math.floor(S.stats.playTime || 0), h = Math.floor(T / 3600), m = Math.floor(T / 60) % 60, s = T % 60;
      clk.textContent = `⏱ ${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(s).padStart(2, '0')}`; }
    const rt2 = document.querySelector('.raid-timer');
    if (rt2) rt2.textContent = `${Math.ceil(G.raidIn())} s`;
    const bar = document.querySelector('.th-bar i:not(.map-bar)');
    if (bar) bar.style.width = `${(1 - G.raidIn() / G.RAID_PERIOD) * 100}%`;
    this.updateTimers();
    const jp = document.querySelector('.jp-timer');
    if (jp) jp.textContent = `Prochaine collision : ${Math.ceil(G.jackpotIn())} s`;
  },

  /* ---------- Panneau gauche : planète ou lune ---------- */
  renderPlanetInfo(rt) {
    const moon = this.viewKind() === 'm', i = G.moonIdx();
    const tr = this.body().traits;
    $('#planetName').textContent = moon ? `Lune ${S.moons[i].name}` : S.planet.name;
    $('#planetSub').textContent = moon
      ? `Lune ${tr.type.toLowerCase()} de ${S.planet.name} · ${fmt(tr.diameter)} km · ${tr.tmin} °C à ${tr.tmax} °C`
      : `${tr.type} · ${fmt(tr.diameter)} km · ${tr.tmin} °C à ${tr.tmax} °C`;
    const gate = S.click.gate > 0;
    // à l'ouverture de la carte galactique, elle s'affiche d'office à la place de la planète
    if (gate && !S.ui.galaxySeen) { S.ui.galaxySeen = true; S.ui.galaxy = true; }
    const gal = gate && !!S.ui.galaxy;
    $('#bodyTabs').innerHTML = S.moons.length || gate ? `<button class="${moon || gal ? '' : 'on'}" data-action="view" data-id="planet">Planète</button>` +
      S.moons.map((m, k) => `<button class="${i === k && !gal ? 'on' : ''}" data-action="view" data-id="${k}">${esc(m.name)}</button>`).join('')
      + (gate ? `<button class="${gal ? 'on' : ''}" data-action="view" data-id="galaxy">🌌 Galaxie</button>` : '') : '';
    $('#planetWrap').style.display = gal ? 'none' : '';
    // onglet Galaxie : le bloc planète (nom, description) est masqué
    $('.planet-head').style.display = gal ? 'none' : '';
    $('#planetSub').style.display = gal ? 'none' : '';
    $('.planet-head [data-action="rename"]').hidden = moon;
    this.renderFleet();
    this.renderThreats();
    $('#mapPanel').innerHTML = gal ? `
      <div class="fleet-head"><span>Carte galactique</span><span class="fl-total">${G.mapExploredCount()}/${MAP_SIZE} systèmes</span></div>${this.mapHTML()}` : '';
    $('#achPanel').innerHTML = `
      <div class="fleet-head"><span>Succès</span><span class="fl-total">${G.achCount()}/${G.achTotal()} paliers · +${G.achCount()} % production</span></div>${this.achHTML()}`;
  },

  /* Liste des vaisseaux construits, sous la planète */
  renderFleet() {
    const el = $('#fleet');
    // la flotte affichée inclut les vaisseaux en expédition ; la mention se place sous le nom du vaisseau
    const nextReturn = Object.keys(S.exped).length ? Math.min(...Object.values(S.exped).map(e => e.end)) : 0;
    // tous les types de vaisseaux sont affichés, même à 0
    const gal = S.ui.galaxy && S.click.gate > 0;
    if (gal) { el.innerHTML = ''; return; }   // onglet Galaxie : ni flotte ni historique sous la carte
    const rows = Object.keys(SHIPS).filter(id => gal ? SHIPS[id].role === 'galaxy' : true).map(id => {
      const d = SHIPS[id];
      const away = G.fleetTotal(id) - S.fleet[id];
      const badge = '';   // le retour d'expédition s'affiche en message flottant au-dessus du logo
      // les explorers partent en expédition automatiquement : nom + secondes avant leur retour
      const name = away > 0 ? `${d.short || d.name} <span class="away-left" data-end="${nextReturn}"></span>` : (d.short || d.name);
      return `<li data-ship="${id}" class="${G.fleetTotal(id) ? '' : 'zero'}" style="--c:${d.color}" title="${d.name}${d.role === 'defense' ? ` · ⚔ ${d.atk} chacun` : d.role === 'explore' ? ` · 🔭 ${d.explore} chacun` : ' · carte galactique'}"><span class="fl-top"><span class="fl-ico">${ICONS[d.icon]}</span><span class="fl-n">×${fmtCost(G.fleetTotal(id))}</span></span><span class="fl-name">${name}</span>${badge}</li>`;
    }).join('');
    const hist = gal ? `<li class="fl-losses">${(S.stats.lossLog || []).filter(e => !/pirate/i.test(e.txt)).length
      ? `<ol>${S.stats.lossLog.filter(e => !/pirate/i.test(e.txt)).slice(0, 3).map(e => `<li class="${e.win ? 'win' : 'lose'}"><b>−${fmtCost(e.n)}</b> ${esc(e.txt)}</li>`).join('')}</ol>`
      : '<span class="muted">Aucune perte de destroyers</span>'}</li>` : '';
    el.innerHTML = `<ul>${rows}${hist}</ul>`;
  },

  /* Vagues pirates à venir (une toutes les 30 s) et dernier combat */
  renderThreats() {
    // onglet Galaxie : le tableau liste les planètes des clans concurrents
    if (S.ui.galaxy && S.click.gate > 0) { $('#threats').innerHTML = ''; return; }   // onglet Galaxie : pas de tableau
    const P = G.fleetPower();
    let w = S.raid.wave;
    const rows = this.currentEventRow() + [0, 1, 2, 3].map(k => {
      const when = `<span class="th-when">${k === 0 ? '<b class="raid-timer"></b>' : `+${k * G.RAID_PERIOD} s`}</span>`;
      const ev = G.plannedEvent(S.raid.step + k), prob = '';
      if (ev.id === 'boss') {
        const E = ev.E != null ? ev.E : G.bossPower(w), ok = P >= E && P > 0;
        return `<li class="boss ${ok ? 'ok' : 'ko'} ${k === 0 ? 'next' : ''}" style="--c:${EVENTS.boss.color}" title="${esc(EVENTS.boss.desc)}">
          <span class="th-name">☠ Chef pirate ${prob}</span>
          <span class="th-pow">⚔ ${fmtCost(E)}</span>${when}</li>`;
      }
      if (ev.id !== 'pirates') {
        const d = EVENTS[ev.id];
        return `<li class="evt ${d.kind} ${k === 0 ? 'next' : ''}" style="--c:${d.color}" title="${esc(d.desc)}">
          <span class="th-name">${ev.via ? '📡 ' : ''}${d.name} ${prob}</span>
          <span class="th-pow">${ev.id === 'tax' && ev.rate ? `−${Math.round(ev.rate * 100)} %` : d.effect}</span>${when}</li>`;
      }
      const t = G.waveTier(w), E = ev.E != null ? ev.E : G.wavePower(w), ok = P >= E && P > 0;
      const row = `<li class="${ok ? 'ok' : 'ko'} ${k === 0 ? 'next' : ''}" style="--c:${t.color}" title="${esc(EVENTS.pirates.desc)}">
        <span class="th-name">Pirate <span class="th-wave">vague ${w}</span>${prob}</span>
        <span class="th-pow">⚔ ${fmtCost(E)}</span>${when}</li>`;
      w++;
      return row;
    }).join('');
    const L = S.raid.last;
    let last = '';
    if (L && L.type === 'event') {
      const d = EVENTS[L.id];
      last = `<div class="th-last evt" style="--c:${d.color}"><b>${L.via ? 'Signal inconnu → ' : ''}${d.name}</b> · ${this.eventDetails(L)}</div>`;
    } else if (L) {
      const lost = Object.keys(SHIPS).filter(id => L.lost[id]).map(id => `−${L.lost[id]} ${SHIPS[id].name.toLowerCase()}`).join(', ');
      const res = L.win ? this.gainsHTML(L.salvage) : RES_KEYS.filter(r => L.stolen[r] >= 0.5)
        .map(r => `<span style="color:${RESOURCES[r].color}">−${fmtCost(L.stolen[r])}</span>`).join(' ');
      last = `<div class="th-last ${L.win ? 'win' : 'lose'}"><b>${L.win ? 'Victoire' : 'Défaite'}</b> · ${L.boss ? '☠ chef pirate' : `vague ${L.w}`}${L.boss && L.win ? ' · <span class="trophy">🏆 trophée</span>' : ''}
        ${res ? ` · ${L.win ? 'butin' : 'pillé'} ${res}` : ''}${lost ? ` · <span class="th-lost">${lost}</span>` : ''}</div>`;
    }
    $('#threats').innerHTML = `
      <div class="fleet-head"><span>Événements</span><span class="fl-total">${S.raid.trophies ? `<span class="trophy" title="Trophées de chefs pirates : +3 % de toute production chacun">🏆 ${S.raid.trophies} (+${3 * S.raid.trophies} %)</span> · ` : ''}Votre flotte : ⚔ ${fmtCost(P)}</span></div>
      <div class="th-bar"><i></i></div>
      <ul class="th-list">${rows}</ul>${this.artifactsHTML()}
      <div class="th-probs"><span class="th-probs-t">Probabilités</span>${(pr => Object.keys(EVENTS).filter(id => pr[id] != null).map(id => [id, pr[id]]))(G.eventProbs()).map(([id, p]) =>
        `<span class="th-pchip" style="--c:${EVENTS[id].color}" title="${esc(EVENTS[id].desc)}">${EVENTS[id].name} <b>${Math.round(p * 100)} %</b></span>`).join('')}</div>`;
  },

  /* Onglet Galaxie : attaques des clans annoncées pour le prochain tour */
  attacksHTML() {
    G.mapInit();
    const M = G.map(), m = S.map, P = G.mapReserve();
    if (!m.plan) m.plan = G.mapPlan();
    const owner = i => m.owner[i] === 'player' ? '#4fc3ff' : CLANS[m.owner[i]].color;   // couleur du propriétaire
    const nm = i => `<b style="color:${owner(i)}">${esc(M.nodes[i].name)}</b>`;
    // vos assauts : destroyers postés sur des planètes ennemies
    const mine = m.owner.map((o, i) => i).filter(i => m.owner[i] !== 'player' && G.mapDep(i) > 0).map(i => {
      const F = G.mapDep(i), go = F > m.garrison[i], pct = Math.round(G.mapWinChance(F, m.garrison[i]) * 100);
      return `<li class="atk yours ${go ? 'ok' : 'wait'}" style="--c:#4fc3ff" data-action="mapsel" data-id="${i}">
        <span class="th-name"><b style="color:#4fc3ff">Vous</b> <span class="atk-arrow">→</span> ${nm(i)} <small class="rv-clan">×${fmtCost(G.mapEnemy(i))}</small></span>
        <span class="th-pow">×${fmtCost(F)}</span>
        <span class="th-when">${go ? `<small>${pct} %</small> <b class="map-timer"></b>` : '<small>en attente</small>'}</span></li>`;
    }).join('');
    const rows = mine + m.plan.filter(p => m.owner[p.from] === p.clan && m.owner[p.to] !== p.clan).map(p => {
      const c = CLANS[p.clan], F = G.planForce(p), vsYou = m.owner[p.to] === 'player';
      const def = G.mapDefense(p.to);
      const res = vsYou ? (G.mapWinChance(F, def) > 0.5 ? 'ko' : 'ok') : '';   // vert si vous avez plus d'une chance sur deux de tenir
      return `<li class="atk ${vsYou ? 'vs-you ' + res : ''}" style="--c:${c.color}" data-action="mapsel" data-id="${p.to}" title="${esc(`${c.name} : ${M.nodes[p.from].name} → ${M.nodes[p.to].name}`)}">
        <span class="th-name">${nm(p.from)} <span class="atk-arrow">→</span> ${nm(p.to)}</span>
        <span class="th-pow enemy-pow">×${fmtCost(F)}</span>
        <span class="th-when"><b class="map-timer"></b></span></li>`;
    }).join('');
    return `<div class="fleet-head"><span>Attaques à venir</span><span class="fl-total">Réserve : ×${fmtCost(P)} destroyers</span></div>
      <div class="th-bar"><i class="map-bar"></i></div>
      <ul class="th-list">${rows || '<li class="muted" style="--c:#3a4a62">Aucune attaque annoncée · prochain tour dans <b class="map-timer"></b></li>'}</ul>`;
  },

  /* Ligne « en cours » : dernier événement survenu, mêmes colonnes que les suivantes */
  currentEventRow() {
    const L = S.raid.last;
    if (!L) return '';
    const FX = { hyperinflation: 'inflation', rush: 'rush', iceAge: 'ice', calm: 'forest' };
    let name, eff, color, cls = '';
    if (L.type === 'raid') {
      name = L.boss ? '☠ Chef pirate' : `Pirate <span class="th-wave">vague ${L.w}</span>`;
      eff = L.win ? 'Victoire' : 'Défaite';
      color = L.win ? '#5fd38d' : '#ff5d5d';
      cls = L.win ? 'ok' : 'ko';
    } else {
      const d = EVENTS[L.id];
      name = `${L.via ? '📡 ' : ''}${d.name}`;
      eff = L.id === 'tax' && L.note ? L.note.replace('taux ', '−') : d.effect;
      color = d.color; cls = 'evt ' + d.kind;
    }
    const fx = L.type === 'event' && FX[L.id] && G.fxActive(FX[L.id]) ? FX[L.id] : null;
    const when = fx ? `<b data-fx="${fx}"></b>` : 'en cours';
    return `<li class="current ${cls}" style="--c:${color}"><span class="th-name">${name}</span>
      <span class="th-pow">${eff}</span><span class="th-when">${when}</span></li>`;
  },

  /* Artefacts possédés : une rangée de pastilles (effet au survol) */
  artifactsHTML() {
    // du moins rare au plus rare (seuil de points croissant)
    const owned = Object.keys(ARTIFACTS).filter(id => G.art(id) > 0).sort((a, b) => ARTIFACTS[a].pts - ARTIFACTS[b].pts);
    const items = owned.map(id => {
      const a = ARTIFACTS[id], n = G.art(id), R = ARTIFACT_RARITY[a.rarity];
      return `<span class="arti r-${a.rarity}" style="--c:${R.color}" title="${esc([a.name, `Rareté : ${R.name}`, `Effet : ${a.effect(n)}`].join('\n'))}">${a.icon}<b>×${fmtCount(n)}</b></span>`;
    }).join('');
    return `<div class="fleet-head arti-title"><span>Artefacts aliens</span></div><div class="arti-row">${items || '<span class="muted arti-none">Aucun : envoyez des explorers en expédition</span>'}</div>`;
  },

  /* Attaque pirate : combat, pertes, pillage */
  raid(via, boss = false) {
    const r = G.raid(boss);
    this.planet.bump(boss ? 3 : r.win ? 0.8 : 2);
    // victoire : bouclier champ de force ; défaite : explosions sur la planète
    if (r.win) this.planet.shield();
    else this.planet.explode(boss ? 20 : 12, 'planet');
    const lostN = Object.values(r.lost).reduce((a, b) => a + b, 0);
    const html = `<em class="jp raidt">${via ? '📡 Signal inconnu → ' : boss ? '☠ ' : '⚠ '}${boss ? 'Chef pirate' : `Vague ${r.w}`} · ${r.win ? 'Victoire' : 'Défaite'}</em>`
      + (boss && r.win ? '<span class="trophy">🏆 Trophée : +3 % de production</span><br>' : '')
      + (r.win ? (this.gainsHTML(r.salvage) || '') : RES_KEYS.filter(k => r.stolen[k] >= 0.5).map(k => `<span style="color:#ff8a8a">−${fmtCost(r.stolen[k])}</span>`).join(' '))
      + (lostN ? ` <span class="muted">· −${lostN} vaisseau${lostN > 1 ? 'x' : ''}</span>` : '');
    // résultat du combat : au-dessus du logo des destroyers
    if (!(S.ui.galaxy && S.click.gate > 0)) this.floatOverShip('destroyer', html, r.win ? 'win' : 'lose');   // pas de message sur l'onglet Galaxie
    G.rev++;
    this.update(true);
  },

  /* Résumé d'un événement (gains, pertes, effet) */
  eventDetails(L) {
    const out = [];
    if (L.resGain) out.push(RES_KEYS.filter(r => L.resGain[r] >= 0.5).map(r => `<span style="color:${RESOURCES[r].color}">+${fmtCost(L.resGain[r])}</span>`).join(' '));
    if (L.resLost) out.push(RES_KEYS.filter(r => L.resLost[r] >= 0.5).map(r => `<span style="color:#ff8a8a">−${fmtCost(L.resLost[r])}</span>`).join(' '));
    if (L.shipsLost) out.push(Object.keys(SHIPS).filter(id => L.shipsLost[id]).map(id => `−${L.shipsLost[id]} ${SHIPS[id].name.toLowerCase()}`).join(', '));
    if (L.note) out.push(L.note);
    return out.filter(Boolean).join(' · ') || 'sans effet';
  },

  /* Événement spécial (hyperinflation, rébellion, ruée minière, subvention, impôt, signal inconnu) */
  event(id, via, opts) {
    // impôt galactique : le vaisseau collecteur arrive d'abord ; le montant est calculé et
    // prélevé seulement quand il est en place au-dessus de la planète et allume son faisceau
    if (id === 'tax') {
      S.raid.step++;                         // le créneau est consommé tout de suite
      this.planet.taxShip();
      G.rev++; this.update(true);
      setTimeout(() => this.applyEvent(id, via, opts, true), this.planet.TAX_ARRIVE_MS);
      return;
    }
    this.applyEvent(id, via, opts);
  },

  applyEvent(id, via, opts, skipStep = false) {
    const r = G.runEvent(id, via, opts, skipStep), d = EVENTS[r.id];
    this.planet.bump(d.kind === 'pos' ? 0.6 : 1);
    if (r.id === 'rebellion') this.planet.burn(10000);
    const title = `${r.via ? '📡 Signal inconnu → ' : ''}${d.name}`;
    if (this.viewKind() === 'b') this.banner(`<em class="jp raidt" style="color:${d.color}">${title}</em>${this.eventDetails(r)}`, 'evt ' + d.kind);
    G.rev++;
    this.update(true);
  },

  /* Message au-dessus de la planète (combat, impôt) : reste affiché plusieurs secondes */
  banner(html, cls) {
    const size = $('#planetWrap').clientWidth;
    document.querySelectorAll('.floater.raid-float').forEach(e => e.remove());
    const f = this.floater(size / 2, size * 0.06, html, 'raid-float ' + cls, 6500);
    f.style.setProperty('--dx', '0px');
  },

  hint(rt) {
    const b = S.buildings, c = S.click;
    if (b.mineFerrite < 1) return "Vos mines sont à l'arrêt : <b>cliquez sur la planète</b> pour extraire du ferrite, puis construisez une <b>Mine de Ferrite</b>.";
    if (b.mineDeuterium < 1) return "Construisez un <b>Extracteur de Deutérium</b> pour produire du deutérium en continu.";
    const empty = S.moons.findIndex(m => Object.values(m.mines).every(l => l === 0));
    if (empty >= 0) return `La lune <b>${esc(S.moons[empty].name)}</b> est prête : ouvrez son onglet (sous le nom de la planète) pour la coloniser.`;
    const full = RES_KEYS.find(r => S.res[r] >= rt.caps[r]);
    if (full) return `Votre stock de <b>${RESOURCES[full].name.toLowerCase()}</b> est plein : agrandissez l'entrepôt correspondant.`;
    if (c.exchanger < 1) return "Le <b>Commerce</b> (Extraction › Outils · Accélérateur) convertit vos matériaux entre eux.";
    if (c.autoBuy < 1) return "L'<b>Achat Automatique</b> améliore vos bâtiments dès que les matériaux sont disponibles.";
    if (c.jackpot < 1) return "L'<b>Accélérateur de particules</b> produit de la matière noire toutes les 10 secondes.";
    if (c.terraform < 1) return "Le <b>Terraformage</b> crée une lune que vous pourrez coloniser.";
    if (b.shipyard < 1 && c.jackpot >= 1) return "Construisez l'<b>Usine Spatiale</b> (Espace orbital › Chantier spatial) pour bâtir votre flotte et repousser les pirates.";
    if (b.shipyard >= 1 && G.fleetPower() < G.wavePower(S.raid.wave)) return `La prochaine vague pirate (⚔ ${fmtCost(G.wavePower(S.raid.wave))}) est plus forte que votre flotte : construisez des vaisseaux.`;
    return "Continuez à cliquer et à améliorer vos mines : chaque niveau accélère votre colonie !";
  },

  moonHint() {
    const m = G.curMoon();
    if (Object.values(m.mines).every(l => l === 0)) return "Cette lune a son propre compteur : <b>cliquez sur la lune</b> pour extraire du ferrite, puis construisez vos premières mines lunaires.";
    if (m.tech.cargo < 1) return "Accumulez de la matière noire lunaire pour construire l'<b>Ascenseur Gravitationnel</b> : il enverra le stock de la lune vers la planète.";
    return `L'ascenseur envoie jusqu'à <b>${fmtCost(G.cargoCap(m.tech.cargo))}</b> de chaque matériau vers la planète toutes les 30 s.`;
  },

  optionsHTML() {
    const played = (Date.now() - S.created) / 1000;
    return `
      <h2>Options</h2>
      <p class="muted">Partie sauvegardée automatiquement dans ce navigateur. Vos mines produisent même jeu fermé (jusqu'à 7 jours).<br>
      Clics : <b>${fmt(S.stats.clicks)}</b> · Temps de jeu : <b>${fmtTime(played)}</b></p>
      <div class="row-btns">
        <button class="btn" data-action="save">Sauvegarder</button>
        <button class="btn ghost" data-action="export">Exporter</button>
        <button class="btn ghost" data-action="copy">Copier</button>
        <button class="btn ghost" data-action="import">Importer</button>
      </div>
      <textarea id="saveData" placeholder="Exportez votre partie ou collez ici une sauvegarde à importer…"></textarea>
      <div class="danger-zone">
        <button class="btn danger" data-action="reset">Réinitialiser la partie</button>
      </div>`;
  },

  /* ---------- Planète / lunes cliquables ---------- */
  bindPlanetClick() {
    const canvas = $('#planetCanvas');
    canvas.addEventListener('pointerdown', e => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const body = this.body();
      // clic sur un astre en orbite : changement de corps
      const orb = body.hitOrbiter(x, y);
      if (orb) return orb.kind === 'moon' ? this.cargo(orb.index, true) : this.setView('planet');
      if (!body.hit(x, y)) return;
      const i = G.moonIdx();
      const { got } = G.click(false, i >= 0 ? i : 'planet');
      body.bump(1);
      this.striking = true;
      canvas.style.cursor = PICKAXE_CURSOR.strike;
      clearTimeout(this.strikeTimer);
      this.strikeTimer = setTimeout(() => {
        this.striking = false;
        canvas.style.cursor = this.overPlanet ? PICKAXE_CURSOR.idle : 'default';
      }, 130);
      this.showGain(x, y, got);
      this.updateResbar();
      this.updateCards();
    });
    canvas.addEventListener('pointermove', e => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const body = this.body();
      this.overPlanet = body.hit(x, y);
      if (this.striking) return;
      canvas.style.cursor = body.hitOrbiter(x, y) ? 'pointer' : this.overPlanet ? PICKAXE_CURSOR.idle : 'default';
    });
    canvas.addEventListener('pointerleave', () => { this.overPlanet = false; });
  },

  gainsHTML(got) {
    return RES_KEYS.filter(r => got[r] >= 0.5).map(r => `<span style="color:${RESOURCES[r].color}">+${fmtRate(got[r])}</span>`).join(' ');
  },

  showGain(x, y, got) {
    this.floater(x, y, this.gainsHTML(got) || '<span class="muted">Stock plein</span>');
  },

  /* Texte qui monte depuis le bas du bloc planète et s'efface avant le corps céleste.
     align : 'center' (casino), 'right' (robot), 'left' (navettes) */
  rise(html, cls, align = 'center') {
    const size = $('#planetWrap').clientWidth;
    const gap = size * (0.5 - 0.33 * 1.1);   // espace libre sous le corps (halo compris)
    const f = this.floater(0, 0, html, `jp-float ${cls} ${align}`);
    f.style.top = 'auto';
    f.style.bottom = '0';
    if (align === 'right') { f.style.left = 'auto'; f.style.right = '4%'; }
    else if (align === 'left') f.style.left = '4%';
    else f.style.left = '50%';
    f.style.setProperty('--rise', Math.max(8, gap - f.offsetHeight) + 'px');
    return f;
  },

  /* Clic du Robot Mineur (sur la planète) : gains regroupés, affichés en bas à droite */
  robotClick() {
    const { got } = G.click(true, 'planet');
    for (const r of RES_KEYS) this.robotPend[r] += got[r] || 0;
    const now = performance.now();
    if (now - this.robotLast < 450) return;
    this.robotLast = now;
    const parts = this.gainsHTML(this.robotPend);
    RES_KEYS.forEach(r => this.robotPend[r] = 0);
    if (this.viewKind() === 'm') return;   // le robot travaille sur la planète
    this.rise(`<em class="jp robot">Robot</em>${parts || '<span class="muted">Stock plein</span>'}`, 'robot-float', 'right');
  },

  /* Envoi d'une navette cargo : affiché en bas à gauche du bloc planète */
  cargo(i, manual = false) {
    const got = G.cargoShip(i, manual);
    const parts = this.gainsHTML(got);
    this.rise(`<em class="jp cargo">${manual ? 'Envoi' : 'Ascenseur'} · ${esc(S.moons[i].name)}</em>${parts || '<span class="muted">Rien à envoyer</span>'}`, 'cargo-float', 'left');
    if (manual && parts) this.planet.bump(0.6);
    this.updateResbar();
  },

  /* Tirage du Casino (toutes les 10 s) */
  jackpot() {
    const res = G.jackpotRoll();
    let html;
    if (res.lost) html = '<span class="muted">Échec de la collision</span>';
    else {
      const { r, amount, big } = res;
      const txt = amount > 0
        ? `<span style="color:${RESOURCES[r].color}">+${fmt(amount)}</span> ${resIcon(r)}`
        : '<span class="muted">Stock plein</span>';
      html = `<em class="jp">Accélérateur</em>${txt}`;
    }
    if (this.viewKind() === 'b') this.rise(html, (res.big ? 'big' : '') + (res.lost ? ' lost' : ''));
    this.updateResbar();
  },

  floater(x, y, html, cls = '', life) {
    const f = document.createElement('div');
    f.className = 'floater ' + cls;
    f.innerHTML = html;
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    f.style.setProperty('--dx', (Math.random() * 40 - 20) + 'px');
    $('#floaters').appendChild(f);
    setTimeout(() => f.remove(), life || (cls.includes('jp') ? 2000 : 1100));
    return f;
  },

  toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3800);
    setTimeout(() => t.remove(), 4300);
  },

  modal(html) {
    $('#modalBody').innerHTML = html;
    $('#modal').hidden = false;
  },
};
