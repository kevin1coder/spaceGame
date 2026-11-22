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

    const idx = [], u0 = [], row = [], shade = [], rim = [], alpha = [], latA = [];
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
      }
    }
    this.map = {
      idx: Int32Array.from(idx), u0: Float32Array.from(u0), row: Int32Array.from(row),
      shade: Float32Array.from(shade), rim: Float32Array.from(rim), alpha: Uint8Array.from(alpha), latA: Float32Array.from(latA), n: idx.length,
    };
  }

  /* Coordonnées CSS relatives au canvas => sur la planète ? */
  hit(x, y) {
    const c = this.cssSize / 2, R = this.cssSize * 0.33;
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
    // coque (vaisseau orienté vers la gauche)
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt);
    const L = size, H = size * 0.15;   // plus long, même hauteur qu'avant
    // aura bleue autour du vaisseau
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.85 + 0.15 * Math.sin(t * 0.004);
    const aura = ctx.createRadialGradient(0, 0, L * 0.15, 0, 0, L * 0.85);
    aura.addColorStop(0, `rgba(70,150,255,${0.45 * pulse})`);
    aura.addColorStop(0.5, `rgba(40,110,255,${0.18 * pulse})`);
    aura.addColorStop(1, 'rgba(20,60,200,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.ellipse(0, 0, L * 0.85, L * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // réacteurs (à l'arrière, à droite)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const fl = 0.8 + 0.2 * Math.sin(t * 0.04);
    for (const dy of [-H * 0.45, H * 0.45]) {
      const eg = ctx.createRadialGradient(L * 0.52, dy, 0, L * 0.52, dy, H * 0.9 * fl);
      eg.addColorStop(0, 'rgba(200,240,255,0.95)'); eg.addColorStop(0.4, 'rgba(80,180,255,0.6)'); eg.addColorStop(1, 'rgba(40,120,255,0)');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(L * 0.52, dy, H * 0.9 * fl, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    const hull = ctx.createLinearGradient(0, -H, 0, H);
    hull.addColorStop(0, '#3a404c'); hull.addColorStop(0.5, '#1a1e26'); hull.addColorStop(1, '#090b0f');
    ctx.fillStyle = hull; ctx.strokeStyle = 'rgba(90,160,255,0.55)'; ctx.lineWidth = this.dpr;
    ctx.beginPath();
    // proue carrée (avant droit, à gauche)
    ctx.moveTo(-L * 0.55, -H * 0.72);
    ctx.lineTo(L * 0.25, -H * 0.85); ctx.lineTo(L * 0.5, -H * 0.6);
    ctx.lineTo(L * 0.5, H * 0.6); ctx.lineTo(L * 0.25, H * 0.85);
    ctx.lineTo(-L * 0.55, H * 0.72);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // plaque frontale
    ctx.fillStyle = '#262b35';
    ctx.fillRect(-L * 0.55, -H * 0.72, L * 0.025, H * 1.44);
    // superstructure sombre
    ctx.fillStyle = '#20252f';
    ctx.fillRect(-L * 0.05, -H * 1.25, L * 0.28, H * 0.55);
    // hublots bleus : trois rangées le long de la coque + passerelle
    ctx.save();
    ctx.fillStyle = '#7fd3ff'; ctx.shadowColor = '#4fa8ff'; ctx.shadowBlur = 4 * this.dpr;
    const rows = [[-H * 0.42, 19, -0.46], [-H * 0.06, 21, -0.48], [H * 0.3, 19, -0.46]];
    for (const [ry, count, x0] of rows) {
      for (let i = 0; i < count; i++) {
        if ((i * 7 + count) % 5 === 0 && Math.sin(t * 0.002 + i) > 0.6) continue;   // quelques hublots qui s'éteignent
        ctx.fillRect(L * x0 + i * L * 0.044, ry, L * 0.02, H * 0.12);
      }
    }
    for (let i = 0; i < 5; i++) ctx.fillRect(-L * 0.02 + i * L * 0.05, -H * 1.08, L * 0.022, H * 0.14);
    ctx.restore();
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
      ['mineFerrite', 'derrick', '#d9a066'], ['mineDeuterium', 'tank', '#4fd1c5'], ['darkMatterCollector', 'dish', '#a77bff'],
      ['storeFerrite', 'dome', '#d9a066'], ['storeDeuterium', 'dome', '#4fd1c5'], ['storeDarkMatter', 'dome', '#a77bff'],
      ['shipyard', 'hangar', '#ff8c5a'],
    ];
    const rnd = mulberry32(this.seed ^ 0x2545f491), out = { seed: this.seed, list: [] };
    kinds.forEach(([id, shape, color], k) => {
      // centre de la colonie : réparti autour de la planète, loin des pôles
      const clon = (k / kinds.length + rnd() * 0.08) % 1, clat = (rnd() - 0.5) * 1.0;
      const sites = Array.from({ length: 6 }, (_, i) => ({
        lon: clon + (i === 0 ? 0 : (rnd() - 0.5) * 0.09),
        lat: clat + (i === 0 ? 0 : (rnd() - 0.5) * 0.5),
      }));
      out.list.push({ id, shape, color, sites });
    });
    return (this._sites = out);
  }

  drawStructures(t, cx, cy, R, levels) {
    const ctx = this.ctx, d = this.dpr;
    let Lx = -0.62, Ly = -0.38, Lz = 0.69; const ln = Math.hypot(Lx, Ly, Lz); Lx /= ln; Ly /= ln; Lz /= ln;
    const items = [];
    for (const b of this.structureSites().list) {
      const L = levels[b.id] || 0;
      if (!L) continue;
      const count = Math.min(6, 1 + Math.floor(L / 4));                // plus nombreux avec le niveau
      const size = R * 0.045 * (1 + 0.05 * Math.min(L, 30));             // plus imposants avec le niveau
      for (let i = 0; i < count; i++) {
        const p = this.surfacePoint(b.sites[i].lon, b.sites[i].lat, t, cx, cy, R);
        if (!p) continue;
        const light = p.nx * Lx + p.ny * Ly + p.depth * Lz;               // éclairage (jour / nuit)
        items.push({ ...p, b, s: size * (i === 0 ? 1 : 0.75) * Math.sqrt(p.depth), light, i });
      }
    }
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) {
      const { x, y, s, b } = it;
      const lit = Math.max(0.35, Math.min(1.15, 0.4 + it.light * 0.9));
      const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); return `rgb(${((n >> 16) & 255) * k | 0},${((n >> 8) & 255) * k | 0},${(n & 255) * k | 0})`; };
      // style base militaro-industrielle : métal blindé, plaques, accents de couleur, évents lumineux
      const metal = shade('#7d8794', lit), metalD = shade('#4a525e', lit), metalDD = shade('#2a3038', lit);
      const accent = shade(b.color, lit), night = it.light < 0.05;
      const poly = (pts, fill) => { ctx.beginPath(); pts.forEach(([px, py], k) => k ? ctx.lineTo(x + px * s, y + py * s) : ctx.moveTo(x + px * s, y + py * s)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
      const rect = (px, py, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x + px * s, y + py * s, w * s, h * s); };
      const glow = (px, py, r, col) => {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 0;
        const g = ctx.createRadialGradient(x + px * s, y + py * s, 0, x + px * s, y + py * s, r * s);
        g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + px * s, y + py * s, r * s, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      };
      const hazard = (px, py, w, h) => {                 // bande de danger jaune / noire
        rect(px, py, w, h, shade('#e8b83a', lit));
        ctx.fillStyle = metalDD;
        for (let k = 0; k < w / h; k += 2) ctx.fillRect(x + (px + k * h) * s, y + py * s, h * s, h * s);
      };
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = s * 0.35;
      ctx.lineWidth = Math.max(0.8, s * 0.06); ctx.lineJoin = 'round'; ctx.strokeStyle = metalDD;
      // plateforme octogonale commune
      poly([[-1.25, 0], [-0.95, -0.22], [0.95, -0.22], [1.25, 0], [0.95, 0.2], [-0.95, 0.2]], metalD);
      ctx.shadowBlur = 0;
      if (b.shape === 'derrick') {                        // chevalet de pompage (va-et-vient)
        // chaque pompe a sa propre phase ; un cycle ≈ 2,6 s
        const ph = t * 0.0024 + it.i * 1.9 + b.sites[0].lon * 20;
        const rock = Math.sin(ph) * 0.32;                     // inclinaison du balancier (rad)
        const P = [0.05, -1.25];                              // pivot au sommet du chevalet
        // socle blindé et bande de danger
        poly([[-1.0, -0.15], [-0.9, -0.38], [0.9, -0.38], [1.0, -0.15]], metal);
        hazard(-0.85, -0.3, 1.7, 0.1);
        // chevalet en A (samson post)
        poly([[-0.25, -0.38], [P[0] - 0.06, P[1]], [P[0] + 0.06, P[1]], [0.35, -0.38]], metalD);
        // manivelle + contrepoids (à droite), qui tournent
        const crank = [0.62, -0.62], cr = 0.22;
        const cx2 = crank[0] + Math.cos(ph) * cr, cy2 = crank[1] + Math.sin(ph) * cr;
        rect(0.5, -0.62, 0.24, 0.26, metalD);                 // boîte de réduction
        ctx.beginPath(); ctx.arc(x + cx2 * s, y + cy2 * s, 0.16 * s, 0, Math.PI * 2); ctx.fillStyle = metalDD; ctx.fill(); ctx.stroke();
        // balancier : tourne autour du pivot
        const beam = (bx, by) => [P[0] + bx * Math.cos(rock) - by * Math.sin(rock), P[1] + bx * Math.sin(rock) + by * Math.cos(rock)];
        const tail = beam(0.55, 0), head = beam(-0.75, 0);
        // bielle : de la manivelle à l'arrière du balancier
        ctx.strokeStyle = metalD; ctx.lineWidth = Math.max(1, s * 0.09);
        ctx.beginPath(); ctx.moveTo(x + cx2 * s, y + cy2 * s); ctx.lineTo(x + tail[0] * s, y + tail[1] * s); ctx.stroke();
        ctx.strokeStyle = metalDD; ctx.lineWidth = Math.max(0.8, s * 0.06);
        poly([beam(0.6, -0.07), beam(-0.7, -0.07), beam(-0.7, 0.07), beam(0.6, 0.07)], accent);
        // tête de cheval (à gauche)
        poly([beam(-0.68, -0.14), beam(-0.95, -0.08), beam(-1.0, 0.12), beam(-0.95, 0.3), beam(-0.7, 0.14)], metal);
        // câble qui monte et descend jusqu'à la tête de puits
        const hx = head[0] - 0.24, hy = head[1] + 0.28;
        ctx.strokeStyle = metalDD; ctx.lineWidth = Math.max(0.7, s * 0.04);
        ctx.beginPath(); ctx.moveTo(x + hx * s, y + hy * s); ctx.lineTo(x + hx * s, y - 0.42 * s); ctx.stroke();
        rect(hx - 0.1, -0.5, 0.2, 0.14, metalD);              // tête de puits
        ctx.beginPath(); ctx.arc(x + P[0] * s, y + P[1] * s, 0.06 * s, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
        glow(-0.2, -0.45, 0.4, 'rgba(255,170,80,0.4)');
      } else if (b.shape === 'tank') {                    // raffinerie : cuves et tuyaux
        rect(-0.95, -1.15, 0.6, 1.0, metal); rect(0.35, -1.0, 0.6, 0.85, metal);
        ctx.fillStyle = metalD; ctx.beginPath(); ctx.ellipse(x - 0.65 * s, y - 1.15 * s, 0.3 * s, 0.11 * s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 0.65 * s, y - 1.0 * s, 0.3 * s, 0.11 * s, 0, 0, Math.PI * 2); ctx.fill();
        poly([[-0.35, -0.15], [-0.3, -0.75], [0.3, -0.75], [0.35, -0.15]], metalD);
        rect(-0.38, -0.95, 0.76, 0.1, metalDD); rect(-0.38, -0.6, 0.76, 0.08, metalDD);   // tuyaux
        rect(-0.9, -0.75, 0.5, 0.1, accent); rect(0.4, -0.65, 0.5, 0.1, accent);
        glow(0, -0.5, 0.5, 'rgba(79,209,197,0.6)');
        rect(-0.08, -1.6, 0.16, 0.85, metalD);                // cheminée
      } else if (b.shape === 'dish') {                    // collecteur : prisme d'énergie sur socle blindé
        poly([[-0.8, -0.15], [-0.6, -0.6], [0.6, -0.6], [0.8, -0.15]], metal);
        poly([[-0.55, -0.6], [-0.2, -0.75], [0.2, -0.75], [0.55, -0.6]], metalD);
        poly([[0, -1.9], [0.3, -1.2], [0, -0.75], [-0.3, -1.2]], accent);   // cristal d'énergie
        ctx.strokeStyle = metalDD; ctx.beginPath(); ctx.moveTo(x - 0.5 * s, y - 0.65 * s); ctx.lineTo(x - 0.2 * s, y - 1.25 * s); ctx.moveTo(x + 0.5 * s, y - 0.65 * s); ctx.lineTo(x + 0.2 * s, y - 1.25 * s); ctx.stroke();
        glow(0, -1.3, 0.75, 'rgba(167,123,255,0.7)');
      } else if (b.shape === 'dome') {                    // entrepôt : bunker blindé
        poly([[-1.05, -0.15], [-0.85, -0.7], [0.85, -0.7], [1.05, -0.15]], metal);
        poly([[-0.75, -0.7], [-0.6, -0.95], [0.6, -0.95], [0.75, -0.7]], metalD);
        rect(-0.3, -0.55, 0.6, 0.4, metalDD);                 // porte
        rect(-0.3, -0.57, 0.6, 0.06, accent);
        rect(-0.9, -0.45, 0.4, 0.08, accent); rect(0.5, -0.45, 0.4, 0.08, accent);
      } else {                                            // usine spatiale : grand hangar à toit incliné
        poly([[-1.3, -0.15], [-1.2, -1.0], [-0.2, -1.35], [1.2, -1.0], [1.3, -0.15]], metal);
        poly([[-1.2, -1.0], [-0.2, -1.35], [-0.2, -1.15], [-1.1, -0.85]], metalD);
        rect(-0.55, -0.8, 1.1, 0.65, metalDD);                 // portes du hangar
        for (let k = 0; k < 4; k++) rect(-0.55 + k * 0.28, -0.8, 0.02, 0.65, metalD);
        hazard(-0.55, -0.2, 1.1, 0.1);
        rect(0.75, -1.75, 0.08, 0.8, metalD); rect(0.3, -1.78, 0.6, 0.08, metalD);   // grue
        rect(-1.15, -0.7, 0.3, 0.1, accent); rect(0.85, -0.7, 0.3, 0.1, accent);
      }
      // feux de position (clignotent) et éclairage nocturne
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      if (Math.sin(t * 0.005 + it.i * 1.7) > 0.2) {
        ctx.fillStyle = 'rgba(255,80,70,0.95)';
        ctx.beginPath(); ctx.arc(x - 1.0 * s, y - 0.05 * s, Math.max(d * 0.6, s * 0.07), 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 1.0 * s, y - 0.05 * s, Math.max(d * 0.6, s * 0.07), 0, Math.PI * 2); ctx.fill();
      }
      if (night) glow(0, -0.4, 0.9, 'rgba(255,200,120,0.45)');
      ctx.restore();
      ctx.restore();
    }
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
    const { idx, u0, row, shade, rim, alpha, latA, n } = this.map;
    const snow = opts.snow || 0, forest = opts.forest || 0, forestN = this.forestN;
    const tex = this.tex, cloud = this.cloud, lights = this.lights, emis = this.emissive, TW = this.TW;
    const data = this.img.data;
    const atm = this.traits.atm;
    const rot = t * 0.000011, crot = t * 0.0000145;
    const density = opts.lightDensity * 255;

    for (let i = 0; i < n; i++) {
      let u = u0[i] + rot; u -= Math.floor(u);
      const ti = row[i] + ((u * TW) | 0);
      let cu = u0[i] + crot; cu -= Math.floor(cu);
      const ca = cloud[row[i] + ((cu * TW) | 0)] / 255;

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
    const R = W * 0.33 * (1 + 0.035 * this.pulse);
    ctx.clearRect(0, 0, W, W);

    for (const st of this.stars) {
      const a = 0.25 + 0.75 * Math.pow(Math.sin(t * 0.001 * st.sp + st.ph), 2);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#dfe9ff';
      ctx.fillRect(st.x * W, st.y * W, st.r * this.dpr, st.r * this.dpr);
    }
    ctx.globalAlpha = 1;

    // halo arrière
    const glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.45);
    glow.addColorStop(0, `rgba(${atm[0]},${atm[1]},${atm[2]},${0.28 + 0.2 * this.pulse})`);
    glow.addColorStop(1, `rgba(${atm[0]},${atm[1]},${atm[2]},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2); ctx.fill();

    this.moonColors = opts.moonColors;
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

    orbiters.filter(o => o.z >= 0).forEach(o => this.drawOrbiter(o));
    if (opts.buildings) this.drawStructures(t, cx, cy, R, opts.buildings);
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
      list.push({ x: c + x0 * cT - y0 * sT, y: c + x0 * sT + y0 * cT, z: Math.sin(ang), size, kind, t });
    };
    // lune : créée par la technologie Terraformage, grossit avec les niveaux
    if (parent) { push(R * 1.4, 0.22, t * 0.00009 + 2.4, R * 0.15, 'parent'); list[list.length - 1].color = parent; }
    // lunes créées par le Terraformage (3 maximum), chacune sur son orbite
    const ORB = [[1.22, 0.22, 0.00012, 1, 0.085], [1.34, 0.3, 0.00009, 3.2, 0.07], [1.45, 0.16, 0.00007, 5.1, 0.06]];
    for (let i = 0; i < Math.min(3, moonCount); i++) {
      const [rad, flat, sp, ph, sz] = ORB[i];
      push(R * rad, flat, t * sp + ph, R * sz, 'moon');
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
