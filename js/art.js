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
    '<path d="M9.5 17.5c.6-2.6 2-4.8 3.6-6.8" stroke="#e6fffb" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '<text x="16.5" y="26" font-family="Orbitron,Arial,sans-serif" font-size="10" font-weight="900" text-anchor="middle" fill="#03302c">D</text>';

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
    <defs><linearGradient id="artSkySF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090d1a"/><stop offset="1" stop-color="#3d2416"/></linearGradient></defs>
    <rect width="200" height="120" fill="url(#artSkySF)"/>
    ${STARS(5)}
    <path d="M0 80 L40 66 L80 74 L130 60 L200 72 V120 H0z" fill="#2c1a10"/>
    <path d="M0 96 Q80 88 200 94 V120 H0z" fill="#4a2e1c"/>
    <path d="M50 96 V64 Q100 30 150 64 V96z" fill="#5b6470" stroke="#262b33" stroke-width="1.5"/>
    <path d="M58 96 V68 Q100 40 142 68" fill="none" stroke="#7b8794" stroke-width="1.5"/>
    <path d="M78 96 V72 H122 V96" fill="#1d2026"/>
    <path d="M80 78 H120 M80 84 H120 M80 90 H120" stroke="#3a3f48" stroke-width="1.5"/>
    <rect x="94" y="54" width="12" height="5" fill="#ffd166"/>
    <rect x="152" y="84" width="14" height="12" fill="#a8703d" stroke="#3a2410"/><rect x="166" y="88" width="12" height="8" fill="#c98d52" stroke="#3a2410"/>
    <rect x="24" y="86" width="16" height="10" fill="#c98d52" stroke="#3a2410"/>
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
