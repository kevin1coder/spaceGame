/* ============================================================
   Rendu procédural de la planète (canvas 2D, sphère texturée)
   ============================================================ */

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeNoise3(rnd) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint16Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) vals[i] = rnd();
  const sm = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const h = (x, y, z) => vals[perm[perm[perm[x] + y] + z]];
  return (x, y, z) => {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    const xi = X & 255, yi = Y & 255, zi = Z & 255;
    const u = sm(x - X), v = sm(y - Y), w = sm(z - Z);
    return lerp(
      lerp(lerp(h(xi, yi, zi), h(xi + 1, yi, zi), u), lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
      lerp(lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v),
      w);
  };
}

function fbm(noise, x, y, z, oct) {
  let s = 0, a = 0.5, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f, z * f); tot += a; a *= 0.5; f *= 2.03; }
  return s / tot;
}

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }

const PLANET_TYPES = [
  {
    type: 'Tellurique', sea: 0.5, ice: true, atm: [90, 160, 255], clouds: 0.9,
    stops: [[0, '#081a40'], [0.42, '#15457d'], [0.5, '#2a78ad'], [0.52, '#cdbb85'], [0.56, '#4b8a3c'], [0.67, '#2e5e2b'], [0.77, '#6b5a45'], [0.88, '#9b9b9b'], [1, '#f4f4f4']],
  },
  {
    type: 'Désertique', sea: 0.36, ice: false, atm: [255, 170, 110], clouds: 0.35,
    stops: [[0, '#2c120b'], [0.3, '#5a2614'], [0.36, '#7a3518'], [0.45, '#a8552a'], [0.62, '#cf8a4a'], [0.8, '#e6bd85'], [1, '#fff0d2']],
  },
  {
    type: 'Exotique', sea: 0.5, ice: true, atm: [170, 120, 255], clouds: 0.7,
    stops: [[0, '#140a33'], [0.44, '#35246f'], [0.5, '#3d7fb8'], [0.52, '#3fb59c'], [0.6, '#2a8a6a'], [0.72, '#6a4fa8'], [0.86, '#a98bd8'], [1, '#efe6ff']],
  },
  {
    type: 'Volcanique', sea: 0.42, ice: false, atm: [255, 110, 70], clouds: 0.5, lava: true,
    stops: [[0, '#ff7a1a'], [0.36, '#d23a0c'], [0.42, '#6b1a0a'], [0.46, '#2a1a18'], [0.62, '#3c2c28'], [0.8, '#5c4a42'], [1, '#8a7a70']],
  },
];

/* Type lunaire : roche grise, sans océan ni nuages, avec cratères */
const LUNAR_TYPE = {
  type: 'Lune', sea: -1, ice: false, atm: [170, 176, 192], clouds: 0, craters: true,
  stops: [[0, '#2f2f34'], [0.35, '#55555b'], [0.6, '#7f7f86'], [0.8, '#a6a6ac'], [1, '#d4d4d9']],
};

/* Couleurs (clair, foncé) d'une lune vue en orbite, selon son type */
const _moonColorCache = {};
function moonColor(seed) {
  if (_moonColorCache[seed]) return _moonColorCache[seed];
  const t = planetTraits(seed, 'moon'), st = t.stops;
  const light = st[Math.floor(st.length * 0.7)][1], dark = st[Math.floor(st.length * 0.35)][1];
  return (_moonColorCache[seed] = [light, dark]);
}

function planetTraits(seed, kind = 'planet') {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  if (kind === 'moon') {
    // chaque lune reçoit un type de planète tiré au sort (tellurique, désertique, exotique, volcanique),
    // avec quelques cratères et moins de nuages
    const mt = PLANET_TYPES[Math.floor(rnd() * PLANET_TYPES.length)];
    const base = mt.type === 'Volcanique' ? 60 : mt.type === 'Désertique' ? 20 : mt.type === 'Exotique' ? -40 : -20;
    const tmin = base - 30 + Math.floor(rnd() * 20);
    return { ...mt, craters: true, clouds: mt.clouds * 0.5, diameter: 2000 + Math.floor(rnd() * 2500), tmin, tmax: tmin + 50, tilt: (rnd() - 0.5) * 0.4 };
  }
  const t = PLANET_TYPES[Math.floor(rnd() * PLANET_TYPES.length)];
  const diameter = 9000 + Math.floor(rnd() * 7000);
  const tBase = t.type === 'Volcanique' ? 80 : t.type === 'Désertique' ? 40 : t.type === 'Exotique' ? -10 : 5;
  const tmin = tBase - 30 + Math.floor(rnd() * 20);
  return { ...t, diameter, tmin, tmax: tmin + 40, tilt: (rnd() - 0.5) * 0.7 };
}

class PlanetRenderer {
  constructor(canvas, wrap, seed, kind = 'planet') {
    this.kind = kind;
    this.canvas = canvas;
    this.wrap = wrap;
    this.ctx = canvas.getContext('2d');
    this.off = document.createElement('canvas');
    this.octx = this.off.getContext('2d');
    this.pulse = 0;
    this.setSeed(seed);
    new ResizeObserver(() => this.resize()).observe(wrap);
  }

  setSeed(seed) {
    this.seed = seed;
    this.traits = planetTraits(seed, this.kind);
    this.genTexture();
    this.genStars();
    this.resize();
  }

  genTexture() {
    const TW = this.TW = 512, TH = this.TH = 256;
    const tr = this.traits;
    const rnd = mulberry32(this.seed);
    const nA = makeNoise3(rnd), nB = makeNoise3(rnd), nC = makeNoise3(rnd);
    const o = rnd() * 100;

    // LUT de couleurs
    const lut = new Uint8ClampedArray(256 * 3);
    const stops = tr.stops.map(([p, c]) => [p, hexToRgb(c)]);
    for (let i = 0; i < 256; i++) {
      const x = i / 255;
      let k = 0;
      while (k < stops.length - 2 && x > stops[k + 1][0]) k++;
      const [p0, c0] = stops[k], [p1, c1] = stops[k + 1];
      const t = Math.min(1, Math.max(0, (x - p0) / (p1 - p0 || 1)));
      for (let j = 0; j < 3; j++) lut[i * 3 + j] = c0[j] + (c1[j] - c0[j]) * t;
    }

    this.tex = new Uint8ClampedArray(TW * TH * 3);
    this.cloud = new Uint8Array(TW * TH);
    this.forestN = new Uint8Array(TW * TH);   // taches de forêt (calme intersidéral)
    this.lights = new Uint8Array(TW * TH);
    this.emissive = new Uint8Array(TW * TH);

    // cratères (lune) : centres aléatoires sur la sphère
    const craters = [];
    if (tr.craters) {
      for (let i = 0; i < 70; i++) {
        const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, q = Math.sqrt(1 - z * z);
        craters.push([q * Math.cos(a), z, q * Math.sin(a), 0.03 + Math.pow(rnd(), 3) * 0.22]);
      }
    }

    for (let y = 0; y < TH; y++) {
      const lat = ((y + 0.5) / TH - 0.5) * Math.PI;
      const cl = Math.cos(lat), sl = Math.sin(lat);
      for (let x = 0; x < TW; x++) {
        const lon = (x / TW) * Math.PI * 2;
        const px = cl * Math.cos(lon), py = sl, pz = cl * Math.sin(lon);
        const i = y * TW + x;

        let h = fbm(nA, px * 1.8 + o, py * 1.8 + o, pz * 1.8 + o, 6);
        h = Math.min(1, Math.max(0, (h - 0.5) * 2.4 + 0.5));
        let r = lut[(h * 255 | 0) * 3], g = lut[(h * 255 | 0) * 3 + 1], b = lut[(h * 255 | 0) * 3 + 2];

        // grain de détail
        const d = (fbm(nC, px * 14, py * 14, pz * 14, 2) - 0.5) * 30;
        r += d; g += d; b += d;

        let isIce = false;
        if (tr.ice) {
          const iceN = Math.abs(sl) + (fbm(nB, px * 4, py * 4, pz * 4, 3) - 0.5) * 0.35;
          if (iceN > 0.86) { isIce = true; const k = Math.min(1, (iceN - 0.86) * 8); r += (238 - r) * k; g += (246 - g) * k; b += (255 - b) * k; }
        }
        for (const [cx, cy, cz, cr] of craters) {
          const d = Math.hypot(px - cx, py - cy, pz - cz);
          if (d < cr * 1.15) {
            const k = d / cr;
            const f = k < 0.85 ? 0.72 + 0.2 * k : k < 1 ? 1.25 : 1.1;   // fond sombre, rebord clair
            r *= f; g *= f; b *= f;
          }
        }
        const ti = i * 3;
        this.tex[ti] = r; this.tex[ti + 1] = g; this.tex[ti + 2] = b;

        // lave émissive (côté nuit)
        if (tr.lava && h < tr.sea) this.emissive[i] = Math.min(255, (tr.sea - h) / tr.sea * 600);

        // nuages
        const c = fbm(nB, px * 2.6 + 50, py * 5.5 + 50, pz * 2.6 + 50, 5);
        this.cloud[i] = Math.min(1, Math.max(0, (c - 0.5) * 3.6)) * 215 * tr.clouds;
        const fo = fbm(nC, px * 3.4 + 20, py * 3.4 + 20, pz * 3.4 + 20, 4);
        this.forestN[i] = Math.min(1, Math.max(0, (fo - 0.35) / 0.35)) * 255;

        // lumières des villes (seuil aléatoire => densité progressive)
        if (h > tr.sea + 0.02 && !isIce) {
          const city = fbm(nC, px * 6, py * 6, pz * 6, 3);
          if (city > 0.52 && rnd() < 0.35) this.lights[i] = 1 + Math.floor(rnd() * 254);
        }
      }
    }
  }

  genStars() {
    const rnd = mulberry32(this.seed + 7);
    this.stars = Array.from({ length: 140 }, () => ({
      x: rnd(), y: rnd(), r: rnd() * 1.1 + 0.2, ph: rnd() * 6.28, sp: 0.5 + rnd() * 2,
    }));
  }

  resize() {
    const css = this.wrap.clientWidth;
    if (!css) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssSize = css;
    this.dpr = dpr;
    this.canvas.width = this.canvas.height = Math.round(css * dpr);
    this.canvas.style.width = this.canvas.style.height = css + 'px';

    // la sphère est calculée à une résolution plafonnée (performance)
    const sphereScale = Math.min(dpr, 1.5, 560 / (css * 0.66));
    const R = this.Rs = Math.max(20, Math.floor(css * 0.33 * sphereScale));
    this.off.width = this.off.height = R * 2;
    this.img = this.octx.createImageData(R * 2, R * 2);

    const tilt = this.traits.tilt, cT = Math.cos(tilt), sT = Math.sin(tilt);
    let Lx = -0.62, Ly = -0.38, Lz = 0.69;
    const ln = Math.hypot(Lx, Ly, Lz); Lx /= ln; Ly /= ln; Lz /= ln;

    const idx = [], u0 = [], row = [], shade = [], rim = [], alpha = [], latA = [], pa = [], pr = [];
    for (let py = 0; py < R * 2; py++) {
      for (let px = 0; px < R * 2; px++) {
        const nx = (px + 0.5 - R) / R, ny = (py + 0.5 - R) / R;
        const d2 = nx * nx + ny * ny;
        if (d2 > 1) continue;
        const nz = Math.sqrt(1 - d2);
        const tx = nx * cT - ny * sT, ty = nx * sT + ny * cT;
        const lon = Math.atan2(tx, nz), lat = Math.asin(Math.max(-1, Math.min(1, ty)));
        idx.push((py * R * 2 + px) * 4);
        u0.push(lon / (Math.PI * 2) + 0.5);
        row.push(Math.min(this.TH - 1, Math.floor((lat / Math.PI + 0.5) * this.TH)) * this.TW);
        shade.push(nx * Lx + ny * Ly + nz * Lz);
        rim.push(1 - nz);
        latA.push(Math.abs(lat) / (Math.PI / 2));
        alpha.push(Math.min(1, (1 - Math.sqrt(d2)) * R * 1.5) * 255);
        pa.push(Math.floor(((Math.atan2(ny, nx) / (Math.PI * 2)) + 1) % 1 * 120) % 120);   // secteur angulaire
        pr.push(Math.sqrt(d2));                                                          // distance au centre (0 à 1)
      }
    }
    this.map = {
      idx: Int32Array.from(idx), u0: Float32Array.from(u0), row: Int32Array.from(row),
      shade: Float32Array.from(shade), rim: Float32Array.from(rim), alpha: Uint8Array.from(alpha), latA: Float32Array.from(latA), n: idx.length,
      pa: Uint8Array.from(pa), pr: Float32Array.from(pr),
    };
  }

  /* Coordonnées CSS relatives au canvas => sur la planète ? */
  hit(x, y) {
    const c = this.cssSize / 2, R = this.cssSize * 0.33 * (this.sizeScale || 1);
    return Math.hypot(x - c, y - c) <= R * 1.04;
  }

  /* Coordonnées CSS => 'moon' / 'parent' si on clique sur l'astre en orbite */
  /* retourne { kind: 'moon', index } ou { kind: 'parent' } */
  hitOrbiter(x, y) {
    if (!this.hot) return null;
    const px = x * this.dpr, py = y * this.dpr;
    let best = null, bd = Infinity;
    for (const h of this.hot) {
      const d = Math.hypot(px - h.x, py - h.y);
      if (d > Math.max(h.r * 1.5, 16 * this.dpr)) continue;
      if (h.z < 0 && this.hit(x, y)) continue;   // caché derrière le corps principal
      if (d < bd) { bd = d; best = { kind: h.kind, index: h.index }; }
    }
    return best;
  }

  bump(k = 1) { this.pulse = k; }

  /* Explosions de combat (n explosions échelonnées).
     where : 'space' → dans l'espace autour de la planète (victoire),
             'planet' → sur la surface de la planète (défaite) */
  /* Victoire : bouclier « champ de force » hexagonal bleu clair autour de la planète (≈ 3,5 s).
     Des impacts font onduler le bouclier là où les tirs pirates frappent. */
  shield() {
    const now = performance.now();
    this.shieldFx = {
      start: now,
      hits: Array.from({ length: 5 }, (_, i) => {
        const a = Math.random() * Math.PI * 2;
        return { t0: now + 250 + i * 420 + Math.random() * 200, x: Math.cos(a) * 0.8, y: Math.sin(a) * 0.8 };
      }),
    };
  }

