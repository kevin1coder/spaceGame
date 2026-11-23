/* ============================================================
   Illustrations SVG : logos des ressources, scènes des mines,
   curseur pioche
   ============================================================ */

/* ---------- Logos des ressources (sans id, réutilisables partout) ---------- */
const RES_LOGOS = (() => {
  // Ferrite : bloc de minerai métallique taillé en facettes
  const P = [[5, 13], [13, 5], [24, 7], [29, 16], [22, 27], [9, 27], [3, 20]];
  const C = [15, 14];
  const shades = ['#f6cf9c', '#eab57c', '#c98d52', '#94602f', '#6e431f', '#a8703d', '#dda46a'];
  let ferrite = '';
  P.forEach((p, i) => { ferrite += `<polygon points="${p} ${P[(i + 1) % P.length]} ${C}" fill="${shades[i]}"/>`; });
  ferrite += `<polygon points="${P.join(' ')}" fill="none" stroke="#2e1b0b" stroke-width="1.2" stroke-linejoin="round"/>`;
  ferrite += '<circle cx="11" cy="11" r="1.3" fill="#fff6e6"/><circle cx="20" cy="19" r="0.9" fill="#ffe3bd"/>';

  // Deutérium : goutte d'eau lourde marquée « D »
  const deuterium =
    '<path d="M16 2C22 10 26.5 15.5 26.5 21A10.5 10.5 0 0 1 5.5 21C5.5 15.5 10 10 16 2z" fill="#1f9e94" stroke="#063a36" stroke-width="1.2" stroke-linejoin="round"/>' +
    '<path d="M16 2C10 10 5.5 15.5 5.5 21A10.5 10.5 0 0 0 16 31.5z" fill="#4fd1c5"/>' +
    '<path d="M16 2C22 10 26.5 15.5 26.5 21A10.5 10.5 0 0 1 5.5 21C5.5 15.5 10 10 16 2z" fill="none" stroke="#063a36" stroke-width="1.2" stroke-linejoin="round"/>' +
    '<path d="M9.5 17.5c.6-2.6 2-4.8 3.6-6.8" stroke="#e6fffb" stroke-width="1.6" fill="none" stroke-linecap="round"/>';

  // Matière noire : sphère sombre et anneau d'accrétion
  const darkMatter =
    '<circle cx="16" cy="16" r="15" fill="#a77bff" opacity=".16"/>' +
    '<g transform="rotate(-22 16 16)">' +
    '<path d="M1.5 16A14.5 5 0 0 1 30.5 16" fill="none" stroke="#6b45c9" stroke-width="2.2"/>' +
    '<circle cx="16" cy="16" r="9" fill="#0d0718" stroke="#7c55e0" stroke-width="1.4"/>' +
    '<path d="M10 14.5a6.5 6.5 0 0 1 8-4.5" stroke="#5a3aa8" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
    '<path d="M1.5 16A14.5 5 0 0 0 30.5 16" fill="none" stroke="#d2bcff" stroke-width="2.4"/>' +
    '</g>' +
    '<circle cx="25" cy="6" r="1.1" fill="#fff"/><circle cx="6" cy="26" r=".8" fill="#e5d8ff"/>';

  const wrap = s => `<svg viewBox="0 0 32 32" aria-hidden="true">${s}</svg>`;
  return { ferrite: wrap(ferrite), deuterium: wrap(deuterium), darkMatter: wrap(darkMatter) };
})();

/* ---------- Matériaux lunaires : logo (cristal de la couleur du matériau) ---------- */
for (const k in LUNAR_MATS) {
  const c = LUNAR_MATS[k].color;
  RES_LOGOS[k] = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 L26 12 L22 28 L10 28 L6 12z" fill="${c}" stroke="#0b1220" stroke-width="1.4"/>` +
    `<path d="M16 3 L16 28 M6 12 L26 12" stroke="#ffffff" stroke-opacity=".45" stroke-width="1"/><path d="M11 9 L15 6" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></svg>`;
}

