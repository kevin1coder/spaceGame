/* ============================================================
   Démarrage et boucle principale
   ============================================================ */
(function () {
  const offline = G.load();
  const planet = new PlanetRenderer($('#planetCanvas'), $('#planetWrap'), S.planet.seed);
  G.checkAch();   // paliers déjà atteints : sans notification
  UI.init(planet);
  UI.update(true);

  if (!S.seenIntro) {
    S.seenIntro = true;
    UI.modal(`
      <h2>Bienvenue, Commandant</h2>
      <p>Vous prenez le contrôle de <b>${esc(S.planet.name)}</b>, une planète ${planet.traits.type.toLowerCase()} encore vierge. Vos entrepôts sont vides et aucune mine ne tourne.</p>
      <ul>
        <li>⛏ <b>Cliquez sur la planète</b> pour extraire vos premiers blocs de ferrite.</li>
        <li>${resIcon('ferrite')}Construisez des <b>mines</b> : elles produiront à votre place.</li>
        <li>${resIcon('deuterium')}Chaque clic rapporte du ferrite : une seconde de production de votre mine de ferrite (au moins 1).</li>
        <li>${resIcon('darkMatter')}Récoltez la <b>matière noire</b> pour les installations et la recherche.</li>
        <li>⚛ Débloquez des <b>technologies</b> et des <b>recherches</b>.</li>
      </ul>
      <p class="muted">Toutes les améliorations sont instantanées et la production continue même quand le jeu est fermé.</p>`);
  } else if (offline) {
    const gains = RES_KEYS.filter(r => offline.gains[r] > 0)
      .map(r => `<li>${resIcon(r)} <b>+${fmt(offline.gains[r])}</b> ${RESOURCES[r].name.toLowerCase()}</li>`).join('');
    UI.modal(`
      <h2>Rapport d'absence</h2>
      <p>Vous étiez absent pendant <b>${fmtTime(offline.elapsed)}</b>. Vos mines ont continué de travailler :</p>
      <ul>${gains || '<li>Aucune ressource produite.</li>'}</ul>`);
  }

  let lastUI = 0, lastTs = 0, robotAcc = 0, autoAcc = 0, fxState = '', expAcc = 0, snow = 0, forest = 0;
  function frame(ts) {
    G.advance(Date.now());
    const dt = lastTs ? Math.min(1, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    // expéditions, sondes et succès : vérifiés 2 fois par seconde
    expAcc += dt;
    if (expAcc >= 0.5) {
      expAcc = 0;
      // retour d'expédition : message au-dessus de la planète
      G.tickExpansion().forEach(r => { if (r.kind === 'exped') UI.expedBanner(r); });
      // expéditions en continu : les explorers repartent dès leur retour (et dès qu'il y en a à quai)
      if (S.fleet.frigate > 0 && !S.exped.voyage) { G.startExped('voyage', 1); G.rev++; }
      G.checkAch().forEach(a => UI.achPopup(a));
    }
    // Achat automatique : vérifié 4 fois par seconde
    autoAcc += dt;
    if (autoAcc >= 0.25) { autoAcc = 0; G.autoBuyTick(); }
    // événements : toutes les 30 secondes, un événement tiré au sort (pirates compris)
    G.raidT += dt;
    S.stats.playTime = (S.stats.playTime || 0) + dt;   // chrono de la partie
    G.revealSignal();
    G.mapTick(dt);   // guerres des clans sur la carte galactique   // signal inconnu : dévoilé 0,5 s avant l'arrivée
    if (G.raidT >= G.RAID_PERIOD) {
      G.raidT = 0;
      const ev = G.nextEvent();
      if (ev.id === 'pirates' || ev.id === 'boss') UI.raid(ev.via, ev.id === 'boss');
      else UI.event(ev.id, ev.via, ev);
    }
    // fin d'un effet temporaire (hyperinflation, ruée minière) : on rafraîchit prix et productions
    const fxKey = `${G.fxActive('inflation')}|${G.fxActive('rush')}|${G.fxActive('ice')}`;
    if (fxKey !== fxState) { fxState = fxKey; G.rev++; }
    // jackpot : un tirage toutes les 10 secondes
    if (S.click.jackpot > 0) {
      G.jackT += dt;
      if (G.jackT >= G.jackpotPeriod()) { G.jackT -= G.jackpotPeriod(); UI.jackpot(); }
    }
    if (UI.viewKind() === 'm') {
      // vue lune : la lune au centre, la planète mère immense en bas du bloc (sa sphère est recalculée pour tourner)
      // l'extraction réduit le diamètre de la lune ; le tremplin garde la taille d'origine
      const moon = G.curMoon(), ex = moon.tech.extract || 0;
      UI.body().render(ts, { lightDensity: 0, satellites: 0, horizon: planet,   // planète mère dessinée en grand, en bas du bloc
        scale: G.moonScale(moon),                  // diamètre réduit par l'extraction
        gate: (moon.tech.jump || 0) / 10,          // transformation en porte de saut
        gateStyle: G.gateStyle(G.moonIdx()), gateColor: LUNAR_MATS[moon.mat].color, gateSeed: moon.seed });
    } else {
      snow += ((G.fxActive('ice') ? 1 : 0) - snow) * Math.min(1, dt * 0.35);
      forest += ((G.fxActive('forest') ? 1 : 0) - forest) * Math.min(1, dt * 0.3);
      planet.render(ts, {
        snow, forest,
        buildings: { ...S.buildings, jackpot: S.click.jackpot || 0 },   // bâtiments dessinés sur la planète (+ accélérateur)
        lightDensity: Math.min(1, G.usedFields() / 60),
        satellites: Math.min(6, S.buildings.shipyard),
        moons: G.moonsGone() ? 0 : S.moons.length,
        moonColors: S.moons.map(m => moonColor(m.seed)),
        moonLinks: S.moons.map(() => false),   // ascenseur masqué
        moonScales: S.moons.map(m => G.moonScale(m)),
        moonGates: S.moons.map(m => (m.tech.jump || 0) / 10),
        moonNetwork: G.moonsJumpOk(10) && !G.moonsGone(),
        debrisRing: G.moonsGone(),   // anneau de débris une fois la carte galactique créée   // 3 tremplins terminés : orbites bleues, arche en vol, anneau de débris
        shieldDots: Math.min(800, S.fleet.destroyer || 0),   // un point blanc par Bouclier EM
        moonGateInfo: S.moons.map((m, i) => ({ style: G.gateStyle(i), color: LUNAR_MATS[m.mat].color, seed: m.seed })),
        ships: Object.keys(SHIPS).flatMap(id => Array(Math.min(12, G.fleetTotal(id))).fill(SHIPS[id].color)),
      });
    }
    if (ts - lastUI > 120) { UI.update(); lastUI = ts; }
    const fl = (G.mapFlights.length || G.mapHits.length) && document.querySelector('#mapPanel .map-flights');
    if (fl) fl.innerHTML = UI.flightsSVG();   // flèches d'attaque animées (à chaque image)
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  setInterval(() => G.save(), 5000);
  window.addEventListener('beforeunload', () => G.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });
})();