  drawShield(t, cx, cy, R) {
    const F = this.shieldFx;
    if (!F) return;
    const DUR = 3500, age = t - F.start;
    if (age > DUR) { this.shieldFx = null; return; }
    const k = Math.min(1, age / 350, (DUR - age) / 900);   // apparition / disparition
    if (k <= 0) return;
    const ctx = this.ctx, SR = R * 1.16;                  // rayon du bouclier
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // voile bleu + liseré
    const veil = ctx.createRadialGradient(cx, cy, SR * 0.55, cx, cy, SR);
    veil.addColorStop(0, 'rgba(120,210,255,0)');
    veil.addColorStop(0.85, `rgba(120,210,255,${0.12 * k})`);
    veil.addColorStop(1, `rgba(170,235,255,${0.45 * k})`);
    ctx.fillStyle = veil;
    ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2); ctx.fill();
    // impacts actifs (onde qui se propage)
    const hits = F.hits.map(h => ({ ...h, p: (t - h.t0) / 700 })).filter(h => h.p >= 0 && h.p <= 1);
    // grille d'hexagones projetée sur une sphère (plus serrés vers le bord)
    const hs = 0.11, w = Math.sqrt(3) * hs;
    const sph = (u, v) => {                               // disque plat → aspect sphérique
      const r = Math.hypot(u, v); if (r < 1e-6) return [cx, cy];
      const r2 = Math.sin(Math.min(1, r) * Math.PI / 2);
      return [cx + u / r * r2 * SR, cy + v / r * r2 * SR];
    };
    const rot = t * 0.00004;
    ctx.lineWidth = Math.max(1, this.dpr * 0.9);
    for (let row = -12; row <= 12; row++) {
      for (let col = -12; col <= 12; col++) {
        let hx = col * w + (row & 1 ? w / 2 : 0), hy = row * hs * 1.5;
        const cr = Math.cos(rot), sr = Math.sin(rot);
        [hx, hy] = [hx * cr - hy * sr, hx * sr + hy * cr];
        const d = Math.hypot(hx, hy);
        if (d > 0.98) continue;
        // intensité : plus vive au bord, scintillement, renforcée par les impacts
        let a = 0.12 + 0.45 * Math.pow(d, 3) + 0.08 * Math.sin(t * 0.004 + row * 1.3 + col * 0.7);
        for (const h of hits) {
          const dd = Math.hypot(hx - h.x, hy - h.y), front = Math.abs(dd - h.p * 0.9);
          if (front < 0.12) a += (1 - front / 0.12) * (1 - h.p) * 1.4;
          if (dd < 0.15) a += (1 - h.p) * 0.8;
        }
        a = Math.min(1, a) * k;
        if (a < 0.03) continue;
        ctx.beginPath();
        for (let v = 0; v < 6; v++) {
          const ang = Math.PI / 6 + v * Math.PI / 3;
          const [px, py] = sph(hx + Math.cos(ang) * hs * 0.94, hy + Math.sin(ang) * hs * 0.94);
          v ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(90,190,255,${a * 0.1})`;
        ctx.strokeStyle = `rgba(130,215,255,${a * 0.8})`;
        ctx.fill(); ctx.stroke();
      }
    }
    // éclat aux points d'impact
    for (const h of hits) {
      const [px, py] = sph(h.x, h.y), r = SR * 0.22 * (0.4 + h.p);
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(230,250,255,${(1 - h.p) * 0.9 * k})`);
      g.addColorStop(1, 'rgba(120,210,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  explode(n = 6, where = 'space') {
    const now = performance.now();
    this.booms = this.booms || [];
    for (let i = 0; i < n; i++) {
      const onPlanet = where === 'planet';
      this.booms.push({
        t0: now + i * 140 + Math.random() * 250,
        ang: Math.random() * Math.PI * 2,
        rad: onPlanet ? Math.sqrt(Math.random()) * 0.85 : 1.14 + Math.random() * 0.34,
        flat: 1,
        size: 0.6 + Math.random() * 0.9,
        parts: Array.from({ length: 9 }, () => ({ a: Math.random() * Math.PI * 2, v: 0.5 + Math.random() })),
      });
    }
  }

  /* Impôt galactique : un gros vaisseau collecteur arrive, se pose au-dessus de la planète
     (faisceau de prélèvement) puis repart. Durée totale ≈ 9 s. */
  TAX_ARRIVE_MS = 2600;   // arrivée du vaisseau : le faisceau s'allume ensuite
  taxShip() { this.tax = { start: performance.now() }; }

  drawTaxShip(t, cx, cy, R) {
    const T = this.tax;
    if (!T) return;
    const W = this.canvas.width, age = t - T.start;
    const ARRIVE = this.TAX_ARRIVE_MS, STAY = 4200, LEAVE = 2400;
    if (age > ARRIVE + STAY + LEAVE) { this.tax = null; return; }
    const ease = p => p < 0 ? 0 : p > 1 ? 1 : 1 - Math.pow(1 - p, 3);
    const easeIn = p => p < 0 ? 0 : p > 1 ? 1 : p * p * p;
    const size = R * 0.8;   // vaisseau long
    const hover = { x: cx, y: cy - R * 0.62 };
    let x, y, beam = 0, tilt = 0;
    if (age < ARRIVE) {                       // arrivée depuis la droite, freinage
      const p = ease(age / ARRIVE);
      x = W + size * 1.2 + (hover.x - W - size * 1.2) * p;
      y = cy - R * 1.05 + (hover.y - (cy - R * 1.05)) * p;
      tilt = -0.08 * (1 - p);
    } else if (age < ARRIVE + STAY) {         // stationnaire + faisceau de prélèvement
      const p = (age - ARRIVE) / STAY;
      x = hover.x; y = hover.y + Math.sin(age * 0.003) * R * 0.015;
      beam = Math.min(1, p * 5, (1 - p) * 5);
    } else {                                  // départ vers la gauche, accélération
      const p = easeIn((age - ARRIVE - STAY) / LEAVE);
      x = hover.x + (-size * 1.4 - hover.x) * p;
      y = hover.y + (cy - R * 1.15 - hover.y) * p;
      tilt = 0.1 * p;
    }
    const ctx = this.ctx;
    // faisceau doré vers la surface
    if (beam > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const top = y + size * 0.12, bot = cy + R * 0.05;
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, `rgba(255,220,120,${0.55 * beam})`);
      g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - size * 0.12, top); ctx.lineTo(x + size * 0.12, top);
      ctx.lineTo(x + size * 0.42, bot); ctx.lineTo(x - size * 0.42, bot); ctx.closePath(); ctx.fill();
      // particules aspirées vers le vaisseau
      ctx.fillStyle = `rgba(255,236,170,${0.9 * beam})`;
      for (let i = 0; i < 14; i++) {
        const q = (t * 0.0005 + i / 14) % 1, xx = x + Math.sin(i * 7.3) * size * 0.3 * q;
        ctx.fillRect(xx, bot - (bot - top) * q, this.dpr * 1.8, this.dpr * 1.8);
      }
      ctx.restore();
    }
    // ---------- vaisseau en 3D : maillage projeté en perspective, éclairé ----------
    // lacet (yaw) : le vaisseau pivote pendant l'approche, se présente de 3/4, puis repart
    let yaw;
    if (age < ARRIVE) yaw = 0.75 - 0.45 * ease(age / ARRIVE);
    else if (age < ARRIVE + STAY) yaw = 0.3 + 0.05 * Math.sin(age * 0.0015);
    else yaw = 0.3 - 0.9 * easeIn((age - ARRIVE - STAY) / LEAVE);
    this.drawShip3D(ctx, x, y, size, yaw, tilt, t);
  }

  /* Maillage du vaisseau collecteur (coordonnées : x = longueur, proue vers −x ; y = haut ; z = largeur) */
  taxShipMesh() {
    if (this._taxMesh) return this._taxMesh;
    const quads = [], add = (pts, col, kind) => quads.push({ pts, col, kind });
    const box = (x0, x1, y0, y1, z0, z1, col, kind = 'hull') => {
      const v = (x, y, z) => [x, y, z];
      add([v(x0, y1, z0), v(x1, y1, z0), v(x1, y1, z1), v(x0, y1, z1)], col, kind);       // dessus
      add([v(x0, y0, z1), v(x1, y0, z1), v(x1, y0, z0), v(x0, y0, z0)], col, kind);       // dessous
      add([v(x0, y0, z0), v(x1, y0, z0), v(x1, y1, z0), v(x0, y1, z0)], col, kind);       // flanc avant (z0)
      add([v(x1, y0, z1), v(x0, y0, z1), v(x0, y1, z1), v(x1, y1, z1)], col, kind);       // flanc arrière (z1)
      add([v(x0, y0, z1), v(x0, y0, z0), v(x0, y1, z0), v(x0, y1, z1)], col, kind);       // proue (carrée)
      add([v(x1, y0, z0), v(x1, y0, z1), v(x1, y1, z1), v(x1, y1, z0)], col, kind);       // poupe
    };
    box(-0.55, 0.5, -0.12, 0.12, -0.16, 0.16, [40, 46, 58]);            // coque principale
    box(-0.45, 0.38, 0.12, 0.2, -0.1, 0.1, [32, 37, 48]);               // pont supérieur
    box(-0.02, 0.24, 0.2, 0.33, -0.06, 0.06, [26, 30, 40]);             // passerelle
    box(0.5, 0.6, -0.08, 0.08, -0.13, -0.03, [55, 62, 78], 'engine');   // réacteurs
    box(0.5, 0.6, -0.08, 0.08, 0.03, 0.13, [55, 62, 78], 'engine');
    box(-0.3, 0.3, -0.2, -0.12, -0.07, 0.07, [30, 34, 44]);             // quille
    return (this._taxMesh = quads);
  }