/* ---------- Robot d'extraction lunaire : une variante par matériau ---------- */
function moonRobotArt(mat) {
  const M = LUNAR_MATS[mat] || LUNAR_MATS.titanium, c = M.color, v = M.robot % 6, id = 'mr' + v;
  // projection isométrique et volumes ombrés (dessus clair, face gauche moyenne, face droite sombre)
  const P = (x, y, z) => [96 + (x - y) * 0.866 * 1.7, 60 + (x + y) * 0.5 * 1.7 - z * 1.7];
  const path = (pts, fill, extra = '') => `<path d="M${pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L')}z" fill="${fill}" ${extra}/>`;
  const box = (x, y, z, w, d, h, top, left, right) =>
    path([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], left, 'stroke="#141a22" stroke-width=".5"')
    + path([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], right, 'stroke="#141a22" stroke-width=".5"')
    + path([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top, 'stroke="#141a22" stroke-width=".5"');
  const steel = [`url(#${id}T)`, `url(#${id}L)`, `url(#${id}R)`];
  // tête : 6 variantes
  const hc = P(0, 0, 21);
  const head = [
    `<circle cx="${hc[0]}" cy="${hc[1]}" r="9" fill="url(#${id}S)"/><ellipse cx="${hc[0] + 3}" cy="${hc[1] + 1}" rx="4.5" ry="2.2" fill="${c}" opacity=".95"/>`,
    box(-4, -4, 17, 8, 8, 8, ...steel) + `<circle cx="${P(-1, 4, 21)[0]}" cy="${P(-1, 4, 21)[1]}" r="1.8" fill="${c}"/><circle cx="${P(3, 4, 21)[0]}" cy="${P(3, 4, 21)[1]}" r="1.8" fill="${c}"/>`,
    `<path d="M${hc[0] - 10} ${hc[1] + 4} Q${hc[0] - 10} ${hc[1] - 10} ${hc[0]} ${hc[1] - 10} Q${hc[0] + 10} ${hc[1] - 10} ${hc[0] + 10} ${hc[1] + 4}z" fill="url(#${id}S)"/><path d="M${hc[0] - 6} ${hc[1]} h12" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`,
    box(-3, -3, 17, 6, 6, 10, ...steel) + `<circle cx="${P(0, 3, 23)[0]}" cy="${P(0, 3, 23)[1]}" r="2.6" fill="${c}"/>`,
    `<ellipse cx="${hc[0]}" cy="${hc[1]}" rx="11" ry="7" fill="url(#${id}S)"/><rect x="${hc[0] - 6}" y="${hc[1] - 1.5}" width="12" height="3" rx="1.5" fill="${c}"/>`,
    `<circle cx="${hc[0]}" cy="${hc[1]}" r="7" fill="url(#${id}S)"/><circle cx="${hc[0]}" cy="${hc[1]}" r="10" fill="none" stroke="${c}" stroke-width="1.6" opacity=".8"/>`,
  ][v];
  // outil au bout du bras : 6 variantes
  const a0 = P(5, 3, 11), a1 = P(13, 9, 8), tp = P(17, 12, 6);
  const tool = [
    `<polygon points="${a1[0]},${a1[1] - 3} ${tp[0] + 8},${tp[1] + 3} ${a1[0]},${a1[1] + 4}" fill="url(#${id}C)" stroke="#141a22" stroke-width=".6"/>`,
    `<path d="M${a1[0]} ${a1[1]} l7 -6 M${a1[0]} ${a1[1]} l8 3" stroke="url(#${id}C)" stroke-width="3.4" stroke-linecap="round"/>`,
    `<path d="M${a1[0]} ${a1[1]} L${tp[0] + 14} ${tp[1] + 12}" stroke="${c}" stroke-width="2.4" opacity=".95"/><circle cx="${tp[0] + 14}" cy="${tp[1] + 12}" r="5" fill="${c}" opacity=".55"/>`,
    box(13, 8, 4, 6, 4, 3, `url(#${id}C)`, c, '#2a3038'),
    `<circle cx="${a1[0] + 4}" cy="${a1[1] + 1}" r="6" fill="none" stroke="url(#${id}C)" stroke-width="3"/><circle cx="${a1[0] + 4}" cy="${a1[1] + 1}" r="1.6" fill="#2a3038"/>`,
    `<path d="M${a1[0]} ${a1[1]} q9 -9 16 3" stroke="url(#${id}C)" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,
  ][v];
  // cristaux à facettes (face éclairée claire, face ombrée foncée)
  const crystal = (x, y, s) => {
    const b = P(x, y, 0), t = P(x, y, s * 2.4);
    return `<polygon points="${t[0]},${t[1]} ${b[0] - s * 2},${b[1]} ${b[0]},${b[1] + s * 0.9}" fill="${c}"/>`
      + `<polygon points="${t[0]},${t[1]} ${b[0]},${b[1] + s * 0.9} ${b[0] + s * 2},${b[1]}" fill="${c}" style="filter:brightness(.55)"/>`
      + `<polygon points="${t[0]},${t[1]} ${b[0] - s * 0.6},${b[1] - s * 0.3} ${b[0] - s * 1.4},${b[1] - s * 0.1}" fill="#fff" opacity=".45"/>`;
  };
  const crystals = [[26, -6, 3.2], [31, -12, 2.2], [21, -1, 2.4], [-10, 26, 2.6], [-16, 24, 1.8], [36, -2, 1.6]].map(a => crystal(...a)).join('');
  const sh = P(0, 0, 0);
  return `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="${id}Sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04060d"/><stop offset="1" stop-color="#1a2131"/></linearGradient>
      <linearGradient id="${id}Gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a606b"/><stop offset="1" stop-color="#2c3038"/></linearGradient>
      <linearGradient id="${id}T" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f5f9"/><stop offset="1" stop-color="#b9c3cf"/></linearGradient>
      <linearGradient id="${id}L" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#aeb8c4"/><stop offset="1" stop-color="#7a8592"/></linearGradient>
      <linearGradient id="${id}R" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c7682"/><stop offset="1" stop-color="#3e4650"/></linearGradient>
      <linearGradient id="${id}C" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="${c}"/><stop offset="1" stop-color="#1a2030"/></linearGradient>
      <radialGradient id="${id}S" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#c3ccd6"/><stop offset="1" stop-color="#4a525e"/></radialGradient>
      <radialGradient id="${id}P" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#9fd4ff"/><stop offset=".6" stop-color="#2f6fb0"/><stop offset="1" stop-color="#0b1a33"/></radialGradient>
      <radialGradient id="${id}G" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="200" height="120" fill="url(#${id}Sky)"/>
    ${STARS(11 + v * 7)}
    <circle cx="170" cy="30" r="13" fill="url(#${id}P)"/>
    <path d="M0 60 Q60 52 120 57 T200 54 V120 H0z" fill="url(#${id}Gr)"/>
    <ellipse cx="34" cy="84" rx="16" ry="4.5" fill="#24282f"/><ellipse cx="34" cy="83" rx="12" ry="3" fill="#3a3f48"/>
    <ellipse cx="172" cy="90" rx="18" ry="5" fill="#24282f"/><ellipse cx="172" cy="89" rx="13" ry="3.4" fill="#3a3f48"/>
    <circle cx="${P(27, -6, 0)[0]}" cy="${P(27, -6, 0)[1]}" r="26" fill="url(#${id}G)"/>
    ${crystals}
    <ellipse cx="${sh[0] + 4}" cy="${sh[1] + 4}" rx="30" ry="9" fill="#000" opacity=".35"/>
    ${box(-10, -9, 0, 20, 5, 4, '#3a4048', '#2a3038', '#1d2228')}
    ${box(-10, 4, 0, 20, 5, 4, '#3a4048', '#2a3038', '#1d2228')}
    ${[-6, 0, 6].map(x => { const w = P(x, 9, 2); return `<circle cx="${w[0]}" cy="${w[1]}" r="2.2" fill="#5d6672" stroke="#141a22" stroke-width=".5"/>`; }).join('')}
    ${box(-7, -6, 4, 14, 12, 12, ...steel)}
    ${path([P(-5, 6, 7), P(5, 6, 7), P(5, 6, 13), P(-5, 6, 13)], c, 'opacity=".9"')}
    ${path([P(-4, 6, 8.5), P(4, 6, 8.5), P(4, 6, 9.6), P(-4, 6, 9.6)], '#ffffff', 'opacity=".6"')}
    <path d="M${a0[0]} ${a0[1]} L${a1[0]} ${a1[1]}" stroke="url(#${id}L)" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="${a0[0]}" cy="${a0[1]}" r="2.6" fill="#5d6672"/>
    ${tool}
    <path d="M${P(0, 0, 16)[0]} ${P(0, 0, 16)[1]} V${P(0, 0, 16)[1] - 2}" stroke="#9aa4b0" stroke-width="2"/>
    ${head}
    <path d="M${hc[0]} ${hc[1] - 9} V${hc[1] - 17}" stroke="#9aa4b0" stroke-width="1.4"/><circle cx="${hc[0]}" cy="${hc[1] - 18}" r="2.2" fill="${c}"/>
  </svg>`;
}

/* ---------- Scènes des mines ---------- */
const STARS = (seed) => {
  let s = '', a = seed;
  for (let i = 0; i < 22; i++) {
    a = (a * 9301 + 49297) % 233280;
    const x = (a / 233280) * 200;
    a = (a * 9301 + 49297) % 233280;
    const y = (a / 233280) * 55;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 4 ? 0.6 : 1.1}" fill="#fff" opacity="${i % 3 ? 0.5 : 0.9}"/>`;
  }
  return s;
};

const MINE_ART = {
  mineFerrite: `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="artSkyF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090d1a"/><stop offset="1" stop-color="#4a2a17"/></linearGradient>
      <linearGradient id="artPileF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0b67a"/><stop offset="1" stop-color="#7a4a22"/></linearGradient>
    </defs>
    <rect width="200" height="120" fill="url(#artSkyF)"/>
    ${STARS(11)}
    <circle cx="165" cy="22" r="9" fill="#e8c9a0" opacity=".85"/><circle cx="168" cy="20" r="9" fill="#120d14" opacity=".6"/>
    <path d="M0 78 L28 60 L52 70 L84 52 L118 68 L150 56 L200 72 V120 H0z" fill="#2c1a10"/>
    <path d="M0 92 Q60 82 110 90 T200 86 V120 H0z" fill="#553420"/>
    <path d="M0 104 Q80 96 200 102 V120 H0z" fill="#3e2616"/>
    <g stroke="#b9c0ca" stroke-width="2.2" stroke-linecap="round" fill="none">
      <path d="M118 92 L133 28 L148 92"/><path d="M122 76 H144 M126 60 H140 M129 45 H137"/>
      <path d="M122 76 L140 60 M144 76 L126 60 M126 60 L137 45 M140 60 L129 45"/>
    </g>
    <rect x="128" y="22" width="10" height="7" fill="#7b8794"/>
    <circle cx="133" cy="20" r="2.2" fill="#ff5a5a"/>
    <path d="M133 29 V96" stroke="#5a6470" stroke-width="2"/>
    <path d="M22 98 Q40 70 62 98z" fill="url(#artPileF)"/>
    <path d="M44 99 Q56 82 72 99z" fill="#a8703d"/>
    <polygon points="30,88 35,84 39,89 34,92" fill="#f6cf9c"/><polygon points="50,86 54,83 57,87 53,90" fill="#dda46a"/>
    <line x1="70" y1="104" x2="200" y2="104" stroke="#8a929c" stroke-width="1.5"/>
    <polygon points="84,90 108,90 104,101 88,101" fill="#6b7480" stroke="#2a2f36" stroke-width="1"/>
    <circle cx="90" cy="102.5" r="2.5" fill="#2a2f36"/><circle cx="102" cy="102.5" r="2.5" fill="#2a2f36"/>
    <circle cx="91" cy="88" r="3.5" fill="#c98d52"/><circle cx="97" cy="86.5" r="4" fill="#e8b077"/><circle cx="103" cy="88.5" r="3" fill="#a8703d"/>
    <rect x="160" y="80" width="26" height="16" fill="#3a3f48" stroke="#1d2026"/>
    <rect x="164" y="84" width="5" height="4" fill="#ffd166"/><rect x="174" y="84" width="5" height="4" fill="#ffd166" opacity=".6"/>
  </svg>`,

  mineDeuterium: `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="artSkyD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050b1c"/><stop offset="1" stop-color="#0f4a50"/></linearGradient>
      <linearGradient id="artSeaD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d7f86"/><stop offset="1" stop-color="#07262c"/></linearGradient>
      <radialGradient id="artTankD" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#e6fffb"/><stop offset=".5" stop-color="#8ab8b4"/><stop offset="1" stop-color="#2e4a4a"/></radialGradient>
    </defs>
    <rect width="200" height="120" fill="url(#artSkyD)"/>
    ${STARS(42)}
    <circle cx="36" cy="24" r="11" fill="#bfe9ff" opacity=".8"/>
    <path d="M0 70 L30 62 L52 66 L60 70z M150 70 L172 58 L190 64 L200 70z" fill="#cfe8ef" opacity=".6"/>
    <rect y="70" width="200" height="50" fill="url(#artSeaD)"/>
    <g stroke="#7fe0d6" stroke-width="1" opacity=".5" fill="none">
      <path d="M10 80 q6 -3 12 0 t12 0"/><path d="M150 88 q6 -3 12 0 t12 0"/><path d="M30 104 q6 -3 12 0 t12 0"/><path d="M160 108 q6 -3 12 0 t12 0"/>
    </g>
    <g stroke="#3a4450" stroke-width="3"><path d="M74 66 V104 M126 66 V104 M100 66 V106"/></g>
    <path d="M74 86 L126 76 M74 76 L126 86" stroke="#3a4450" stroke-width="1.5"/>
    <rect x="64" y="58" width="72" height="9" fill="#5b6876" stroke="#1d2530"/>
    <circle cx="82" cy="47" r="11" fill="url(#artTankD)" stroke="#1d2530"/>
    <circle cx="106" cy="49" r="9" fill="url(#artTankD)" stroke="#1d2530"/>
    <path d="M118 58 V30 L130 30 V58" fill="#46525e" stroke="#1d2530"/>
    <circle cx="124" cy="27" r="2.2" fill="#ff5a5a"/>
    <path d="M82 58 V52 M106 58 V55" stroke="#1d2530" stroke-width="2"/>
    <rect x="66" y="60" width="5" height="4" fill="#4fd1c5"/><rect x="76" y="60" width="5" height="4" fill="#4fd1c5" opacity=".6"/>
    <ellipse cx="100" cy="106" rx="38" ry="4" fill="#4fd1c5" opacity=".25"/>
  </svg>`,

  darkMatterCollector: `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="artSkyM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05030c"/><stop offset="1" stop-color="#2a1650"/></linearGradient>
      <radialGradient id="artHaloM" cx=".5" cy=".5" r=".5"><stop offset=".45" stop-color="#a77bff" stop-opacity=".55"/><stop offset="1" stop-color="#a77bff" stop-opacity="0"/></radialGradient>
      <linearGradient id="artRingM" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b45c9" stop-opacity="0"/><stop offset=".5" stop-color="#e3d4ff"/><stop offset="1" stop-color="#6b45c9" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="200" height="120" fill="url(#artSkyM)"/>
    ${STARS(77)}
    <circle cx="100" cy="40" r="34" fill="url(#artHaloM)"/>
    <ellipse cx="100" cy="40" rx="44" ry="9" fill="none" stroke="#6b45c9" stroke-width="2.5" transform="rotate(-12 100 40)" opacity=".7"/>
    <circle cx="100" cy="40" r="17" fill="#07040f" stroke="#8b66ea" stroke-width="1.2"/>
    <path d="M56 46 A44 9 0 0 0 144 34" fill="none" stroke="url(#artRingM)" stroke-width="3" transform="rotate(-12 100 40)"/>
    <path d="M0 84 L34 70 L62 78 L96 66 L132 76 L168 68 L200 74 V120 H0z" fill="#1a0f2e"/>
    <path d="M0 96 Q70 88 130 94 T200 92 V120 H0z" fill="#26173f"/>
    <g fill="none" stroke="#8a95a8" stroke-width="2">
      <path d="M40 96 V82"/><path d="M28 80 Q40 92 52 80" stroke-width="2.5"/>
      <path d="M160 96 V82"/><path d="M148 80 Q160 92 172 80" stroke-width="2.5"/>
    </g>
    <path d="M40 80 L92 52 M160 80 L108 52" stroke="#c9a8ff" stroke-width="1" stroke-dasharray="3 3" opacity=".8"/>
    <rect x="84" y="88" width="32" height="12" fill="#3a3f48" stroke="#1d2026"/>
    <circle cx="94" cy="94" r="2" fill="#a77bff"/><circle cx="106" cy="94" r="2" fill="#a77bff" opacity=".6"/>
    <path d="M0 108 Q100 101 200 108 V120 H0z" fill="#140b24"/>
  </svg>`,
};


/* ---------- Scènes des entrepôts ---------- */
const STORE_ART = {
  storeFerrite: `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="sfSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0d1c"/><stop offset=".55" stop-color="#3a1c18"/><stop offset="1" stop-color="#a8502a"/></linearGradient>
      <radialGradient id="sfSun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd9a0"/><stop offset=".25" stop-color="#ff9a4a" stop-opacity=".9"/><stop offset="1" stop-color="#ff6a2a" stop-opacity="0"/></radialGradient>
      <linearGradient id="sfSilo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a3f48"/><stop offset=".3" stop-color="#d6dee7"/><stop offset=".55" stop-color="#8d97a3"/><stop offset="1" stop-color="#262b33"/></linearGradient>
      <linearGradient id="sfBand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b3a1a"/><stop offset=".3" stop-color="#f0b47a"/><stop offset=".55" stop-color="#c98d52"/><stop offset="1" stop-color="#4a2810"/></linearGradient>
      <linearGradient id="sfWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b7480"/><stop offset="1" stop-color="#2e343c"/></linearGradient>
      <linearGradient id="sfRoof" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a525e"/><stop offset=".4" stop-color="#9aa4b0"/><stop offset="1" stop-color="#3a414b"/></linearGradient>
      <linearGradient id="sfOre" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0b47a"/><stop offset=".5" stop-color="#b8763d"/><stop offset="1" stop-color="#5a3216"/></linearGradient>
      <linearGradient id="sfBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6b0" stop-opacity=".45"/><stop offset="1" stop-color="#ffe6b0" stop-opacity="0"/></linearGradient>
      <linearGradient id="sfGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3420"/><stop offset="1" stop-color="#24140b"/></linearGradient>
    </defs>
    <rect width="200" height="120" fill="url(#sfSky)"/>
    ${STARS(5)}
    <circle cx="150" cy="70" r="40" fill="url(#sfSun)"/>
    <circle cx="150" cy="70" r="9" fill="#ffd9a0"/>
    <path d="M0 74 L22 60 L40 66 L66 50 L92 64 L120 56 L150 66 L176 54 L200 62 V120 H0z" fill="#3b2016"/>
    <path d="M0 82 L30 72 L70 78 L110 70 L150 78 L200 72 V120 H0z" fill="#2a160e"/>
    <rect x="0" y="88" width="200" height="32" fill="url(#sfGround)"/>
    <!-- faisceaux des projecteurs -->
    <path d="M36 36 L4 98 H52z" fill="url(#sfBeam)"/>
    <path d="M182 40 L150 98 H196z" fill="url(#sfBeam)"/>
    <!-- silos -->
    <g>
      <rect x="20" y="38" width="22" height="58" fill="url(#sfSilo)"/>
      <rect x="20" y="58" width="22" height="9" fill="url(#sfBand)"/>
      <ellipse cx="31" cy="38" rx="11" ry="3.4" fill="#e3e9f0"/><path d="M20 38 Q31 26 42 38" fill="url(#sfRoof)"/>
      <rect x="44" y="48" width="18" height="48" fill="url(#sfSilo)"/>
      <rect x="44" y="64" width="18" height="7" fill="url(#sfBand)"/>
      <ellipse cx="53" cy="48" rx="9" ry="2.8" fill="#e3e9f0"/><path d="M44 48 Q53 38 62 48" fill="url(#sfRoof)"/>
      <path d="M31 30 V22 M31 22 H64 L76 40" stroke="#5b6470" stroke-width="1.6" fill="none"/>
      <rect x="34" y="34" width="4" height="3" fill="#36363e"/><circle cx="36" cy="35.5" r="1.4" fill="#ffd166"/>
    </g>
    <!-- entrepôt principal -->
    <path d="M70 96 V58 L118 46 L166 58 V96z" fill="url(#sfWall)" stroke="#1d2026" stroke-width=".8"/>
    <path d="M66 59 L118 44 L170 59 L166 62 L118 49 L70 62z" fill="url(#sfRoof)" stroke="#1d2026" stroke-width=".6"/>
    <g stroke="#4a525e" stroke-width=".8"><path d="M82 96 V58 M94 96 V54 M142 96 V54 M154 96 V58"/></g>
    <rect x="100" y="66" width="36" height="30" fill="#14171c" stroke="#3a3f48"/>
    <g stroke="#2a2f37" stroke-width="1.2"><path d="M100 71 H136 M100 76 H136 M100 81 H136 M100 86 H136 M100 91 H136"/></g>
    <rect x="100" y="88" width="36" height="8" fill="#ffb36b" opacity=".35"/>
    <rect x="100" y="62" width="36" height="3" fill="#e8b83a"/>
    <g fill="#ffd27a"><rect x="74" y="66" width="6" height="4"/><rect x="86" y="64" width="6" height="4"/><rect x="146" y="64" width="6" height="4" opacity=".5"/><rect x="156" y="66" width="6" height="4"/></g>
    <text x="118" y="58" font-size="7" font-weight="700" text-anchor="middle" fill="#f0b47a" font-family="sans-serif">Fe</text>
    <!-- convoyeur vers l'entrepôt -->
    <path d="M40 96 L74 76" stroke="#2a2f37" stroke-width="5"/><path d="M40 96 L74 76" stroke="#6b7480" stroke-width="2"/>
    <g fill="#d99a5a"><circle cx="48" cy="90" r="1.6"/><circle cx="56" cy="85.5" r="1.6"/><circle cx="64" cy="81" r="1.6"/></g>
    <!-- tas de minerai -->
    <path d="M4 100 Q18 80 34 100z" fill="url(#sfOre)"/>
    <path d="M150 102 Q166 84 186 102z" fill="url(#sfOre)"/>
    <path d="M170 102 Q182 90 198 102z" fill="url(#sfOre)" opacity=".85"/>
    <g fill="#ffe0b0"><circle cx="16" cy="90" r=".8"/><circle cx="22" cy="94" r=".7"/><circle cx="164" cy="92" r=".8"/><circle cx="172" cy="96" r=".7"/><circle cx="184" cy="96" r=".7"/></g>
    <!-- projecteurs et lingots -->
    <path d="M36 36 V28 M182 40 V30" stroke="#5b6470" stroke-width="1.2"/>
    <circle cx="36" cy="36" r="2.4" fill="#fff3d0"/><circle cx="182" cy="40" r="2.4" fill="#fff3d0"/>
    <g stroke="#3a2410" stroke-width=".5"><rect x="138" y="94" width="10" height="4" fill="#c98d52"/><rect x="141" y="90" width="10" height="4" fill="#e0a56a"/><rect x="126" y="96" width="10" height="4" fill="#b8763d"/></g>
  </svg>`,

  shipyard: `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="syCeil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f7fb"/><stop offset="1" stop-color="#b9c4d0"/></linearGradient>
      <linearGradient id="syFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9b4c1"/><stop offset="1" stop-color="#e9eef4"/></linearGradient>
      <linearGradient id="syWallL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d7dee7"/><stop offset="1" stop-color="#9aa6b3"/></linearGradient>
      <linearGradient id="syWallR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#d7dee7"/><stop offset="1" stop-color="#9aa6b3"/></linearGradient>
      <linearGradient id="syHull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#d7dee7"/><stop offset="1" stop-color="#8d97a3"/></linearGradient>
      <radialGradient id="sySpark" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6d0"/><stop offset=".35" stop-color="#ffb36b" stop-opacity=".85"/><stop offset="1" stop-color="#ff8c5a" stop-opacity="0"/></radialGradient>
      <radialGradient id="syLamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    </defs>
    <!-- plafond, sol, murs (perspective vers le fond) -->
    <path d="M0 0 H200 L134 42 H66z" fill="url(#syCeil)"/>
    <path d="M0 120 H200 L134 78 H66z" fill="url(#syFloor)"/>
    <path d="M0 0 L66 42 V78 L0 120z" fill="url(#syWallL)"/>
    <path d="M200 0 L134 42 V78 L200 120z" fill="url(#syWallR)"/>
    <!-- mur du fond : grande baie ouverte sur l'espace -->
    <rect x="66" y="42" width="68" height="36" fill="#c9d3de"/>
    <rect x="72" y="46" width="56" height="28" fill="#070b18"/>
    ${STARS(17).replace(/cy="([\d.]+)"/g, (m, v) => `cy="${(46 + v * 0.5).toFixed(1)}"`).replace(/cx="([\d.]+)"/g, (m, v) => `cx="${(72 + v * 0.28).toFixed(1)}"`)}
    <circle cx="116" cy="70" r="9" fill="#2f6fb0"/><path d="M107 70 a9 9 0 0 1 18 0" fill="#7fd3ff" opacity=".5"/>
    <path d="M86 46 V74 M100 46 V74 M114 46 V74" stroke="#c9d3de" stroke-width="1.2"/>
    <!-- nervures du hall -->
    <g fill="none" stroke="#aab6c3" stroke-width="2.2">
      <path d="M8 5 V115 M192 5 V115"/>
    </g>
    <g fill="none" stroke="#b9c4d0" stroke-width="1.6"><path d="M30 19 V101 M170 19 V101"/></g>
    <g fill="none" stroke="#c3ccd6" stroke-width="1.1"><path d="M48 31 V89 M152 31 V89"/></g>
    <path d="M8 5 H192 M30 19 H170 M48 31 H152" stroke="#e3e9f0" stroke-width="1.4"/>
    <!-- bandes lumineuses au plafond -->
    <g fill="#ffffff"><path d="M84 0 H96 L98 42 H94z" opacity=".8"/><path d="M104 0 H116 L106 42 H102z" opacity=".8"/></g>
    <ellipse cx="100" cy="10" rx="60" ry="8" fill="url(#syLamp)" opacity=".5"/>
    <!-- lignes lumineuses bleues le long des murs -->
    <path d="M0 64 L66 66 M200 64 L134 66" stroke="#4fc3ff" stroke-width="1.4" opacity=".85"/>
    <path d="M0 92 L66 72 M200 92 L134 72" stroke="#4fc3ff" stroke-width="1" opacity=".6"/>
    <!-- marquage au sol -->
    <path d="M100 78 V120" stroke="#ff8c5a" stroke-width="1.4" stroke-dasharray="4 4"/>
    <path d="M74 78 L40 120 M126 78 L160 120" stroke="#e8b83a" stroke-width="1.2" opacity=".8"/>
    <!-- berceau et vaisseau en construction (vu de face) -->
    <rect x="70" y="92" width="60" height="5" fill="#5b6470"/><rect x="76" y="86" width="6" height="7" fill="#3a3f48"/><rect x="118" y="86" width="6" height="7" fill="#3a3f48"/>
    <path d="M100 58 L136 82 L128 90 H72 L64 82z" fill="url(#syHull)" stroke="#6b7480" stroke-width=".8"/>
    <path d="M100 58 L112 80 H88z" fill="#e9eef4" stroke="#aab6c3" stroke-width=".5"/>
    <path d="M92 74 Q100 66 108 74 L106 78 H94z" fill="#4f9dff"/><path d="M95 73 Q100 69 104 72" stroke="#bfe8ff" stroke-width=".8" fill="none"/>
    <path d="M64 82 L44 88 L46 90 L72 88z M136 82 L156 88 L154 90 L128 88z" fill="#c3ccd6" stroke="#6b7480" stroke-width=".6"/>
    <rect x="80" y="84" width="10" height="3" fill="#ff8c5a"/><rect x="110" y="84" width="10" height="3" fill="#ff8c5a"/>
    <!-- partie non terminée : armature -->
    <path d="M136 82 L148 76 L156 88 M148 76 L150 88" stroke="#ff8c5a" stroke-width=".8" fill="none"/>
    <!-- bras robotisés -->
    <path d="M22 120 L30 96 L52 82" stroke="#e3e9f0" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M22 120 L30 96 L52 82" stroke="#8d97a3" stroke-width="1.2" fill="none"/>
    <circle cx="30" cy="96" r="3.5" fill="#6b7480"/><path d="M52 82 L60 84" stroke="#3a3f48" stroke-width="2"/>
    <path d="M180 120 L168 94 L150 78" stroke="#e3e9f0" stroke-width="5" stroke-linecap="round" fill="none"/>
    <path d="M180 120 L168 94 L150 78" stroke="#8d97a3" stroke-width="1.2" fill="none"/>
    <circle cx="168" cy="94" r="3.5" fill="#6b7480"/>
    <circle cx="61" cy="84" r="7" fill="url(#sySpark)"/><circle cx="149" cy="78" r="6" fill="url(#sySpark)"/>
    <g stroke="#ffd166" stroke-width=".6"><path d="M61 84 l-4 5 M61 84 l3 6 M61 84 l-6 1 M149 78 l4 5 M149 78 l-2 6"/></g>
    <!-- pont roulant -->
    <rect x="40" y="24" width="120" height="4" fill="#ff8c5a"/><rect x="92" y="28" width="16" height="5" fill="#3a3f48"/>
    <path d="M100 33 V56" stroke="#3a3f48" stroke-width=".8"/>
  </svg>`,

  storeDeuterium: `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="artSkySD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050b1c"/><stop offset="1" stop-color="#0f3b40"/></linearGradient>
      <linearGradient id="artCylSD" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2e4a4a"/><stop offset=".45" stop-color="#9fd8d2"/><stop offset="1" stop-color="#1f3333"/></linearGradient>
    </defs>
    <rect width="200" height="120" fill="url(#artSkySD)"/>
    ${STARS(31)}
    <path d="M0 82 L50 70 L100 78 L150 66 L200 76 V120 H0z" fill="#0d2a2e"/>
    <path d="M0 98 Q90 90 200 97 V120 H0z" fill="#123a3f"/>
    <rect x="46" y="48" width="34" height="50" rx="4" fill="url(#artCylSD)" stroke="#0b2224"/>
    <ellipse cx="63" cy="48" rx="17" ry="4" fill="#cdeeea"/>
    <rect x="90" y="40" width="40" height="58" rx="4" fill="url(#artCylSD)" stroke="#0b2224"/>
    <ellipse cx="110" cy="40" rx="20" ry="4.5" fill="#cdeeea"/>
    <rect x="140" y="58" width="26" height="40" rx="4" fill="url(#artCylSD)" stroke="#0b2224"/>
    <ellipse cx="153" cy="58" rx="13" ry="3.5" fill="#cdeeea"/>
    <path d="M80 80 H90 M130 84 H140" stroke="#4fd1c5" stroke-width="3"/>
    <rect x="100" y="64" width="20" height="3" fill="#4fd1c5"/><rect x="54" y="70" width="18" height="3" fill="#4fd1c5" opacity=".7"/>
  </svg>`,

  storeDarkMatter: `<svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="artSkySM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05030c"/><stop offset="1" stop-color="#26144a"/></linearGradient>
      <radialGradient id="artCoreSM" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#0d0718"/><stop offset=".6" stop-color="#2a1650"/><stop offset="1" stop-color="#a77bff" stop-opacity=".9"/></radialGradient>
      <linearGradient id="artGlassSM" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a77bff" stop-opacity=".15"/><stop offset=".5" stop-color="#e3d4ff" stop-opacity=".35"/><stop offset="1" stop-color="#a77bff" stop-opacity=".1"/></linearGradient>
    </defs>
    <rect width="200" height="120" fill="url(#artSkySM)"/>
    ${STARS(63)}
    <path d="M0 84 L40 72 L90 80 L140 68 L200 78 V120 H0z" fill="#1a0f2e"/>
    <path d="M0 100 Q90 92 200 99 V120 H0z" fill="#22143a"/>
    <rect x="78" y="34" width="44" height="64" rx="6" fill="url(#artGlassSM)" stroke="#8b66ea" stroke-width="1.5"/>
    <circle cx="100" cy="64" r="15" fill="url(#artCoreSM)"/>
    <ellipse cx="100" cy="64" rx="26" ry="6" fill="none" stroke="#c9a8ff" stroke-width="1.5" opacity=".8"/>
    <rect x="72" y="28" width="56" height="8" fill="#3a3f48" stroke="#1d2026"/>
    <rect x="72" y="96" width="56" height="8" fill="#3a3f48" stroke="#1d2026"/>
    <circle cx="80" cy="32" r="1.8" fill="#a77bff"/><circle cx="120" cy="32" r="1.8" fill="#a77bff"/>
    <path d="M40 98 V86 H72 M160 98 V86 H128" stroke="#6b7480" stroke-width="3" fill="none"/>
  </svg>`,
};

/* ---------- Curseur pioche ---------- */
const PICKAXE_CURSOR = (() => {
  const svg = rot => `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><g transform='rotate(${rot} 27 27)'>` +
    `<line x1='12' y1='12' x2='28' y2='28' stroke='#1a0f06' stroke-width='6' stroke-linecap='round'/>` +
    `<line x1='12' y1='12' x2='28' y2='28' stroke='#b07a44' stroke-width='3.2' stroke-linecap='round'/>` +
    `<path d='M3 19 Q5 5 19 3' fill='none' stroke='#14181e' stroke-width='6.5' stroke-linecap='round'/>` +
    `<path d='M3 19 Q5 5 19 3' fill='none' stroke='#cfd8e3' stroke-width='3.6' stroke-linecap='round'/>` +
    `<path d='M6.5 12 Q8 7.5 12 6.5' fill='none' stroke='#ffffff' stroke-width='1.2' stroke-linecap='round'/>` +
    `</g></svg>`;
  const url = (rot, hx, hy) => `url("data:image/svg+xml,${encodeURIComponent(svg(rot))}") ${hx} ${hy}, pointer`;
  return { idle: url(0, 4, 18), strike: url(-15, 2, 25) };
})();