  drawShip3D(ctx, X, Y, size, yaw, roll, t) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), pitch = 0.32, cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cr = Math.cos(roll), sr = Math.sin(roll), F = 3.2;          // focale (perspective douce)
    const rot = ([x, y, z]) => {
      let X1 = x * cy + z * sy, Z1 = -x * sy + z * cy;                // lacet (axe vertical)
      let Y1 = y * cp - Z1 * sp; Z1 = y * sp + Z1 * cp;               // tangage (vue légèrement du dessus)
      return [X1 * cr - Y1 * sr, X1 * sr + Y1 * cr, Z1];              // roulis
    };
    const proj = ([x, y, z]) => { const k = F / (F + z); return [X + x * size * k, Y - y * size * k, z]; };
    let Lx = -0.4, Ly = 0.75, Lz = -0.55; const ln = Math.hypot(Lx, Ly, Lz); Lx /= ln; Ly /= ln; Lz /= ln;

    // aura bleue
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.85 + 0.15 * Math.sin(t * 0.004);
    const aura = ctx.createRadialGradient(X, Y, size * 0.1, X, Y, size * 0.85);
    aura.addColorStop(0, `rgba(70,150,255,${0.42 * pulse})`); aura.addColorStop(0.5, `rgba(40,110,255,${0.16 * pulse})`); aura.addColorStop(1, 'rgba(20,60,200,0)');
    ctx.fillStyle = aura; ctx.beginPath(); ctx.ellipse(X, Y, size * 0.85, size * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // faces : rotation, normale, tri du fond vers l'avant
    const faces = [];
    for (const q of this.taxShipMesh()) {
      const r = q.pts.map(rot);
      const ux = r[1][0] - r[0][0], uy = r[1][1] - r[0][1], uz = r[1][2] - r[0][2];
      const vx = r[3][0] - r[0][0], vy = r[3][1] - r[0][1], vz = r[3][2] - r[0][2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      if (nz > 0.02) continue;                                       // face tournée vers l'arrière : invisible
      const depth = r.reduce((a, p) => a + p[2], 0) / 4;
      faces.push({ q, r, n: [nx, ny, nz], depth });
    }
    faces.sort((a, b) => b.depth - a.depth);
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(0.6, this.dpr * 0.6);
    for (const f of faces) {
      const diff = Math.max(0, -(f.n[0] * Lx + f.n[1] * Ly + f.n[2] * Lz));
      const k = 0.35 + 0.95 * diff;
      const [cr0, cg0, cb0] = f.q.col;
      const P = f.r.map(proj);
      ctx.beginPath(); P.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.closePath();
      ctx.fillStyle = `rgb(${Math.min(255, cr0 * k + 8) | 0},${Math.min(255, cg0 * k + 10) | 0},${Math.min(255, cb0 * k + 16) | 0})`;
      ctx.strokeStyle = 'rgba(110,170,255,0.45)';
      ctx.fill(); ctx.stroke();
      // hublots bleus sur les grands flancs de la coque, répartis sur la face (interpolation bilinéaire)
      const isSide = Math.abs(f.n[2]) > 0.25 && Math.abs(f.n[1]) < 0.85;
      const isHullSide = f.q.kind === 'hull' && isSide && Math.abs(f.q.pts[0][2] - f.q.pts[2][2]) < 1e-6;
      if (isHullSide) {
        const len = Math.abs(f.q.pts[1][0] - f.q.pts[0][0]);
        const cols = Math.max(4, Math.round(len * 28)), rows = f.q.pts[2][1] - f.q.pts[0][1] > 0.15 ? 3 : 1;
        const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
        ctx.save(); ctx.fillStyle = '#7fd3ff'; ctx.shadowColor = '#4fa8ff'; ctx.shadowBlur = 3 * this.dpr;
        for (let j = 0; j < rows; j++) {
          const v = rows === 1 ? 0.5 : 0.25 + j * 0.25;
          for (let i = 0; i < cols; i++) {
            if ((i * 7 + j * 3) % 6 === 0 && Math.sin(t * 0.002 + i) > 0.5) continue;
            const u = (i + 0.5) / cols;
            const A = lerp(lerp(P[0], P[1], u), lerp(P[3], P[2], u), v);
            const w = Math.max(this.dpr * 0.9, size * 0.012), h = Math.max(this.dpr * 0.9, size * 0.014);
            ctx.fillRect(A[0] - w / 2, A[1] - h / 2, w, h);
          }
        }
        ctx.restore();
      }
      // lueur des réacteurs
      if (f.q.kind === 'engine' && f.n[0] > 0.3) {
        const c = P.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
        const fl = 0.8 + 0.2 * Math.sin(t * 0.04);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], size * 0.12 * fl);
        g.addColorStop(0, 'rgba(210,245,255,0.95)'); g.addColorStop(0.45, 'rgba(80,180,255,0.6)'); g.addColorStop(1, 'rgba(40,120,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], size * 0.12 * fl, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }


  /* Rébellion : la planète s'embrase pendant `dur` ms (foyers répartis sur le disque) */
  burn(dur = 10000) {
    const now = performance.now();
    // les foyers sont placés sur la face visible puis convertis en coordonnées de surface
    // (longitude / latitude) : ils tournent ensuite avec la planète
    const tilt = this.traits.tilt, cT = Math.cos(tilt), sT = Math.sin(tilt), rot = now * 0.000011;
    this.fire = {
      start: now, end: now + dur,
      flames: Array.from({ length: 16 }, () => {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 0.78;
        const nx = Math.cos(a) * d, ny = Math.sin(a) * d, nz = Math.sqrt(1 - nx * nx - ny * ny);
        const tx = nx * cT - ny * sT, ty = nx * sT + ny * cT;
        const lon = (Math.atan2(tx, nz) / (Math.PI * 2) + 0.5) + rot;   // longitude de surface (en tours)
        return { lon, lat: Math.asin(Math.max(-1, Math.min(1, ty))), s: 0.6 + Math.random() * 0.8, ph: Math.random() * 100 };
      }),
    };
  }

  /* ---------- Bâtiments visibles sur la planète ----------
     Chaque type de bâtiment forme une petite colonie à un endroit fixe de la surface ;
     plus son niveau est élevé, plus il y a de structures (jusqu'à 6) et plus elles sont grandes. */
  structureSites() {
    if (this._sites && this._sites.seed === this.seed) return this._sites;
    const kinds = [
      ['mineFerrite', 'tower', '#d9a066'], ['mineDeuterium', 'tank', '#4fd1c5'], ['darkMatterCollector', 'dish', '#a77bff'],
      ['storeFerrite', 'cubes', '#d9a066'], ['storeDeuterium', 'cylinder', '#4fd1c5'], ['storeDarkMatter', 'darksphere', '#a77bff'],
      ['shipyard', 'hangar', '#ff8c5a'], ['jackpot', 'collider', '#a77bff'],
    ];
    // accélérateur et usine spatiale : un seul bâtiment qui grandit avec le niveau
    const SINGLE = { jackpot: true, shipyard: true };
    const rnd = mulberry32(this.seed ^ 0x2545f491), out = { seed: this.seed, list: [] };
    const vec = (lon, lat) => [Math.cos(lat) * Math.sin(lon * Math.PI * 2), Math.sin(lat), Math.cos(lat) * Math.cos(lon * Math.PI * 2)];
    const ang = (p, q) => { const u = vec(p.lon, p.lat), v = vec(q.lon, q.lat); return Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))); };
    const placed = [];   // tous les emplacements, tous types confondus : { lon, lat, rad }
    const free = c => placed.every(q => ang(c, q) > c.rad + q.rad);
    kinds.forEach(([id, shape, color], k) => {
      const single = !!SINGLE[id], rad = single ? 0.23 : 0.13, want = single ? 1 : 6;
      const sites = [];
      // centre de la colonie : réparti autour de la planète, loin des pôles, sans toucher les autres
      let c0 = null;
      for (let g = 0; g < 300 && !c0; g++) {
        const c = { lon: (k / kinds.length + (g ? rnd() : rnd() * 0.08)) % 1, lat: (rnd() - 0.5) * (g < 100 ? 1.0 : 1.6), rad };
        if (free(c)) c0 = c;
      }
      if (!c0) c0 = { lon: k / kinds.length, lat: 0, rad };
      sites.push(c0); placed.push(c0);
      // autres structures du même type : autour du centre, sans chevauchement
      for (let g = 0; sites.length < want && g < 600; g++) {
        const a0 = rnd() * Math.PI * 2, dd = 2 * rad + 0.02 + rnd() * 0.35;
        const c = { lon: c0.lon + Math.cos(a0) * dd / (2 * Math.PI * Math.max(0.3, Math.cos(c0.lat))), lat: Math.max(-1.2, Math.min(1.2, c0.lat + Math.sin(a0) * dd)), rad };
        if (free(c)) { sites.push(c); placed.push(c); }
      }
      while (sites.length < want) sites.push(null);
      out.list.push({ id, shape, color, sites, single });
    });
    return (this._sites = out);
  }

  /* Bâtiments en 3D : chaque structure est posée dans le repère local de la surface
     (est, nord, normale) puis projetée. Elle suit ainsi la rotation de la planète sans pivoter
     sur elle-même ; les faces sont éclairées selon leur orientation. */
  drawStructures(t, cx, cy, R, levels) {
    const ctx = this.ctx, d = this.dpr;
    let Lx = -0.62, Ly = -0.38, Lz = 0.69; const ln = Math.hypot(Lx, Ly, Lz); Lx /= ln; Ly /= ln; Lz /= ln;
    const tilt = this.traits.tilt, cT = Math.cos(tilt), sT = Math.sin(tilt);
    const rot = v => [v[0] * cT + v[1] * sT, -v[0] * sT + v[1] * cT, v[2]];
    const items = [];
    for (const b of this.structureSites().list) {
      const L = levels[b.id] || 0;
      if (!L) continue;
      // un seul bâtiment qui grandit (accélérateur, usine) ou plusieurs (jusqu'à 6) avec le niveau
      const count = b.single ? 1 : Math.min(6, 1 + Math.floor(L / 4));
      const size = b.single ? R * 0.055 * (1 + 0.045 * Math.min(L, 30)) : R * 0.06 * (1 + 0.015 * Math.min(L, 30));
      for (let i = 0; i < count; i++) {
        const st = b.sites[i];
        if (!st) continue;
        const A = (st.lon - t * 0.000011 - 0.5) * Math.PI * 2, cl = Math.cos(st.lat), sl = Math.sin(st.lat);
        const n = rot([cl * Math.sin(A), sl, cl * Math.cos(A)]);
        if (n[2] < 0.06) continue;                                        // face cachée
        const e = rot([Math.cos(A), 0, -Math.sin(A)]), no = rot([-sl * Math.sin(A), cl, -sl * Math.cos(A)]);
        items.push({ x: cx + n[0] * R, y: cy + n[1] * R, n, e, no, depth: n[2], b, i, s: size * (i === 0 ? 1 : 0.75),
          light: n[0] * Lx + n[1] * Ly + n[2] * Lz });
      }
    }
    items.sort((a, b) => a.depth - b.depth);
    const shade = (hex, k) => { const v = parseInt(hex.slice(1), 16); const f = c => Math.max(0, Math.min(255, c * k)) | 0; return `rgb(${f((v >> 16) & 255)},${f((v >> 8) & 255)},${f(v & 255)})`; };
    for (const it of items) {
      const { x, y, n, e, no, s, b } = it;
      const day = Math.max(0.3, Math.min(1.1, 0.45 + it.light * 0.8));   // jour / nuit à cet endroit
      // repère local → écran
      const W = (a, bb, h) => [a * e[0] + bb * no[0] + h * n[0], a * e[1] + bb * no[1] + h * n[1], a * e[2] + bb * no[2] + h * n[2]];
      const P = (a, bb, h) => { const w = W(a, bb, h); return [x + w[0] * s, y + w[1] * s]; };
      const Z = (a, bb, h) => W(a, bb, h)[2];
      const lit = v => { const w = W(v[0], v[1], v[2]); return day * Math.max(0.35, Math.min(1.25, 0.55 + 0.7 * (w[0] * Lx + w[1] * Ly + w[2] * Lz))); };
      const poly = (pts, fill, stroke) => {
        ctx.beginPath(); pts.forEach((p, k) => { const q = P(p[0], p[1], p[2]); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(0.4, s * 0.025); ctx.stroke(); }
      };
      const line = (p, q, col, w) => {
        const A = P(p[0], p[1], p[2]), B = P(q[0], q[1], q[2]);
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.5, s * w); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      };
      // pavé : seules les faces tournées vers nous sont dessinées
      const box = (a, bb, h, da, db, dh, col, edge) => {
        const F = [
          [[-1, 0, 0], [[a, bb, h], [a, bb + db, h], [a, bb + db, h + dh], [a, bb, h + dh]]],
          [[1, 0, 0], [[a + da, bb, h], [a + da, bb + db, h], [a + da, bb + db, h + dh], [a + da, bb, h + dh]]],
          [[0, -1, 0], [[a, bb, h], [a + da, bb, h], [a + da, bb, h + dh], [a, bb, h + dh]]],
          [[0, 1, 0], [[a, bb + db, h], [a + da, bb + db, h], [a + da, bb + db, h + dh], [a, bb + db, h + dh]]],
          [[0, 0, 1], [[a, bb, h + dh], [a + da, bb, h + dh], [a + da, bb + db, h + dh], [a, bb + db, h + dh]]],
        ];
        for (const [nv, pts] of F) if (W(nv[0], nv[1], nv[2])[2] > 0) poly(pts, shade(col, lit(nv)), edge || 'rgba(0,0,0,.35)');
      };
      // cylindre dressé selon la normale
      const cyl = (a, bb, h, r, H, col, N = 16, capCol) => {
        for (let k = 0; k < N; k++) {
          const a0 = k / N * Math.PI * 2, a1 = (k + 1) / N * Math.PI * 2, am = (a0 + a1) / 2;
          const nv = [Math.cos(am), Math.sin(am), 0];
          if (W(nv[0], nv[1], 0)[2] <= 0) continue;
          poly([[a + r * Math.cos(a0), bb + r * Math.sin(a0), h], [a + r * Math.cos(a1), bb + r * Math.sin(a1), h],
            [a + r * Math.cos(a1), bb + r * Math.sin(a1), h + H], [a + r * Math.cos(a0), bb + r * Math.sin(a0), h + H]], shade(col, lit(nv)));
        }
        const cap = []; for (let k = 0; k < N; k++) { const q = k / N * Math.PI * 2; cap.push([a + r * Math.cos(q), bb + r * Math.sin(q), h + H]); }
        poly(cap, shade(capCol || col, lit([0, 0, 1]) * 1.1), 'rgba(0,0,0,.3)');
      };
      // anneau horizontal (moitié arrière ou avant, pour passer derrière / devant un objet)
      const ring = (h, r, col, w, front) => {
        const zc = Z(0, 0, h), N = 28;
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.5, s * w); ctx.beginPath();
        let on = false;
        for (let k = 0; k <= N; k++) {
          const q = k / N * Math.PI * 2, a = r * Math.cos(q), bb = r * Math.sin(q), isFront = Z(a, bb, h) >= zc;
          const pt = P(a, bb, h);
          if (isFront === front) { on ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]); on = true; } else on = false;
        }
        ctx.stroke();
      };
      const sphere = (a, bb, h, r, c0, c1, c2) => {
        const c = P(a, bb, h), rr = r * s;
        const g = ctx.createRadialGradient(c[0] + Lx * rr * 0.45, c[1] + Ly * rr * 0.45, rr * 0.08, c[0], c[1], rr);
        g.addColorStop(0, shade(c0, day)); g.addColorStop(0.5, shade(c1, day)); g.addColorStop(1, shade(c2, day));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], rr, 0, Math.PI * 2); ctx.fill();
      };
      const glow = (a, bb, h, r, col) => {
        const c = P(a, bb, h);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], r * s);
        g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c[0], c[1], r * s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      };
      const blink = (a, bb, h, ph) => {
        if (Math.sin(t * 0.006 + it.i * 1.7 + ph) < -0.1) return;
        const c = P(a, bb, h); ctx.fillStyle = 'rgba(255,80,70,0.95)';
        ctx.beginPath(); ctx.arc(c[0], c[1], Math.max(d * 0.6, s * 0.07), 0, Math.PI * 2); ctx.fill();
      };
      const steel = shade('#9aa4b0', day), accent = shade(b.color, Math.max(0.6, day));
      ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';

      const shape = b.shape;
      if (shape === 'tower') {                          // mine de ferrite : tour d'acier pyramidale en treillis
        const H = 3.4, hw = u => 0.1 + 0.8 * Math.pow(1 - u, 2.3), hgt = u => 0.1 + u * H;
        const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        const pt = (c, u) => [C[c][0] * hw(u), C[c][1] * hw(u), hgt(u)];
        const lv = [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85];
        // croisillons sur les 4 faces
        for (let c = 0; c < 4; c++) for (let k = 0; k < lv.length - 1; k++) {
          const c2 = (c + 1) % 4;
          line(pt(c, lv[k]), pt(c2, lv[k + 1]), shade('#5d6672', day), 0.03);
          line(pt(c2, lv[k]), pt(c, lv[k + 1]), shade('#5d6672', day), 0.03);
        }
        // arêtes
        for (let c = 0; c < 4; c++) for (let k = 0; k < 10; k++) line(pt(c, k / 10), pt(c, (k + 1) / 10), steel, 0.08);
        // plateformes
        for (const u of [0.25, 0.55]) { const w = hw(u) + 0.12; box(-w, -w, hgt(u), 2 * w, 2 * w, 0.07, b.color); }
        line([0, 0, hgt(1)], [0, 0, hgt(1) + 0.45], steel, 0.04);
        glow(0, 0, 0.3, 0.55, 'rgba(255,140,60,0.35)');
        blink(0, 0, hgt(1) + 0.5, 0);
      } else if (shape === 'tank') {                    // mine de deutérium : socle et sphère en suspension
        const ph = t * 0.0025 + it.i * 1.3;
        cyl(0, 0, 0, 0.75, 0.28, '#7d8794');
        cyl(0, 0, 0.28, 0.45, 0.2, '#4a525e', 16, '#7fd3ff');
        const hs = 1.45 + 0.12 * Math.sin(ph);
        glow(0, 0, (0.5 + hs) / 2, 0.45, 'rgba(127,211,255,0.35)');
        ring(hs, 0.8, shade('#cfe9ff', day), 0.045, false);
        sphere(0, 0, hs, 0.5, '#e6fbff', '#4fb8ff', '#0f3a6a');
        ring(hs, 0.8, shade('#cfe9ff', day), 0.045, true);
        glow(0, 0, hs, 0.9, `rgba(79,184,255,${0.25 + 0.12 * Math.sin(ph * 2)})`);
      } else if (shape === 'collider') {                  // accélérateur : anneau de collision métallique avec 4 détecteurs
        const rt = 0.18, hr = rt, Rr = 1.0, N = 36, parts = [];
        for (let k = 0; k < N; k++) { const q = k / N * Math.PI * 2; parts.push({ a: Rr * Math.cos(q), b: Rr * Math.sin(q), k }); }
        for (const d of [0, 1, 2, 3]) { const q = d * Math.PI / 2 + Math.PI / 4; parts.push({ a: Rr * Math.cos(q), b: Rr * Math.sin(q), det: true }); }
        parts.sort((p1, p2) => Z(p1.a, p1.b, hr) - Z(p2.a, p2.b, hr));
        for (const pt of parts) {
          if (pt.det) box(pt.a - 0.22, pt.b - 0.22, 0, 0.44, 0.44, 0.5, '#a77bff');
          else sphere(pt.a, pt.b, hr, rt, '#e3e9f0', '#9aa4b0', '#4a525e');
        }
        cyl(0, 0, 0, 0.32, 0.35, '#d7dee7', 16, '#ffffff');                   // centre de contrôle
      } else if (shape === 'cubes') {                   // stockage de ferrite : cubes noirs empilés
        const cubes = [[-0.95, -0.95, 0], [0.05, -0.95, 0], [-0.95, 0.05, 0], [0.05, 0.05, 0], [-0.45, -0.45, 0.9]];
        cubes.sort((p, q) => (Z(p[0] + 0.45, p[1] + 0.45, p[2]) - Z(q[0] + 0.45, q[1] + 0.45, q[2])) || p[2] - q[2]);
        for (const [a, bb, h] of cubes) box(a, bb, h, 0.9, 0.9, 0.9, '#23262d', shade('#d9a066', Math.max(0.5, day) * 0.8));
      } else if (shape === 'cylinder') {                // stockage de deutérium : grand cylindre bleu
        cyl(0, 0, 0.1, 0.72, 2.0, '#2f7fd6', 20, '#9fd4ff');
        ring(0.8, 0.72, shade('#0c2440', day), 0.035, true);
        ring(1.5, 0.72, shade('#0c2440', day), 0.035, true);
        blink(0, 0, 2.15, 1);
      } else if (shape === 'darksphere') {              // stockage de matière noire : sphère noire dans une structure d'acier
        const hs = 1.15, legs = [0, 1, 2, 3].map(k => [Math.cos(k * Math.PI / 2 + 0.785) * 0.95, Math.sin(k * Math.PI / 2 + 0.785) * 0.95]);
        const back = legs.filter(([a, bb]) => Z(a, bb, hs) < Z(0, 0, hs)), front = legs.filter(l => !back.includes(l));
        const leg = ([a, bb]) => { line([a, bb, 0.1], [a, bb, 2.1], steel, 0.07); line([a, bb, 0.1], [a * 0.6, bb * 0.6, hs], shade('#6b7480', day), 0.04); };
        back.forEach(leg);
        ring(hs, 1.0, steel, 0.06, false); ring(2.1, 0.95, steel, 0.06, false);
        sphere(0, 0, hs, 0.78, '#4a3a6a', '#120b1f', '#000000');
        glow(0, 0, hs, 0.95, 'rgba(167,123,255,0.25)');
        front.forEach(leg);
        ring(hs, 1.0, steel, 0.06, true); ring(2.1, 0.95, steel, 0.06, true);
      } else if (shape === 'hangar') {                    // usine spatiale : hangar voûté texturé, tour de contrôle, vaisseaux qui sortent
        const L = 1.3, Rv = 0.7, N = 16, front = W(1, 0, 0)[2] > 0 ? 1 : -1;
        const vp = (a, q, r = Rv) => [a, -r * Math.cos(q), r * Math.sin(q)];   // point de la voûte (q de 0 à π)
        const hall = () => {
          // pignon arrière
          const gable = sa => {
            const pts = []; for (let k = 0; k <= N; k++) pts.push(vp(sa * L, Math.PI * k / N));
            poly(pts, shade('#c3ccd6', lit([sa, 0, 0])), 'rgba(0,0,0,.35)');
            // grande porte à lamelles, encadrée d'orange
            const dw = Rv * 0.5, dh = Rv * 0.68, x0 = sa * L * 1.002;
            poly([[x0, -dw - 0.05, 0], [x0, dw + 0.05, 0], [x0, dw + 0.05, dh + 0.05], [x0, -dw - 0.05, dh + 0.05]], shade('#ff8c5a', day));
            poly([[x0, -dw, 0], [x0, dw, 0], [x0, dw, dh], [x0, -dw, dh]], shade('#26313f', day));
            for (let k = 1; k < 6; k++) line([x0, -dw, dh * k / 6], [x0, dw, dh * k / 6], shade('#3c4a5c', day), 0.018);
            poly([[x0, -dw, dh * 0.82], [x0, dw, dh * 0.82], [x0, dw, dh], [x0, -dw, dh]], shade('#7fd3ff', Math.max(0.8, day)));   // imposte vitrée
            // feux de part et d'autre de la porte
            if (Math.sin(t * 0.006 + it.i) > 0) { glow(x0, -dw - 0.12, 0.12, 0.1, 'rgba(255,209,102,0.95)'); glow(x0, dw + 0.12, 0.12, 0.1, 'rgba(255,209,102,0.95)'); }
          };
          gable(-front);
          // voûte : panneaux longitudinaux aux teintes alternées, verrière au sommet, fenêtres éclairées en bas
          const P4 = 4;
          for (let k = 0; k < N; k++) {
            const q0 = Math.PI * k / N, q1 = Math.PI * (k + 1) / N, qm = (q0 + q1) / 2, nv = [0, -Math.cos(qm), Math.sin(qm)];
            if (W(nv[0], nv[1], nv[2])[2] <= 0) continue;
            const glass = k >= 7 && k <= 8, low = k === 1 || k === N - 2;
            for (let j = 0; j < P4; j++) {
              const a0 = -L + 2 * L * j / P4, a1 = -L + 2 * L * (j + 1) / P4;
              const base = glass ? '#8fd0ff' : (j + k) % 2 ? '#f1f4f8' : '#dde3ea';
              poly([[a0, ...vp(0, q0).slice(1)], [a1, ...vp(0, q0).slice(1)], [a1, ...vp(0, q1).slice(1)], [a0, ...vp(0, q1).slice(1)]],
                shade(base, lit(nv) * (glass ? 1.05 : 1)), 'rgba(40,50,62,.18)');
              if (low) for (let w = 0; w < 3; w++) {                                 // fenêtres
                const wa = a0 + (a1 - a0) * (0.2 + w * 0.25), wb = wa + (a1 - a0) * 0.14, qa = q0 + (q1 - q0) * 0.25, qb = q0 + (q1 - q0) * 0.75;
                poly([[wa, ...vp(0, qa, Rv * 1.003).slice(1)], [wb, ...vp(0, qa, Rv * 1.003).slice(1)], [wb, ...vp(0, qb, Rv * 1.003).slice(1)], [wa, ...vp(0, qb, Rv * 1.003).slice(1)]],
                  (w + j + it.i) % 4 ? 'rgba(255,214,130,0.95)' : shade('#33414f', day));
              }
            }
          }
          // nervures porteuses et bande de rive orange
          for (const ra of [-1, -0.5, 0, 0.5, 1]) for (let k = 0; k < N; k++) {
            const q0 = Math.PI * k / N, q1 = Math.PI * (k + 1) / N, nv = [0, -Math.cos((q0 + q1) / 2), Math.sin((q0 + q1) / 2)];
            if (W(nv[0], nv[1], nv[2])[2] > 0) line(vp(ra * L, q0, Rv * 1.01), vp(ra * L, q1, Rv * 1.01), shade(Math.abs(ra) === 1 ? '#7d8794' : '#a9b3bf', day), Math.abs(ra) === 1 ? 0.05 : 0.03);
          }
          for (const sb of [-1, 1]) if (W(0, sb, 0)[2] > 0) line([-L, sb * Rv * 1.01, 0.06], [L, sb * Rv * 1.01, 0.06], shade('#ff8c5a', day), 0.04);
          gable(front);
          glow(front * L * 1.1, 0, Rv * 0.3, 0.45, 'rgba(127,211,255,0.35)');
        };
        // tour de contrôle : fût à bandes, salle vitrée, antenne et parabole
        const tower = () => {
          const ta = 0.55, tb = 1.0;
          cyl(ta, tb, 0, 0.17, 1.0, '#c3ccd6', 14, '#9aa4b0');
          cyl(ta, tb, 1.0, 0.3, 0.06, '#7d8794', 16, '#9aa4b0');
          cyl(ta, tb, 1.06, 0.28, 0.16, '#5fb8ff', 16, '#e9eef4');                  // salle de contrôle vitrée
          cyl(ta, tb, 1.22, 0.31, 0.04, '#9aa4b0', 16, '#c3ccd6');
          line([ta, tb, 1.26], [ta, tb, 1.65], shade('#c3ccd6', day), 0.025);
          sphere(ta + 0.12, tb, 1.36, 0.08, '#ffffff', '#c9d3de', '#7d8794');       // parabole
          blink(ta, tb, 1.68, 2);
        };
        if (Z(0.55, 1.0, 0) < Z(0, 0, 0)) { tower(); hall(); } else { hall(); tower(); }
        // petits vaisseaux qui sortent par la porte avant et s'éloignent en montant
        for (let k = 0; k < 3; k++) {
          const q = (t * 0.00035 + k / 3 + it.i * 0.17) % 1, sa = -1;
          const pa = -L + sa * (0.1 + q * 2.4), sh = 0.3 + q * q * 2.4, sw = 0.15 + 0.05 * (1 - q);
          ctx.globalAlpha = Math.min(1, (1 - q) * 2.5);
          poly([[pa + sa * 0.3, 0, sh], [pa - sa * 0.12, -sw, sh], [pa - sa * 0.02, 0, sh + 0.05], [pa - sa * 0.12, sw, sh]], shade('#e9eef4', Math.max(0.7, day)), 'rgba(0,0,0,.4)');
          glow(pa - sa * 0.15, 0, sh, 0.2, 'rgba(127,211,255,0.8)');
          ctx.globalAlpha = 1;
        }
      } else {                                            // collecteur : socle et cristal
        cyl(0, 0, 0, 0.6, 0.5, '#4a525e');
        sphere(0, 0, 1.0, 0.4, '#e3d4ff', '#a77bff', '#2a1650');
        glow(0, 0, 1.0, 0.8, 'rgba(167,123,255,0.5)');
      }
      if (it.light < 0.05) glow(0, 0, 0.4, 0.9, 'rgba(255,200,120,0.35)');   // éclairage nocturne
      ctx.restore();
    }
  }

  /* Tremplin gravitationnel : la lune devient une porte de saut (g de 0 à 1).
     Une sphère d'acier à mailles hexagonales (polyèdre de Goldberg) se construit autour d'elle et tourne
     avec la lune ; un horizon lumineux recouvre peu à peu sa surface. */
  gateLattice() {
    if (this._lattice) return this._lattice;
    // icosaèdre subdivisé une fois (80 faces) ; son dual donne des hexagones (et 12 pentagones)
    const t = (1 + Math.sqrt(5)) / 2;
    let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const norm = v => { const l = Math.hypot(...v); return v.map(c => c / l); };
    V = V.map(norm);
    const mid = {}, midpoint = (a, b) => {
      const k = a < b ? a + '_' + b : b + '_' + a;
      if (mid[k] == null) { V.push(norm(V[a].map((c, i) => (c + V[b][i]) / 2))); mid[k] = V.length - 1; }
      return mid[k];
    };
    const F2 = [];
    for (const [a, b, c] of F) { const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a); F2.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    F = F2;
    const C = F.map(f => norm([0, 1, 2].map(i => (V[f[0]][i] + V[f[1]][i] + V[f[2]][i]) / 3)));   // sommets du dual
    const owner = {}, edges = [];
    F.forEach((f, fi) => [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(([a, b]) => {
      const k = a < b ? a + '_' + b : b + '_' + a;
      if (owner[k] == null) owner[k] = fi; else edges.push([owner[k], fi]);
    }));
    // ordre de construction : du bas vers le haut (par hauteur moyenne de l'arête)
    edges.sort((e1, e2) => (C[e1[0]][1] + C[e1[1]][1]) - (C[e2[0]][1] + C[e2[1]][1]));
    return (this._lattice = { C, edges, V, F: F.slice().sort((f1, f2) => (V[f1[0]][1] + V[f1[1]][1] + V[f1[2]][1]) - (V[f2[0]][1] + V[f2[1]][1] + V[f2[2]][1])) });
  }

  /* Tremplin gravitationnel : chaque lune a sa propre structure (g de 0 à 1, 10 niveaux).
     style : 'ring' (anneau de saut), 'shell' (coquille de Dyson), 'crystal' (cristallisation).
     R0 : rayon d'origine de la lune (la structure garde cette taille) ; Rm : rayon actuel. */
  drawGate(t, cx, cy, R0, g, small = false, style = 'ring', color = '#8fe3ff', seed = 1, Rm = R0) {
    const ctx = this.ctx, d = this.dpr, W = this.canvas.width;
    const tilt = this.traits.tilt, cT = Math.cos(tilt), sT = Math.sin(tilt);
    const spin = (t * 0.000011 + 0.5) * Math.PI * 2, cr = Math.cos(spin), sr = Math.sin(spin);
    // projection d'un point de la sphère unité (qui tourne avec la lune)
    const proj = (x, y, z, k) => {
      const tx = x * cr - z * sr, nz = z * cr + x * sr;
      return [cx + (tx * cT + y * sT) * k, cy + (-tx * sT + y * cT) * k, nz];
    };
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const hsh = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };   // bruit fixe
    const tone = (h, k) => { const [r, gg, b] = hex(h); const f = v => Math.max(0, Math.min(255, Math.round(k >= 1 ? v + (255 - v) * (k - 1) : v * k))); return `rgb(${f(r)},${f(gg)},${f(b)})`; };
    ctx.save();
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // ===== Idée 6 : les trois étages d'un lanceur (chantier, réservoir, rail d'accélération) =====
    // structures posées au sommet de la lune, en 3D, qui tournent avec elle ; construites niveau par niveau
    if (style === 'yard' || style === 'tank' || style === 'rail') {
      const ar = Math.max(0.25, Rm / R0);                       // ancrage : surface actuelle de la lune
      // vue légèrement plongeante (on voit le dessus des structures posées au sommet de la lune)
      const cp = Math.cos(0.5), sp = Math.sin(0.5);
      const rv = ([x, y, z]) => { const tx = x * cr - z * sr, nz = z * cr + x * sr, sx = tx * cT + y * sT, sy = -tx * sT + y * cT; return [sx, sy * cp + nz * sp, nz * cp - sy * sp]; };
      const LT = [-0.45, -0.65, 0.61];
      const items = [];                                          // faces et sphères, triées par profondeur
      let hideBehind = false;
      const behind = p => hideBehind && p[2] < 0.02 && Math.hypot(p[0], p[1]) < ar;
      const up = (x, h, z) => [x, -(ar + h), z];                 // point local : x, z au sol, h en hauteur
      const face = (pts, col, glow) => {
        const P = pts.map(rv);
        const e1 = P[1].map((v, j) => v - P[0][j]), e2 = P[2].map((v, j) => v - P[0][j]);
        let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const nl = Math.hypot(...n) || 1; n = n.map(v => v / nl); if (n[2] < 0) n = n.map(v => -v);
        const lit = 0.4 + 0.85 * Math.max(0, n[0] * LT[0] + n[1] * LT[1] + n[2] * LT[2]);
        items.push({ z: P.reduce((s, p) => s + p[2], 0) / P.length, draw: () => {
          ctx.beginPath(); P.forEach((p, i) => { const x = cx + p[0] * R0, y = cy + p[1] * R0; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
          ctx.fillStyle = glow ? col : tone(col, lit); ctx.fill();
          if (!small) { ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = Math.max(0.4, d * 0.6); ctx.stroke(); }
        } });
      };
      const box = (x0, x1, z0, z1, h0, h1, col) => {
        const c = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
        face(c.map(([x, z]) => up(x, h1, z)), col);
        for (let k = 0; k < 4; k++) { const a = c[k], b = c[(k + 1) % 4]; face([up(a[0], h0, a[1]), up(b[0], h0, b[1]), up(b[0], h1, b[1]), up(a[0], h1, a[1])], col); }
      };
      const ball = (x, h, z, r, c0, c1, c2) => {
        const p = rv(up(x, h, z));
        if (behind(p)) return;
        items.push({ z: p[2], draw: () => {
          const X = cx + p[0] * R0, Y = cy + p[1] * R0, rr = r * R0;
          const gr = ctx.createRadialGradient(X - rr * 0.35, Y - rr * 0.35, rr * 0.1, X, Y, rr);
          gr.addColorStop(0, c0); gr.addColorStop(0.55, c1); gr.addColorStop(1, c2);
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(X, Y, rr, 0, Math.PI * 2); ctx.fill();
        } });
      };
      // primitives supplémentaires : cylindre vertical à facettes, tuyau (polyligne), anneau autour d'un axe
      const cyl = (x, z, r, h0, h1, col, sides = 10, cap = col) => {
        for (let k = 0; k < sides; k++) {
          const a0 = k / sides * Math.PI * 2, a1 = (k + 1) / sides * Math.PI * 2;
          face([up(x + r * Math.cos(a0), h0, z + r * Math.sin(a0)), up(x + r * Math.cos(a1), h0, z + r * Math.sin(a1)),
            up(x + r * Math.cos(a1), h1, z + r * Math.sin(a1)), up(x + r * Math.cos(a0), h1, z + r * Math.sin(a0))], col);
        }
        face(Array.from({ length: sides }, (_, k) => { const a = k / sides * Math.PI * 2; return up(x + r * Math.cos(a), h1, z + r * Math.sin(a)); }), cap);
      };
      const pipe = (pts, col, w) => {                            // chaque tronçon est trié à part (passe devant / derrière)
        for (let k = 0; k < pts.length - 1; k++) {
          const a = rv(up(...pts[k])), b = rv(up(...pts[k + 1]));
          if (behind(a) && behind(b)) continue;
          items.push({ z: (a[2] + b[2]) / 2 + 0.001, draw: () => {
            ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = Math.max(1, d * (w + 1.2)); ctx.beginPath(); ctx.moveTo(cx + a[0] * R0, cy + a[1] * R0); ctx.lineTo(cx + b[0] * R0, cy + b[1] * R0); ctx.stroke();
            ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.6, d * w); ctx.stroke();
          } });
        }
      };
      const loop = (c, u, v, r, col, w, N = 20) => {             // cercle de centre c, dans le plan (u, v)
        const pts = []; for (let k = 0; k <= N; k++) { const a = k / N * Math.PI * 2; pts.push([0, 1, 2].map(j => c[j] + (u[j] * Math.cos(a) + v[j] * Math.sin(a)) * r)); }
        pipe(pts, col, w);
      };
      const n = Math.round(g * 10), sm = small ? 0.6 : 1;
      // cylindre couché le long de l'axe x (modules, fuselage)
      const cylX = (x0, x1, h, z, r, col, sides = 10) => {
        for (let k = 0; k < sides; k++) {
          const a0 = k / sides * Math.PI * 2, a1 = (k + 1) / sides * Math.PI * 2;
          face([up(x0, h + r * Math.cos(a0), z + r * Math.sin(a0)), up(x1, h + r * Math.cos(a0), z + r * Math.sin(a0)),
            up(x1, h + r * Math.cos(a1), z + r * Math.sin(a1)), up(x0, h + r * Math.cos(a1), z + r * Math.sin(a1))], col);
        }
        for (const xe of [x0, x1]) face(Array.from({ length: sides }, (_, k) => { const a = k / sides * Math.PI * 2; return up(xe, h + r * Math.cos(a), z + r * Math.sin(a)); }), col);
      };
      if (style === 'yard') {                                    // chantier : vaisseau à soucoupe et nacelles (inspiration space opera)
        const H = 0.72, sg = Math.min(1, n / 3);                 // la soucoupe s'élargit sur les 3 premiers niveaux
        if (n >= 1) {
          cyl(0.16, 0, 0.32 * sg, H - 0.025, H + 0.025, '#d7dee7', 20, '#eef2f6');          // soucoupe
          cyl(0.16, 0, 0.1 * sg, H + 0.025, H + 0.05, '#c3ccd6', 12, '#e9eef4');            // passerelle
          if (n >= 10) for (let k = 0; k < 14; k++) {                                        // hublots allumés
            const a = k / 14 * Math.PI * 2, p = rv(up(0.16 + Math.cos(a) * 0.3, H, Math.sin(a) * 0.3));
            items.push({ z: p[2] + 0.002, draw: () => { ctx.fillStyle = '#ffe9a8'; ctx.fillRect(cx + p[0] * R0 - d * 0.7, cy + p[1] * R0 - d * 0.7, d * 1.4, d * 1.4); } });
          }
        }
        if (n >= 3) {                                            // cou et coque secondaire
          box(-0.06, 0.06, -0.035, 0.035, H - 0.12, H - 0.02, '#c9d3de');
          cylX(-0.4, 0.02, H - 0.15, 0, 0.065 * Math.min(1, (n - 2) / 2), '#dfe6ee', 12);
          if (n >= 10) ball(0.03, H - 0.15, 0, 0.045, '#ffffff', '#7fd3ff', 'rgba(79,157,255,0)');   // déflecteur
        }
        if (n >= 5) for (const zz of [-0.22, 0.22]) {           // pylônes
          pipe([[-0.25, H - 0.13, zz * 0.2], [-0.3, H + 0.02, zz]], '#c3ccd6', 2.2 * sm);
        }
        if (n >= 7) for (const zz of [-0.22, 0.22]) {           // nacelles
          const L = Math.min(1, (n - 6) / 3);
          cylX(-0.55, -0.55 + 0.42 * L, H + 0.04, zz, 0.035, '#c9d3de', 10);
          if (n >= 10) {
            ball(-0.13, H + 0.04, zz, 0.032, '#ffd0c8', '#ff5a4a', 'rgba(255,90,74,0)');   // capteurs avant rouges
            const a = rv(up(-0.53, H + 0.04, zz)), b = rv(up(-0.15, H + 0.04, zz));      // bande bleue lumineuse
            items.push({ z: Math.max(a[2], b[2]) + 0.003, draw: () => { ctx.strokeStyle = 'rgba(127,211,255,0.95)'; ctx.lineWidth = Math.max(1, d * 1.6); ctx.beginPath(); ctx.moveTo(cx + a[0] * R0, cy + a[1] * R0); ctx.lineTo(cx + b[0] * R0, cy + b[1] * R0); ctx.stroke(); } });
          }
        }
        if (n > 0 && n < 10 && !small && Math.sin(t * 0.02 + seed) > 0.2) ball(-0.1, H, 0.12, 0.03, '#fff6d0', '#ffb36b', 'rgba(255,140,90,0)');   // soudure
      } else if (style === 'tank') {                             // réservoir : 9 sphères en cube posé sur la pointe (façon atomium)
        // sommets d'un cube (±1) + centre, la grande diagonale à la verticale
        const a3 = Math.sqrt(3), e1 = [1 / Math.SQRT2, -1 / Math.SQRT2, 0], e2 = [1 / Math.sqrt(6), 1 / Math.sqrt(6), -2 / Math.sqrt(6)], ax = [1 / a3, 1 / a3, 1 / a3];
        const S2 = 0.62, HC = -ar, dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
        const V = [[0, 0, 0]];
        for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) V.push([x, y, z]);
        const pos = V.map(v => [dot(v, e1) * S2, HC + dot(v, ax) * S2, dot(v, e2) * S2]);
        // ordre de construction : du bas vers le haut, le centre en premier
        const order = pos.map((p, i) => i).sort((i, j) => (i === 0 ? -1 : j === 0 ? 1 : pos[i][1] - pos[j][1]));
        const k = Math.min(9, Math.ceil(n * 0.9)), built = new Set(order.slice(0, k));
        // tubes : arêtes du cube et liaisons centre → sommets
        const edges = [];
        for (let i = 1; i < 9; i++) { edges.push([0, i]); for (let j = i + 1; j < 9; j++) { const dv = V[i].map((c, q) => c - V[j][q]); if (Math.abs(dv[0]) + Math.abs(dv[1]) + Math.abs(dv[2]) === 2) edges.push([i, j]); } }
        hideBehind = true;   // ce qui passe derrière la lune est caché par elle
        for (const [i, j] of edges) if (built.has(i) && built.has(j)) pipe([[pos[i][0], pos[i][1], pos[i][2]], [pos[j][0], pos[j][1], pos[j][2]]].map(([x, h, z]) => [x, h, z]), '#9aa4b0', 2.4 * sm);
        for (const i of built) {
          const [x, h, z] = pos[i], r = 0.11;
          ball(x, h, z, r, '#ffffff', '#c9d6e4', '#4a5563');
          loop([x, h, z], [1, 0, 0], [0, 0, 1], r * 1.03, '#3a4350', 1.1 * sm, 14);   // renfort à l'équateur
          if (n >= 10) loop([x, h, z], [1, 0, 0], [0, 1, 0], r * 1.03, '#7fd3ff', 0.9 * sm, 14);
        }
      } else {                                                   // rail d'accélération : faisceau de rails, traverses, anneaux
        const len = 0.2 + 0.95 * (n / 10), lean = 0.75;
        const ax = [Math.sin(lean), Math.cos(lean), 0], p1 = [Math.cos(lean), -Math.sin(lean), 0], p2 = [0, 0, 1];
        const at = (s, a = 0, b = 0) => [0, 1, 2].map(j => ax[j] * s + p1[j] * a + p2[j] * b + (j === 1 ? 0.06 : 0));
        // pylônes de soutien
        pipe([[-0.15, 0, -0.12], at(len * 0.35, -0.05, -0.05)], '#6b7480', 1.6 * sm);
        pipe([[-0.15, 0, 0.12], at(len * 0.35, -0.05, 0.05)], '#6b7480', 1.6 * sm);
        pipe([[0.1, 0, 0], at(len * 0.2, -0.05, 0)], '#6b7480', 1.6 * sm);
        // plusieurs longs rails dans l'axe
        for (const [a, b] of [[-0.05, -0.05], [-0.05, 0.05], [0.05, -0.05], [0.05, 0.05], [0, 0]])
          pipe([at(0, a, b), at(len, a, b)], a || b ? '#9aa4b0' : '#c3ccd6', (a || b ? 1.2 : 1.8) * sm);
        // nombreuses petites traverses perpendiculaires
        const ties = Math.round(len * 40);
        for (let i = 0; i <= ties; i++) {
          const s = len * i / ties;
          pipe([at(s, -0.07, 0), at(s, 0.07, 0)], '#6b7480', 0.8 * sm);
          if (i % 2 === 0) pipe([at(s, 0, -0.07), at(s, 0, 0.07)], '#5d6672', 0.8 * sm);
        }
        // anneaux d'accélération
        const rings = Math.floor(n / 2);
        for (let i = 1; i <= rings; i++) {
          const on = n >= 10 ? (0.6 + 0.4 * Math.sin(t * 0.006 - i) > 0.5 ? '#ffb347' : '#c98a3a') : '#b8893f';
          loop(at(len * i / (rings + 0.5)), p1, p2, 0.11, on, 2 * sm, 16);
        }
      }
      items.sort((a, b) => a.z - b.z).forEach(it => it.draw());
      ctx.restore();
      return;
    }
    if (style === 'ring') {                           // 1 — anneau de saut autour de l'équateur
      const n = Math.round(g * 10), Rr = R0 * 0.88, pitch = 0.36, cp = Math.cos(pitch), sp = Math.sin(pitch);
      const rp = a => {                                // point de l'anneau (tourne avec la lune, vu légèrement de dessus)
        const x = Math.cos(a), z = Math.sin(a), tx = x * cr - z * sr, nz = z * cr + x * sr;
        const y2 = -nz * sp, z2 = nz * cp;
        return [cx + (tx * cT + y2 * sT) * Rr, cy + (-tx * sT + y2 * cT) * Rr, z2];
      };
      const seg = (k, front) => {
        const a0 = k * Math.PI / 5 + 0.05, a1 = a0 + Math.PI / 5 - 0.1, pts = [];
        for (let j = 0; j <= 8; j++) pts.push(rp(a0 + (a1 - a0) * j / 8));
        for (let j = 0; j < 8; j++) {
          const z = (pts[j][2] + pts[j + 1][2]) / 2;
          if ((z >= 0) !== front) continue;
          const l = 0.45 + 0.55 * Math.max(0, z), nz = hsh(k, j);
          // plaques de métal irrégulières : teintes variées, quelques plaques sombres ou rouillées
          const base = nz < 0.15 ? '#1d2228' : nz > 0.85 ? '#4a3c32' : '#3a434f';
          ctx.beginPath(); ctx.moveTo(pts[j][0], pts[j][1]); ctx.lineTo(pts[j + 1][0], pts[j + 1][1]);
          ctx.strokeStyle = '#07090c'; ctx.lineWidth = R0 * (small ? 0.2 : 0.16); ctx.stroke();
          ctx.strokeStyle = tone(base, l * (0.75 + 0.5 * hsh(j, k + 7))); ctx.lineWidth = R0 * (small ? 0.12 : 0.1); ctx.stroke();
          if (!small && hsh(k + 3, j) > 0.5) { ctx.fillStyle = 'rgba(200,210,225,0.55)'; ctx.beginPath(); ctx.arc(pts[j][0], pts[j][1], Math.max(0.8, d * 1.1), 0, Math.PI * 2); ctx.fill(); }   // rivet
          if (!small) { ctx.strokeStyle = `rgba(220,235,255,${0.2 + 0.4 * Math.max(0, z)})`; ctx.lineWidth = Math.max(0.6, d); ctx.stroke(); }
        }
        if (!small && front) {                         // feu bleu au milieu du segment
          const m = rp((a0 + a1) / 2);
          if (m[2] >= 0) { const a = 0.5 + 0.5 * Math.sin(t * 0.0007 + k * 1.7); ctx.fillStyle = `rgba(150,215,255,${0.4 + 0.6 * a})`; ctx.beginPath(); ctx.arc(m[0], m[1], Math.max(1, d * 2), 0, Math.PI * 2); ctx.fill(); }
        }
      };
      // moitié arrière : seulement hors du disque de la lune
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, W); ctx.arc(cx, cy, Rm, 0, Math.PI * 2); ctx.clip('evenodd');
      for (let k = 0; k < n; k++) seg(k, false);
      ctx.restore();
      // vortex au centre, une fois l'anneau terminé
      if (g >= 1) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-tilt); ctx.scale(1, sp);
        const vg = ctx.createRadialGradient(0, 0, 0, 0, 0, Rr * 0.93);
        vg.addColorStop(0, 'rgba(235,250,255,0.95)'); vg.addColorStop(0.5, 'rgba(90,170,255,0.85)'); vg.addColorStop(1, 'rgba(20,50,140,0.6)');
        ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(0, 0, Rr * 0.93, 0, Math.PI * 2); ctx.fill();
        if (!small) {
          ctx.strokeStyle = 'rgba(210,240,255,0.55)'; ctx.lineWidth = Math.max(1, d * 1.4);
          for (let s = 0; s < 3; s++) {
            ctx.beginPath();
            for (let j = 0; j <= 40; j++) { const q = j / 40, a = t * 0.0012 + s * 2.09 + q * 4, rr = Rr * 0.9 * (1 - q); j ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      for (let k = 0; k < n; k++) seg(k, true);
      if (!small) for (let k = n; k < 10; k++) {       // emplacements encore vides
        const a0 = k * Math.PI / 5 + 0.05, a1 = a0 + Math.PI / 5 - 0.1, p0 = rp(a0), p1 = rp(a1);
        if ((p0[2] + p1[2]) / 2 < 0) continue;
        ctx.setLineDash([d * 3, d * 4]); ctx.strokeStyle = 'rgba(160,180,210,0.35)'; ctx.lineWidth = Math.max(0.6, d);
        ctx.beginPath(); for (let j = 0; j <= 6; j++) { const p = rp(a0 + (a1 - a0) * j / 6); j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); ctx.setLineDash([]);
      }
    } else if (style === 'shell') {                   // 3 — coquille de Dyson : plaques qui recouvrent la lune
      const { V, F } = this.gateLattice(), n = Math.round(g * F.length), k = R0 * 1.03;
      const plates = [];
      for (let i = 0; i < n; i++) {
        const f = F[i], c = [0, 1, 2].map(j => (V[f[0]][j] + V[f[1]][j] + V[f[2]][j]) / 3);
        const pc = proj(c[0], c[1], c[2], k);
        if (pc[2] < 0.02) continue;
        plates.push({ pts: f.map(vi => { const v = V[vi]; return proj(c[0] + (v[0] - c[0]) * 0.9, c[1] + (v[1] - c[1]) * 0.9, c[2] + (v[2] - c[2]) * 0.9, k); }), z: pc[2], i, pc });
      }
      plates.sort((a, b) => a.z - b.z);
      for (const p of plates) {
        ctx.beginPath(); p.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
        const nz = hsh(p.i, 3), base = nz < 0.12 ? '#1f242b' : nz > 0.88 ? '#4d4036' : nz > 0.7 ? '#4a5563' : '#3b434e';
        // dégradé dans la plaque (usure) et teinte propre à chaque plaque
        const lp = (0.4 + 0.6 * p.z) * (0.7 + 0.45 * hsh(p.i, 9));
        const gr = ctx.createLinearGradient(p.pts[0][0], p.pts[0][1], p.pc[0], p.pc[1]);
        gr.addColorStop(0, tone(base, lp * 0.8)); gr.addColorStop(1, tone(base, lp * 1.15));
        ctx.fillStyle = gr; ctx.fill();
        ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = Math.max(0.5, d * (small ? 0.5 : 1)); ctx.stroke();
        if (!small) {   // joint de panneau et petite trappe sur certaines plaques
          const e = p.pts[1 + (p.i % 2)], mx = (p.pts[0][0] + e[0]) / 2, my = (p.pts[0][1] + e[1]) / 2;
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(0.4, d * 0.6);
          ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(p.pc[0], p.pc[1]); ctx.stroke();
          if (hsh(p.i, 5) > 0.7) { ctx.fillStyle = 'rgba(10,12,16,0.6)'; ctx.fillRect(p.pc[0] - d * 2, p.pc[1] - d * 1.5, d * 4, d * 3); }
        }
        if (g >= 1) {                                  // coquille fermée : lignes lumineuses
          ctx.strokeStyle = `rgba(120,210,255,${(0.35 + 0.25 * Math.sin(t * 0.0015)) * p.z})`; ctx.lineWidth = Math.max(0.5, d * (small ? 0.6 : 1.2)); ctx.stroke();
        }
      }
    } else {                                          // 7 — cristallisation : des cristaux recouvrent la lune
      // cristaux 3D irréguliers : prismes à 4-6 pans terminés en pointe, inclinés, de tailles et teintes variées,
      // regroupés en amas ; chaque face est éclairée selon son orientation
      if (!this._crys || this._crys.seed !== seed) {
        const rnd = mulberry32(seed ^ 0x51f15e), list = [];
        const norm = v => { const l = Math.hypot(...v) || 1; return v.map(c => c / l); };
        const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
        for (let i = 0; i < 34; i++) {
          const uu = rnd() * 2 - 1, aa = rnd() * Math.PI * 2, s = Math.sqrt(1 - uu * uu), site = [s * Math.cos(aa), uu, s * Math.sin(aa)];
          const ref = Math.abs(site[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], tu = norm(cross(site, ref)), tw = cross(site, tu);
          const nCl = 1 + Math.floor(rnd() * 3);                  // 1 à 3 cristaux par amas
          for (let c = 0; c < nCl; c++) {
            const off = c ? 0.05 + rnd() * 0.06 : 0, oa = rnd() * Math.PI * 2;
            const v = norm(site.map((x, j) => x + (tu[j] * Math.cos(oa) + tw[j] * Math.sin(oa)) * off));
            const lean = 0.1 + rnd() * 0.45, la = rnd() * Math.PI * 2;   // inclinaison par rapport à la verticale
            const axis = norm(v.map((x, j) => x + (tu[j] * Math.cos(la) + tw[j] * Math.sin(la)) * lean));
            const ref2 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = norm(cross(axis, ref2)), w = cross(axis, u);
            const sides = 4 + Math.floor(rnd() * 3), big = c ? 0.6 + rnd() * 0.3 : 1;
            list.push({ v, axis, u, w, sides, rot: rnd() * Math.PI,
              r: (0.045 + rnd() * 0.05) * big, h1: (0.12 + rnd() * 0.3) * big, h2: (0.06 + rnd() * 0.12) * big,
              jit: Array.from({ length: sides }, () => 0.75 + rnd() * 0.5), k: 0.8 + rnd() * 0.45 });
          }
        }
        this._crys = { seed, list };
      }
      // vecteur de la sphère → espace écran (même rotation que la lune)
      const rv = ([x, y, z]) => { const tx = x * cr - z * sr, nz = z * cr + x * sr; return [tx * cT + y * sT, -tx * sT + y * cT, nz]; };
      const LT = (() => { const l = [-0.5, -0.62, 0.6], m = Math.hypot(...l); return l.map(x => x / m); })();
      const list = this._crys.list, n = Math.round(g * list.length), crystals = [];
      for (let i = 0; i < n; i++) {
        // posés sur la surface actuelle de la lune (elle rétrécit) ; les cristaux grandissent pour la remplacer
        const c = list[i], br = Math.max(0.35, Rm / R0 * 0.95), base = c.v.map(x => x * br), gs = 1 + (1 - br) * 1.2;
        const bz = rv(base)[2];
        if (bz < -0.08) continue;                                 // derrière la lune
        const ring = (hh, sc) => Array.from({ length: c.sides }, (_, k) => {
          const a = c.rot + k * Math.PI * 2 / c.sides, rr = c.r * gs * sc * c.jit[k];
          return base.map((x, j) => x + c.axis[j] * hh + (c.u[j] * Math.cos(a) + c.w[j] * Math.sin(a)) * rr);
        });
        // pied du cristal au centre de la lune, plus fin, puis le prisme sort de la surface
        const deep = Array.from({ length: c.sides }, (_, k) => { const a = c.rot + k * Math.PI * 2 / c.sides, rr = c.r * gs * 0.35; return c.v.map((x, j) => x * 0.02 + (c.u[j] * Math.cos(a) + c.w[j] * Math.sin(a)) * rr); });
        const b = ring(0, 1), tp = ring(c.h1 * gs, 0.82), tip = base.map((x, j) => x + c.axis[j] * (c.h1 + c.h2) * gs);
        const faces = [];
        for (let k = 0; k < c.sides; k++) {
          const k1 = (k + 1) % c.sides;
          faces.push([deep[k], deep[k1], b[k1], b[k]], [b[k], b[k1], tp[k1], tp[k]], [tp[k], tp[k1], tip]);
        }
        crystals.push({ faces, z: bz, k: c.k });
      }
      crystals.sort((a, b) => a.z - b.z);
      if (g >= 1) {                                    // cristal géant : halo pulsant derrière
        const pa = 0.25 + 0.2 * Math.sin(t * 0.002), gl = ctx.createRadialGradient(cx, cy, R0 * 0.3, cx, cy, R0 * 1.7);
        const [r, gg, b] = hex(color);
        gl.addColorStop(0, `rgba(${r},${gg},${b},${pa})`); gl.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, R0 * 1.7, 0, Math.PI * 2); ctx.fill();
      }
      for (const cry of crystals) {
        const fs = [];
        for (const f of cry.faces) {
          const P = f.map(rv);
          const e1 = P[1].map((x, j) => x - P[0][j]), e2 = P[2].map((x, j) => x - P[0][j]);
          let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
          const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
          if (nz <= 0) continue;                                  // face tournée vers l'arrière
          const lit = 0.35 + 0.9 * Math.max(0, nx * LT[0] + ny * LT[1] + nz * LT[2]);
          fs.push({ P, lit: lit * (0.78 + 0.44 * hsh(fs.length, cry.k * 100)), z: P.reduce((s, p) => s + p[2], 0) / P.length });   // facettes irrégulières
        }
        fs.sort((a, b) => a.z - b.z);
        for (const f of fs) {
          ctx.beginPath(); f.P.forEach((p, i) => { const x = cx + p[0] * R0, y = cy + p[1] * R0; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
          const fg = ctx.createLinearGradient(cx + f.P[0][0] * R0, cy + f.P[0][1] * R0, cx + f.P[f.P.length - 1][0] * R0, cy + f.P[f.P.length - 1][1] * R0);
          fg.addColorStop(0, tone(color, f.lit * cry.k * 0.85)); fg.addColorStop(1, tone(color, f.lit * cry.k * 1.2));
          ctx.fillStyle = fg; ctx.globalAlpha = 0.93; ctx.fill(); ctx.globalAlpha = 1;
          if (!small) { ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.3 * f.lit})`; ctx.lineWidth = Math.max(0.4, d * 0.7); ctx.stroke(); }
        }
      }
      if (g >= 1) {                                    // la lune est devenue un cristal géant à facettes
        const top = [cx, cy - R0 * 1.45], bot = [cx, cy + R0 * 1.25], eq = [];
        for (let k = 0; k < 6; k++) { const a = spin + k * Math.PI / 3; eq.push([cx + Math.cos(a) * R0 * 1.05, cy + Math.sin(a) * R0 * 0.3, Math.sin(a), a]); }
        const facets = [];
        for (let k = 0; k < 6; k++) {
          const e0 = eq[k], e1 = eq[(k + 1) % 6], z = (e0[2] + e1[2]) / 2, am = (e0[3] + e1[3]) / 2;
          if (z < -0.05) continue;
          facets.push({ z, l: 0.55 + 0.45 * Math.cos(am + 2.2), tri: [top, e0, e1], low: [bot, e0, e1] });
        }
        facets.sort((a, b) => a.z - b.z);
        for (const f of facets) for (const [tri, k2] of [[f.tri, 1.45], [f.low, 1.05]]) {
          ctx.beginPath(); tri.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
          ctx.fillStyle = tone(color, f.l * k2); ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
          ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = Math.max(0.5, d * (small ? 0.5 : 1)); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /* Planète mère vue depuis une lune : un horizon immense en bas du bloc. La calotte visible est
     calculée pixel par pixel avec la vraie texture de la planète (terres, océans, nuages, éclairage),
     à la résolution de l'écran : rendu net et réaliste. */
  drawHorizon(t, cx, W, parent) {
    const ctx = this.ctx, atm = parent.traits.atm;
    const BR = W * 1.05, pcy = W + BR * 0.8, top = Math.max(0, Math.floor(pcy - BR));
    const H = W - top;
    if (H <= 0) return;
    // précalcul de la calotte (une fois par taille de canevas)
    if (!this._hz || this._hz.W !== W || this._hz.seed !== parent.seed) {
      const al = 1.15, ca = Math.cos(al), sa = Math.sin(al);   // inclinaison : on regarde la région équatoriale
      let Lx = -0.55, Ly = -0.7, Lz = 0.45; const ln = Math.hypot(Lx, Ly, Lz); Lx /= ln; Ly /= ln; Lz /= ln;
      const idx = [], u0 = [], row = [], shade = [], rim = [], edge = [];
      const TW = parent.TW, TH = parent.TH;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const nx = (x + 0.5 - cx) / BR, ny = (top + y + 0.5 - pcy) / BR, d2 = nx * nx + ny * ny;
          if (d2 > 1) continue;
          const nz = Math.sqrt(1 - d2);
          const y2 = ny * ca - nz * sa, z2 = ny * sa + nz * ca;
          const lon = Math.atan2(nx, z2), lat = Math.asin(Math.max(-1, Math.min(1, y2)));
          idx.push((y * W + x) * 4);
          u0.push(lon / (Math.PI * 2) + 0.5);
          row.push(Math.min(TH - 1, Math.floor((lat / Math.PI + 0.5) * TH)) * TW);
          shade.push(Math.max(0, nx * Lx + ny * Ly + nz * Lz));
          rim.push(1 - nz);
          edge.push(Math.min(1, (1 - Math.sqrt(d2)) * BR * 1.2));
        }
      }
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const cctx = cv.getContext('2d');
      this._hz = { W, seed: parent.seed, top, H, cv, cctx, img: cctx.createImageData(W, H),
        idx: Int32Array.from(idx), u0: Float32Array.from(u0), row: Int32Array.from(row),
        shade: Float32Array.from(shade), rim: Float32Array.from(rim), edge: Float32Array.from(edge) };
    }
    const hz = this._hz, data = hz.img.data, tex = parent.tex, cloud = parent.cloud, TW = parent.TW;
    const rot = t * 0.000004, crot = t * 0.0000055;
    for (let i = 0; i < hz.idx.length; i++) {
      let u = hz.u0[i] + rot; u -= Math.floor(u);
      let cu = hz.u0[i] + crot; cu -= Math.floor(cu);
      const ti = hz.row[i] + ((u * TW) | 0), ca = cloud[hz.row[i] + ((cu * TW) | 0)] / 255;
      let r = tex[ti * 3], g = tex[ti * 3 + 1], b = tex[ti * 3 + 2];
      r += (245 - r) * ca * 0.85; g += (248 - g) * ca * 0.85; b += (255 - b) * ca * 0.85;
      const l = 0.12 + 0.95 * hz.shade[i];
      r *= l; g *= l; b *= l;
      const a = Math.pow(hz.rim[i], 2.2) * 0.9;   // diffusion de l'atmosphère vers le bord
      r += atm[0] * a; g += atm[1] * a; b += atm[2] * a;
      const p = hz.idx[i];
      data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = hz.edge[i] * 255;
    }
    hz.cctx.putImageData(hz.img, 0, 0);
    ctx.save();
    // halo de l'atmosphère au-dessus de l'horizon
    const hg = ctx.createRadialGradient(cx, pcy, BR * 0.985, cx, pcy, BR * 1.09);
    hg.addColorStop(0, `rgba(${atm[0]},${atm[1]},${atm[2]},0.55)`); hg.addColorStop(1, `rgba(${atm[0]},${atm[1]},${atm[2]},0)`);
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(cx, pcy, BR * 1.09, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(hz.cv, 0, hz.top);
    ctx.restore();
  }

  /* Anneau de débris autour de la planète : bande translucide et milliers d'éclats qui tournent.
     La moitié arrière passe derrière la planète. */
  drawDebrisRing(t, cx, cy, R) {
    const ctx = this.ctx, d = this.dpr, tl = this.traits.tilt * 0.6, flat = 0.2;
    if (!this._debris) {
      const rnd = mulberry32(0x5eed1234), list = [];
      for (let i = 0; i < 900; i++) list.push({ r: 1.22 + Math.pow(rnd(), 0.8) * 0.27, a: rnd() * Math.PI * 2, s: 0.6 + rnd() * 0.8, k: 0.5 + rnd() * 0.5, w: rnd() < 0.15 ? 1.8 : 1 });
      this._debris = list;
    }
    const cT = Math.cos(tl), sT = Math.sin(tl);
    ctx.save();
    // bandes translucides (devant ; derrière, seulement hors de la planète)
    for (const half of [1, 0]) {
      ctx.save();
      if (half === 0) { ctx.beginPath(); ctx.rect(0, 0, this.canvas.width, this.canvas.width); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip('evenodd'); }
      for (const [rr, a, w] of [[1.27, 0.16, 0.07], [1.37, 0.11, 0.08], [1.46, 0.07, 0.05]]) {
        ctx.strokeStyle = `rgba(200,185,160,${a})`; ctx.lineWidth = R * w * flat * 2.5;
        ctx.beginPath(); ctx.ellipse(cx, cy, R * rr, R * rr * flat, tl, half ? 0 : Math.PI, half ? Math.PI : Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    // éclats de roche
    for (const p of this._debris) {
      const a = p.a + t * 0.00004 / p.r * p.s, x0 = Math.cos(a) * p.r * R, y0 = Math.sin(a) * p.r * R * flat;
      const x = cx + x0 * cT - y0 * sT, y = cy + x0 * sT + y0 * cT;
      if (Math.sin(a) < 0 && Math.hypot(x - cx, y - cy) < R) continue;   // derrière la planète
      const c = 150 + 90 * p.k | 0;
      ctx.fillStyle = `rgb(${c},${c - 15},${c - 35})`;
      ctx.fillRect(x, y, d * p.w, d * p.w);
    }
    ctx.restore();
  }

  /* Boucliers EM : un point blanc par bouclier, chacun sur sa propre orbite autour de la planète */
  drawShieldDots(t, cx, cy, R, n) {
    const ctx = this.ctx, d = this.dpr;
    const h = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
    ctx.save(); ctx.fillStyle = '#ffffff';
    for (let i = 0; i < n; i++) {
      const rad = R * (1.06 + h(i, 1) * 0.3), flat = 0.15 + h(i, 2) * 0.75, tl = (h(i, 3) - 0.5) * 2.4;
      const a = h(i, 4) * Math.PI * 2 + t * 0.0003 * (0.6 + h(i, 5) * 0.8) * (h(i, 6) < 0.5 ? 1 : -1);
      const x0 = Math.cos(a) * rad, y0 = Math.sin(a) * rad * flat, x = cx + x0 * Math.cos(tl) - y0 * Math.sin(tl), y = cy + x0 * Math.sin(tl) + y0 * Math.cos(tl);
      if (Math.sin(a) < 0 && Math.hypot(x - cx, y - cy) < R) continue;   // caché derrière la planète
      ctx.globalAlpha = 0.6 + 0.4 * h(i, 7);
      ctx.fillRect(x, y, d * 1.3, d * 1.3);
    }
    ctx.restore();
  }

  /* L'arche : quitte le chantier, passe au réservoir, prend son élan sur le rail et part vers la galaxie (en boucle) */
  drawArk(t, orbiters, W) {
    const ms = orbiters.filter(o => o.kind === 'moon').sort((a, b) => a.index - b.index);
    if (ms.length < 3) return;
    const ctx = this.ctx, d = this.dpr, q = (t * 0.00007) % 1;
    const pts = [[ms[0].x, ms[0].y], [ms[1].x, ms[1].y], [ms[2].x, ms[2].y], [W * 1.15, -W * 0.15]];
    const seg = q < 0.25 ? 0 : q < 0.5 ? 1 : 2, u = seg < 2 ? (q - seg * 0.25) / 0.25 : (q - 0.5) / 0.5;
    const [a, b] = [pts[seg], pts[seg + 1]], e = seg === 2 ? u * u : u;   // accélération sur le rail
    const x = a[0] + (b[0] - a[0]) * e, y = a[1] + (b[1] - a[1]) * e, ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = d * 5;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (seg === 2) { ctx.strokeStyle = `rgba(127,211,255,${0.6 * u})`; ctx.lineWidth = d * 2; ctx.beginPath(); ctx.moveTo(-s * 6 * u, 0); ctx.lineTo(-s, 0); ctx.stroke(); }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(s * 1.6, 0); ctx.lineTo(-s, s * 0.6); ctx.lineTo(-s * 0.6, 0); ctx.lineTo(-s, -s * 0.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7fd3ff'; ctx.beginPath(); ctx.arc(-s, 0, s * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* position écran d'un point de surface (lon en tours, lat en radians) à l'instant t ; null s'il est caché */
  surfacePoint(lon, lat, t, cx, cy, R) {
    const tilt = this.traits.tilt, cT = Math.cos(tilt), sT = Math.sin(tilt);
    const L = (lon - t * 0.000011 - 0.5) * Math.PI * 2;      // même rotation que la texture
    const tx = Math.cos(lat) * Math.sin(L), nz = Math.cos(lat) * Math.cos(L), ty = Math.sin(lat);
    if (nz < 0.08) return null;                                // face cachée
    const nx = tx * cT + ty * sT, ny = -tx * sT + ty * cT;
    return { x: cx + nx * R, y: cy + ny * R, depth: nz, nx, ny };
  }

  drawFire(t, cx, cy, R) {
    const F = this.fire;
    if (!F) return;
    if (t > F.end) { this.fire = null; return; }
    // apparition en 0,6 s, extinction sur les 2,5 dernières secondes
    const k = Math.min(1, (t - F.start) / 600, (F.end - t) / 2500);
    if (k <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of F.flames) {
      const p = this.surfacePoint(f.lon, f.lat, t, cx, cy, R);
      if (!p) continue;                                        // passé derrière la planète
      const x = p.x, y = p.y, edge = Math.min(1, p.depth * 2.5);   // plus petit près du bord
      const flick = 0.75 + 0.25 * Math.sin(t * 0.018 + f.ph) + 0.1 * Math.sin(t * 0.047 + f.ph * 3);
      const s = R * 0.075 * f.s * k * edge, h = s * 2.2 * flick, w = s * 0.85;
      // lueur
      const glow = ctx.createRadialGradient(x, y, 0, x, y, s * 2.4);
      glow.addColorStop(0, `rgba(255,120,30,${0.55 * k})`);
      glow.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, s * 2.4, 0, Math.PI * 2); ctx.fill();
      // flamme
      const grad = ctx.createLinearGradient(x, y, x, y - h);
      grad.addColorStop(0, `rgba(255,240,170,${0.95 * k})`);
      grad.addColorStop(0.4, `rgba(255,150,40,${0.85 * k})`);
      grad.addColorStop(1, 'rgba(220,40,10,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.quadraticCurveTo(x + w, y - h * 0.35, x + w * 0.6, y);
      ctx.quadraticCurveTo(x, y + w * 0.45, x - w * 0.6, y);
      ctx.quadraticCurveTo(x - w, y - h * 0.35, x, y - h);
      ctx.fill();
      // braises qui s'envolent
      ctx.fillStyle = `rgba(255,190,90,${0.8 * k})`;
      for (let e = 0; e < 3; e++) {
        const p = ((t * 0.0006 + f.ph + e * 0.33) % 1);
        ctx.fillRect(x + Math.sin(f.ph + e + t * 0.003) * w, y - h - p * s * 3, this.dpr * 1.4, this.dpr * 1.4);
      }
    }
    ctx.restore();
  }

  drawBooms(t, cx, cy, R) {
    if (!this.booms || !this.booms.length) return;
    const ctx = this.ctx, DUR = 900;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    this.booms = this.booms.filter(b => t - b.t0 < DUR);
    for (const b of this.booms) {
      const age = t - b.t0;
      if (age < 0) continue;
      const p = age / DUR, x = cx + Math.cos(b.ang) * R * b.rad, y = cy + Math.sin(b.ang) * R * b.rad * b.flat;
      const r = R * 0.11 * b.size * (0.35 + p * 1.1);
      // boule de feu
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,230,${1 - p})`);
      g.addColorStop(0.35, `rgba(255,190,80,${0.9 * (1 - p)})`);
      g.addColorStop(0.7, `rgba(255,80,30,${0.6 * (1 - p)})`);
      g.addColorStop(1, 'rgba(120,20,10,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      // onde de choc
      ctx.strokeStyle = `rgba(255,200,120,${0.5 * (1 - p)})`;
      ctx.lineWidth = this.dpr * 1.2;
      ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.stroke();
      // débris
      ctx.fillStyle = `rgba(255,170,90,${1 - p})`;
      for (const q of b.parts) {
        const d = r * (0.4 + q.v * 1.6 * p);
        ctx.fillRect(x + Math.cos(q.a) * d, y + Math.sin(q.a) * d, this.dpr * 1.6, this.dpr * 1.6);
      }
    }
    ctx.restore();
  }

  render(t, opts) {
    if (!this.map) return;
    const { idx, u0, row, shade, rim, alpha, latA, n, pa, pr } = this.map;
    const snow = opts.snow || 0, forest = opts.forest || 0, forestN = this.forestN;
    const tex = this.tex, cloud = this.cloud, lights = this.lights, emis = this.emissive, TW = this.TW;
    const data = this.img.data;
    const atm = this.traits.atm;
    const rot = t * 0.000011, crot = t * 0.0000145, crot2 = t * 0.000022;
    const cloudHi = this.kind === 'moon' ? 0.35 : 0.75;   // intensité de la couche haute
    const density = opts.lightDensity * 255;

    for (let i = 0; i < n; i++) {
      let u = u0[i] + rot; u -= Math.floor(u);
      const ti = row[i] + ((u * TW) | 0);
      let cu = u0[i] + crot; cu -= Math.floor(cu);
      // deux couches de nuages : basse (texture) + haute, qui défile en sens inverse autour de la planète
      let cu2 = u0[i] - crot2 + 0.37; cu2 -= Math.floor(cu2);
      const ca = Math.max(cloud[row[i] + ((cu * TW) | 0)] / 255, cloud[row[i] + ((cu2 * TW) | 0)] / 255 * cloudHi);

      let r = tex[ti * 3], g = tex[ti * 3 + 1], b = tex[ti * 3 + 2];
      // calme intersidéral : des taches de forêt s'étendent (sous les nuages)
      if (forest > 0.002) {
        const fn = forestN[ti] / 255;
        const c = Math.min(1, Math.max(0, (fn - (1 - forest * 0.62)) * 7));
        // vert dérivé de la couleur du sol (teinte proche de la planète), opacité réduite
        if (c > 0) {
          const a = c * 0.5;
          r += (r * 0.7 - r) * a; g += (g * 0.8 + 48 - g) * a; b += (b * 0.6 - b) * a;
        }
      }
      r += (240 - r) * ca; g += (244 - g) * ca; b += (250 - b) * ca;

      // ère glaciaire : la neige gagne des pôles vers l'équateur
      if (snow > 0.002) {
        const relief = (tex[ti * 3] + tex[ti * 3 + 1] + tex[ti * 3 + 2]) / 765;
        const c = Math.min(1, Math.max(0, (latA[i] * 0.8 + relief * 0.45 - (1.05 - snow * 1.3)) * 4));
        if (c > 0) { r += (236 - r) * c; g += (243 - g) * c; b += (255 - b) * c; }
      }

      const s = shade[i];
      const lit = 0.035 + Math.max(0, s + 0.04) * 1.05;
      r *= lit; g *= lit; b *= lit;

      if (s < 0.15) {
        const k = Math.min(1, (0.15 - s) / 0.3) * (1 - ca);
        const L = lights[ti];
        if (L && L < density) { r += 255 * k; g += 190 * k; b += 100 * k * 0.6; }
        const e = emis[ti];
        if (e) { const ek = e / 255 * (0.35 + 0.65 * k) * (1 - ca); r += 255 * ek; g += 90 * ek; b += 20 * ek; }
      }

      const rm = rim[i], a = rm * rm * rm * (0.25 + Math.max(0, s) * 0.9);
      r += atm[0] * a; g += atm[1] * a; b += atm[2] * a;

      const p = idx[i];
      data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = alpha[i];
    }
    this.octx.putImageData(this.img, 0, 0);

    // --- composition finale ---
    const ctx = this.ctx, W = this.canvas.width, cx = W / 2, cy = W / 2;
    this.pulse *= 0.9;
    this.sizeScale = opts.scale == null ? 1 : Math.max(0.001, opts.scale);
    const R = W * 0.33 * this.sizeScale * (1 + 0.035 * this.pulse);
    ctx.clearRect(0, 0, W, W);

    for (const st of this.stars) {
      const a = 0.25 + 0.75 * Math.pow(Math.sin(t * 0.001 * st.sp + st.ph), 2);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#dfe9ff';
      ctx.fillRect(st.x * W, st.y * W, st.r * this.dpr, st.r * this.dpr);
    }
    ctx.globalAlpha = 1;

    // vue depuis une lune : la planète mère, immense, occupe le bas du bloc (on n'en voit que le haut)
    if (opts.horizon) this.drawHorizon(t, cx, W, opts.horizon);
    // halo arrière
    const glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.45);
    glow.addColorStop(0, `rgba(${atm[0]},${atm[1]},${atm[2]},${0.28 + 0.2 * this.pulse})`);
    glow.addColorStop(1, `rgba(${atm[0]},${atm[1]},${atm[2]},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2); ctx.fill();

    this.moonColors = opts.moonColors;
    this.moonLinks = opts.moonLinks;
    this.moonScales = opts.moonScales;
    this.moonGates = opts.moonGates;
    this.moonNetwork = !!opts.moonNetwork;
    this.debrisRing = !!opts.debrisRing;
    this.shieldDots = opts.shieldDots || 0;
    this.moonGateInfo = opts.moonGateInfo || [];
    this.center = [cx, cy, R];
    const orbiters = this.orbiters(t, R, opts.satellites, opts.moons || 0, opts.parent, opts.ships || []);
    this.hot = orbiters.filter(o => o.kind === 'moon' || o.kind === 'parent')
      .map(o => ({ x: o.x, y: o.y, r: o.size, z: o.z, kind: o.kind, index: o.index }));
    orbiters.filter(o => o.z < 0).forEach(o => this.drawOrbiter(o));

    ctx.drawImage(this.off, cx - R, cy - R, R * 2, R * 2);

    // fin liseré d'atmosphère
    const ring = ctx.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.08);
    ring.addColorStop(0, `rgba(${atm[0]},${atm[1]},${atm[2]},0.0)`);
    ring.addColorStop(0.35, `rgba(${atm[0]},${atm[1]},${atm[2]},0.35)`);
    ring.addColorStop(1, `rgba(${atm[0]},${atm[1]},${atm[2]},0)`);
    ctx.fillStyle = ring;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.08, 0, Math.PI * 2); ctx.fill();

    if (opts.buildings) this.drawStructures(t, cx, cy, R, opts.buildings);   // bâtiments avant les lunes qui passent devant
    // anneau de débris (comme Saturne) une fois les lunes parties ; boucliers EM ; arche en vol
    if (this.debrisRing) this.drawDebrisRing(t, cx, cy, R);
    if (this.shieldDots) this.drawShieldDots(t, cx, cy, R, this.shieldDots);
    orbiters.filter(o => o.z >= 0).forEach(o => this.drawOrbiter(o));
    if (this.moonNetwork) this.drawArk(t, orbiters, W);
    if (opts.gate > 0) this.drawGate(t, cx, cy, W * 0.33 * (1 + 0.035 * this.pulse), opts.gate, false, opts.gateStyle, opts.gateColor, opts.gateSeed, R);   // taille de la lune d'origine
    this.drawFire(t, cx, cy, R);
    this.drawTaxShip(t, cx, cy, R);
    this.drawBooms(t, cx, cy, R);
    this.drawShield(t, cx, cy, R);
  }

  orbiters(t, R, sats, moonCount, parent, ships = []) {
    const W = this.canvas.width, c = W / 2, list = [];
    const tilt = this.traits.tilt * 0.6, cT = Math.cos(tilt), sT = Math.sin(tilt);
    const push = (rad, flat, ang, size, kind) => {
      const x0 = Math.cos(ang) * rad, y0 = Math.sin(ang) * rad * flat;
      list.push({ x: c + x0 * cT - y0 * sT, y: c + x0 * sT + y0 * cT, z: Math.sin(ang), size, kind, t, rad });
    };
    // lune : créée par la technologie Terraformage, grossit avec les niveaux
    if (parent) { push(R * 1.4, 0.22, t * 0.00009 + 2.4, R * 0.15, 'parent'); list[list.length - 1].color = parent; }
    // lunes créées par le Terraformage (3 maximum), chacune sur son orbite
    const ORB = [[1.2, 0.22, 0.00012, 1, 0.13], [1.3, 0.3, 0.00009, 3.2, 0.115], [1.38, 0.16, 0.00007, 5.1, 0.1]];   // lunes plus grosses
    for (let i = 0; i < Math.min(3, moonCount); i++) {
      const [rad, flat, sp, ph, sz] = ORB[i];
      const msc = this.moonScales && this.moonScales[i] != null ? this.moonScales[i] : 1;
      push(R * rad, flat, t * sp + ph, R * sz * Math.max(0.001, msc), 'moon');
      list[list.length - 1].base = R * sz;
      list[list.length - 1].index = i;
      list[list.length - 1].colors = this.moonColors;
    }
    // vaisseaux de la flotte (12 visibles au maximum), orientés dans le sens de leur orbite
    ships.slice(0, 12).forEach((color, i) => {
      const rad = R * (1.1 + (i % 4) * 0.035), flat = 0.34 + (i % 3) * 0.06;
      const ang = t * 0.00055 * (1 + (i % 3) * 0.12) + i * 2.4;
      push(rad, flat, ang, this.dpr * (2.6 + (i % 3) * 0.6), 'ship');
      const o = list[list.length - 1];
      const dx = -Math.sin(ang) * rad, dy = Math.cos(ang) * rad * flat;
      o.heading = Math.atan2(dx * sT + dy * cT, dx * cT - dy * sT);
      o.color = color;
    });
    // satellites (1 par niveau de labo/robots, max 6)
    for (let i = 0; i < sats; i++) {
      push(R * (1.16 + i * 0.05), 0.3 + (i % 3) * 0.12, t * (0.0004 + i * 0.00007) + i * 2.1, this.dpr * 1.6, 'sat');
    }
    return list;
  }

  drawOrbiter(o) {
    const ctx = this.ctx;
    if (o.kind === 'ship') {
      ctx.save();
      ctx.translate(o.x, o.y); ctx.rotate(o.heading);
      ctx.fillStyle = o.color; ctx.shadowColor = o.color; ctx.shadowBlur = 6 * this.dpr;
      ctx.beginPath(); ctx.moveTo(o.size * 1.6, 0); ctx.lineTo(-o.size, o.size * 0.75); ctx.lineTo(-o.size * 0.5, 0); ctx.lineTo(-o.size, -o.size * 0.75); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd9a0'; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(-o.size * 0.75, 0, o.size * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    if (o.kind === 'parent') {
      const [r, g, b] = o.color;
      const gr = ctx.createRadialGradient(o.x - o.size * 0.4, o.y - o.size * 0.4, o.size * 0.1, o.x, o.y, o.size);
      gr.addColorStop(0, `rgb(${Math.min(255, r + 90)},${Math.min(255, g + 90)},${Math.min(255, b + 90)})`);
      gr.addColorStop(0.6, `rgb(${r * 0.6 | 0},${g * 0.6 | 0},${b * 0.6 | 0})`);
      gr.addColorStop(1, '#05070c');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`; ctx.lineWidth = this.dpr * 1.5;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.size * 1.12, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    if (o.kind === 'moon') {
      // ascenseur gravitationnel : câble bleu entre la planète et la lune
      if (this.moonLinks && this.moonLinks[o.index] && this.center) {
        const [pcx, pcy, pR] = this.center, dx = o.x - pcx, dy = o.y - pcy, dd = Math.hypot(dx, dy) || 1;
        // départ : point de la surface situé sous la lune (direction planète → lune ramenée au rayon de la planète)
        const k = pR / (o.rad || dd), sx = pcx + dx * k, sy = pcy + dy * k;
        ctx.save();
        ctx.strokeStyle = 'rgba(79,195,255,0.9)'; ctx.lineWidth = this.dpr * 2.6; ctx.shadowColor = '#4fc3ff'; ctx.shadowBlur = 6 * this.dpr;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(o.x - dx / dd * o.size, o.y - dy / dd * o.size); ctx.stroke();
        // capsule qui monte et descend le long du câble
        const q = (o.t * 0.0003 + o.index * 0.33) % 1, u = q < 0.5 ? q * 2 : 2 - q * 2;
        ctx.fillStyle = '#e6f7ff'; ctx.beginPath(); ctx.arc(sx + (o.x - sx) * u, sy + (o.y - sy) * u, this.dpr * 2.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      const g = ctx.createRadialGradient(o.x - o.size * 0.4, o.y - o.size * 0.4, o.size * 0.1, o.x, o.y, o.size);
      const mc = (o.colors && o.colors[o.index]) || ['#d8d4cc', '#6d6a66'];
      g.addColorStop(0, mc[0]); g.addColorStop(0.7, mc[1]); g.addColorStop(1, '#141414');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2); ctx.fill();
      // cratères
      ctx.fillStyle = 'rgba(40, 38, 36, 0.35)';
      [[-0.3, -0.1, 0.22], [0.25, 0.2, 0.16], [0.05, -0.4, 0.12], [-0.1, 0.4, 0.1]].forEach(([dx, dy, r]) => {
        ctx.beginPath(); ctx.arc(o.x + dx * o.size, o.y + dy * o.size, r * o.size, 0, Math.PI * 2); ctx.fill();
      });
      const gt = this.moonGates && this.moonGates[o.index];
      if (gt > 0) this.drawGate(o.t, o.x, o.y, o.base || o.size, gt, true, this.moonGateInfo[o.index].style, this.moonGateInfo[o.index].color, this.moonGateInfo[o.index].seed, o.size);
    } else {
      ctx.fillStyle = '#cfe8ff';
      ctx.fillRect(o.x - o.size, o.y - o.size / 2, o.size * 2, o.size);
      if (Math.sin(o.t * 0.006 + o.x) > 0.6) {
        ctx.fillStyle = '#ff5a5a';
        ctx.beginPath(); ctx.arc(o.x, o.y, o.size * 0.7, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}
