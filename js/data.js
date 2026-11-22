/* ============================================================
   Données du jeu : ressources, bâtiments, technologies, icônes
   ============================================================ */

const RES_KEYS = ['ferrite', 'deuterium', 'darkMatter'];

const RESOURCES = {
  ferrite:    { name: 'Ferrite',       color: '#d9a066' },
  deuterium:  { name: 'Deutérium',     color: '#4fd1c5' },
  darkMatter: { name: 'Matière noire', color: '#a77bff' },
};

const ICONS = {
  drill:   '<svg viewBox="0 0 24 24"><path d="M8 21l4-17 4 17M9.6 15h4.8M10.6 10h2.8M5 21h14M12 4V2"/></svg>',
  drop:    '<svg viewBox="0 0 24 24"><path d="M12 2c4 5 7 9 7 13a7 7 0 0 1-14 0c0-4 3-8 7-13z M10 12v6M10 12h2.5a3 3 0 0 1 0 6H10"/></svg>',
  orb:     '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/><ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(-20 12 12)"/></svg>',
  box:     '<svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10"/></svg>',
  tank:    '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="16" rx="6"/><path d="M6 10h12M6 14h12M9 20v2M15 20v2"/></svg>',
  robot:   '<svg viewBox="0 0 24 24"><rect x="5" y="8" width="14" height="11" rx="2"/><circle cx="9.5" cy="13" r="1.3"/><circle cx="14.5" cy="13" r="1.3"/><path d="M12 8V4M10 4h4M2 13h3M19 13h3M9 19v2M15 19v2"/></svg>',
  flask:   '<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21.5h11.6a2 2 0 0 0 1.7-3L14 9V3M7 15h10"/></svg>',
  atom:    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></svg>',
  chip:    '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
  laser:   '<svg viewBox="0 0 24 24"><path d="M3 12h4M7 9h4v6H7z M11 12h10M16 8l2-2M16 16l2 2M19 12h3"/></svg>',
  ion:     '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" stroke-dasharray="2 3"/><circle cx="12" cy="12" r="10.5" stroke-dasharray="1 4"/></svg>',
  warp:    '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 11a1 1 0 1 0 1 1M21 3l-6 6"/></svg>',
  crate:   '<svg viewBox="0 0 24 24"><path d="M3 8l9-5 9 5-9 5z M3 8v8l9 5 9-5V8 M7.5 5.5l9 5"/></svg>',
  pick:    '<svg viewBox="0 0 24 24"><path d="M3 10C5 5 10 3 15 4M14 4c5 1 7 5 7 9M9.5 8.5L20 21"/></svg>',
  wave:    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/></svg>',
  star:    '<svg viewBox="0 0 24 24"><path d="M12 2l2.6 6.6L21 9.3l-5 4.4 1.6 6.8L12 17l-5.6 3.5L8 13.7 3 9.3l6.4-.7z"/></svg>',
  magnet:  '<svg viewBox="0 0 24 24"><path d="M5 3h4v8a3 3 0 0 0 6 0V3h4v8a7 7 0 0 1-14 0z M5 7h4M15 7h4"/></svg>',
  dice:    '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.2"/><circle cx="16" cy="8" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="8" cy="16" r="1.2"/><circle cx="16" cy="16" r="1.2"/></svg>',
  link:    '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  factory: '<svg viewBox="0 0 24 24"><path d="M2 21V10l6 3V10l6 3V6h3l1-3h2l1 3v15z M6 17h2M11 17h2M16 17h2"/></svg>',
  shipCruiser:   '<svg viewBox="0 0 24 24"><path d="M5 12l5-3h6l3 3-3 3h-6z M10 9v6"/></svg>',
  shipFrigate:   '<svg viewBox="0 0 24 24"><path d="M2 13l4-4h10l6 4-6 3H6z M9 9V6h4v3M6 13h12"/></svg>',
  shipDestroyer: '<svg viewBox="0 0 24 24"><path d="M1 12l5-5h9l3-2h3l2 7-2 7h-3l-3-2H6z M8 7v10M12 9h6M12 15h6M17 5v3"/></svg>',
  dove:    '<svg viewBox="0 0 24 24"><path d="M3 14c4 0 6-2 8-6 1 3 3 5 7 5l3-2-1 4c-2 3-6 4-10 3l-4 3 1-4c-2 0-3-1-4-3z M16 9l2-4"/></svg>',
  shield:  '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z M12 6v12M7 10h10"/></svg>',
  gate:    '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="6" ry="9"/><ellipse cx="12" cy="12" rx="2.5" ry="5"/><path d="M3 21h18M6 21l1-3M18 21l-1-3"/></svg>',
  lift:    '<svg viewBox="0 0 24 24"><path d="M12 2v20M8 22h8M6 2h12"/><rect x="8.5" y="8" width="7" height="6" rx="1.5"/><path d="M10 11h4"/></svg>',
  rocket:  '<svg viewBox="0 0 24 24"><path d="M12 2c3 2.5 4.5 6 4.5 10v4h-9v-4C7.5 8 9 4.5 12 2z M9.5 9.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0 M7.5 13L5 16v3l2.5-1.5M16.5 13L19 16v3l-2.5-1.5M10 19l2 3 2-3"/></svg>',
  swap:    '<svg viewBox="0 0 24 24"><path d="M4 8h15l-4-4M20 16H5l4 4"/></svg>',
  cart:    '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.5 11h11L21 7H6.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/><path d="M12 8v4M10 10h4"/></svg>',
  moon:    '<svg viewBox="0 0 24 24"><circle cx="9" cy="12" r="5"/><circle cx="19" cy="7" r="2.5"/><path d="M4 18c4 3 12 3 17-4"/></svg>',
  drone:   '<svg viewBox="0 0 24 24"><rect x="9" y="10" width="6" height="4" rx="1"/><path d="M9 12H5M15 12h4M5 9v6M19 9v6M3 9h4M17 9h4M12 14v3M10 19h4"/></svg>',
};

/* Bâtiments — cost : coût du niveau 1, factor : multiplicateur par niveau */
const BUILDINGS = {
  mineFerrite: {
    name: 'Mine de Ferrite', short: 'Ferrite', cat: 'mines', icon: 'drill', color: RESOURCES.ferrite.color,
    desc: "Extrait le ferrite des couches profondes. Matériau de base de toute construction.",
    cost: { ferrite: 75 }, factor: 1.5,
  },
  mineDeuterium: {
    name: 'Extracteur de Deutérium', short: 'Deutérium', cat: 'mines', icon: 'drop', color: RESOURCES.deuterium.color,
    desc: "Isole le deutérium des océans glacés. Indispensable à la recherche.",
    cost: { ferrite: 48, deuterium: 24 }, factor: 1.6,
  },
  darkMatterCollector: {
    hidden: true,   // masquée : la matière noire vient de l'Accélérateur de particules
    name: 'Collecteur de Matière Noire', short: 'Matière noire', cat: 'mines', icon: 'orb', color: RESOURCES.darkMatter.color,
    desc: "Capte la matière noire qui traverse la planète. Ressource rare des technologies avancées.",
    cost: { ferrite: 225, deuterium: 75 }, factor: 1.5,
  },
  storeFerrite: {
    name: 'Hangar de Ferrite', short: 'Ferrite', cat: 'storage', icon: 'box', color: RESOURCES.ferrite.color,
    desc: "Augmente la quantité de ferrite stockable.",
    cost: { ferrite: 1000 }, factor: 2,
  },
  storeDeuterium: {
    name: 'Réservoir de Deutérium', short: 'Deutérium', cat: 'storage', icon: 'tank', color: RESOURCES.deuterium.color,
    desc: "Augmente la quantité de deutérium stockable.",
    cost: { ferrite: 1000, deuterium: 500 }, factor: 2,
  },
  storeDarkMatter: {
    name: 'Confinement de Matière Noire', short: 'M. noire', cat: 'storage', icon: 'crate', color: RESOURCES.darkMatter.color,
    desc: "Augmente la quantité de matière noire stockable.",
    cost: { ferrite: 1000, deuterium: 1000 }, factor: 2,
  },
  shipyard: {
    name: 'Usine Spatiale', short: 'Usine spat.', cat: 'shipyard', icon: 'factory', color: '#ff8c5a',
    desc: "Construit les vaisseaux de votre flotte : le niveau 1 débloque le Bouclier électromagnétique (défense), le niveau 2 l'Explorer (exploration), le niveau 10 le Destroyer (carte galactique). Chaque niveau suivant réduit leur coût de 5 %.",
    cost: { ferrite: 2000, deuterium: 1000, darkMatter: 300 }, factor: 2,
  },
};

/* Technologies — req : { buildings: {...}, techs: {...} } */
const TECHS = {
  physics: {
    per: 2, sign: '+',
    name: 'Physique Quantique', short: 'Phys. quant.', icon: 'atom', color: '#ffd166',
    desc: "Les fondations de toute science avancée. Prérequis de nombreuses technologies.",
    effect: "+2 % de toute production par niveau",
    bonus: L => `+${2 * L} % production`,
    cost: { deuterium: 800, darkMatter: 400 }, factor: 2,
  },
  deepDrilling: {
    per: 4, sign: '+',
    name: 'Forage Profond', short: 'Forage prof.', icon: 'drill', color: RESOURCES.ferrite.color,
    desc: "Des foreuses capables d'atteindre le manteau planétaire.",
    effect: "+4 % de production de ferrite par niveau",
    bonus: L => `+${4 * L} % ferrite`,
    cost: { ferrite: 400, deuterium: 200 }, factor: 2,
  },
  ai: {
    per: 3, sign: '−',
    name: 'Intelligence Artificielle', short: 'IA', icon: 'chip', color: '#8fd694',
    desc: "Optimisation des chantiers par IA.",
    effect: "−3 % du coût des bâtiments par niveau",
    bonus: L => `−${Math.round((1 - Math.pow(0.97, L)) * 100)} % coût`,
    cost: { deuterium: 400, darkMatter: 600 }, factor: 2,
  },
  deutRefining: {
    per: 4, sign: '+',
    name: 'Raffinage du Deutérium', short: 'Raffin. deut.', icon: 'drop', color: RESOURCES.deuterium.color,
    desc: "Séparation isotopique à haut rendement.",
    effect: "+4 % de production de deutérium par niveau",
    bonus: L => `+${4 * L} % deutérium`,
    cost: { ferrite: 300, deuterium: 600 }, factor: 2,
    req: { techs: { physics: 1 } },
  },
  logistics: {
    per: 10, sign: '+',
    name: 'Logistique Quantique', short: 'Logistique', icon: 'crate', color: '#a0b4c8',
    desc: "Compression de la matière dans des poches dimensionnelles.",
    effect: "+10 % de capacité de stockage par niveau",
    bonus: L => `+${10 * L} % stockage`,
    cost: { ferrite: 1000, deuterium: 500 }, factor: 2,
  },
  dmCondensation: {
    per: 5, sign: '+',
    name: 'Condensation de Matière Noire', short: 'Conden. m.n.', icon: 'orb', color: RESOURCES.darkMatter.color,
    desc: "Piégeage gravitationnel de la matière noire.",
    effect: "+5 % de production de matière noire par niveau",
    bonus: L => `+${5 * L} % matière noire`,
    cost: { ferrite: 500, deuterium: 800, darkMatter: 300 }, factor: 2,
    req: { techs: { physics: 3 } },
  },
  ions: {
    per: 3, sign: '+',
    name: 'Technologie Ions', short: 'Ions', icon: 'ion', color: '#4fc3ff',
    desc: "Faisceaux ioniques pour l'extraction de précision.",
    effect: "+3 % de toute production par niveau",
    bonus: L => `+${3 * L} % production`,
    cost: { ferrite: 1000, deuterium: 300, darkMatter: 100 }, factor: 2,
    req: { techs: { physics: 4, deepDrilling: 3 } },
  },
  hyperspace: {
    per: 5, sign: '+',
    name: 'Technologie Hyperespace', short: 'Hyperespace', icon: 'warp', color: '#e0aaff',
    desc: "Plier l'espace-temps. Ouvre la voie au voyage interstellaire (prochaine mise à jour).",
    effect: "+5 % de toute production par niveau",
    bonus: L => `+${5 * L} % production`,
    cost: { deuterium: 4000, darkMatter: 2000 }, factor: 2,
    req: { techs: { physics: 5, ions: 3 } },
  },
};

/* Paramètres de production */
const MINES = {
  mineFerrite:         { res: 'ferrite',    base: 3 },
  mineDeuterium:       { res: 'deuterium',  base: 2 },
  darkMatterCollector: { res: 'darkMatter', base: 1 },
};

/* Technologies (achetées avec les matériaux, instantanées, sans case).
   type : ligne d'affichage (voir TECH_TYPES) */
const CLICK_TECHS = {
  pickFerrite: {
    type: 'hidden', name: 'Pioche à Ferrite', short: 'Pioche à ferr.', icon: 'pick', color: RESOURCES.ferrite.color,
    desc: 'Plus de ferrite à chaque clic.',
    cost: { ferrite: 30 }, factor: 1.8,
  },
  pickDeut: {
    type: 'hidden', name: 'Pioche à Deutérium', short: 'Pioche à deut.', icon: 'pick', color: RESOURCES.deuterium.color,
    desc: 'Vos clics extraient aussi du deutérium.',
    cost: { ferrite: 60 }, factor: 1.8,
  },
  robot: {
    type: 'hidden', name: 'Robot Mineur', short: 'Robot mineur', icon: 'robot', color: '#8fd694',
    desc: 'Un robot clique sur la planète à votre place, de plus en plus vite à chaque niveau (jeu ouvert).',
    cost: { ferrite: 400, deuterium: 150 }, factor: 2,
  },
  autoBuy: {
    type: 'extraction', name: 'Achat Automatique', short: 'Achat auto', icon: 'cart', color: '#4fc3ff',
    desc: "Chaque niveau ajoute des bâtiments ou technologies à l'achat automatique. Activez « AUTO » sur leurs tuiles : ils seront achetés dès que les matériaux sont disponibles. Au niveau 8 : achat automatique de la mine au plus bas niveau.",
    cost: { ferrite: 250, deuterium: 100 }, factor: 2.2, max: 8,
  },
  autoTrade: {
    type: 'galaxy', name: 'Conversion automatique', short: 'Conversion auto', icon: 'swap', color: '#7fe0b0',
    desc: "Une fois activée, quand un matériau manque pour une amélioration (manuelle ou automatique), les autres matériaux sont convertis automatiquement au ratio du Commerce (3:1), dans les sens d'échange débloqués.",
    reqClick: { exchanger: 1 },
    cost: { ferrite: 150000, deuterium: 60000, darkMatter: 10000 }, factor: 1, max: 1,
  },
  xferDeut: {
    type: 'hidden', name: 'Transfert Deutérium', short: 'Transf. deut.', icon: 'swap', color: RESOURCES.deuterium.color,
    desc: 'Échange du ferrite contre du deutérium, dans les deux sens. Chaque niveau augmente le nombre d\'unités échangées et rapproche le ratio de 1:1.',
    from: 'ferrite', to: 'deuterium',
    cost: { ferrite: 100 }, factor: 2.5,
  },
  xferDark: {
    type: 'hidden', name: 'Transfert Matière noire', short: 'Transf. m.n.', icon: 'swap', color: RESOURCES.darkMatter.color,
    desc: 'Échange du deutérium contre de la matière noire, dans les deux sens. Chaque niveau augmente le nombre d\'unités échangées et rapproche le ratio de 1:1.',
    from: 'deuterium', to: 'darkMatter',
    cost: { ferrite: 600, deuterium: 300 }, factor: 2.5,
  },
  armor: {
    type: 'hidden', name: 'Cuirassé', short: 'Cuirassé', icon: 'shield', color: '#9fb0c8',
    req: { buildings: { shipyard: 4 } },
    desc: "Blindage renforcé : chaque niveau protège 5 % des vaisseaux qui auraient dû être détruits lors d'une attaque pirate (jusqu'à 50 %).",
    cost: { ferrite: 30000, deuterium: 15000, darkMatter: 3000 }, factor: 2.5, max: 10,
  },
  hyperspeed: {
    type: 'space', name: 'Hypervitesse', short: 'Hypervitesse', icon: 'warp', color: '#7fd3ff',
    desc: "Propulsion hyperluminique : chaque niveau réduit de 15 % la durée des expéditions des explorers.",
    cost: { darkMatter: 2000 }, factor: 2.5, max: 8,
    req: { buildings: { shipyard: 5 } },
  },
  gate: {
    type: 'space', name: 'Carte galactique', short: 'Carte galactique', icon: 'gate', color: '#4fc3ff',
    desc: "Affiche la carte de la galaxie : chaque système est habité par un clan. Envoyez vos destroyers conquérir les systèmes voisins ; le but est de posséder toute la galaxie.",
    req: { buildings: { shipyard: 10 } },
    cost: { darkMatter: 15000 }, factor: 1, max: 1,
  },
  peace: {
    type: 'hidden', name: 'Paix Publique', short: 'Paix publique', icon: 'dove', color: '#e8e3c8',
    desc: "Ne rapporte aucun matériau : renforce votre respect politique. Chaque niveau réduit de 20 % la probabilité des rébellions et de l'hyperinflation, au profit du calme intersidéral.",
    cost: { ferrite: 2000, deuterium: 1000, darkMatter: 200 }, factor: 2, max: 10,
  },
  exchanger: {
    type: 'extraction', name: 'Commerce', short: 'Commerce', icon: 'swap', color: '#4fd1c5',
    desc: "Échange les matériaux entre eux. Ratio fixe 3:1. Les niveaux 1 à 6 débloquent chacun un nouveau sens d'échange, et chaque niveau augmente le nombre maximal d'unités échangées.",
    cost: { ferrite: 500 }, factor: 2,
  },
  jackpot: {
    type: 'extraction', name: 'Accélérateur de particules', short: 'Accélérateur', icon: 'atom', color: '#a77bff',
    desc: 'Toutes les 10 secondes, une collision de particules : en cas de succès, elle produit une quantité aléatoire de matière noire. Améliorez la puissance (quantité produite) ou l\'espérance (chance de succès).',
    cost: { ferrite: 60, deuterium: 20 }, factor: 1.7,
  },
  /* 2e amélioration du Casino (affichée dans la même tuile) */
  casinoLuck: {
    type: null, name: 'Espérance de l\'Accélérateur', icon: 'atom', color: '#a77bff',
    desc: 'Augmente la probabilité de succès de l\'Accélérateur de particules.',
    cost: { ferrite: 80, deuterium: 30 }, factor: 1.7, max: 18,
  },
  terraform: {
    type: 'space', name: 'Terraformage', short: 'Terraform.', icon: 'moon', color: '#cfd8e3',
    desc: 'Chaque niveau crée une nouvelle lune (3 maximum) et augmente toute la production de 5 %. Cliquez sur une lune pour la coloniser : mines et compteur de matière propres.',
    cost: { darkMatter: 10000 }, factor: 5, max: 3,
    req: { buildings: { shipyard: 3 } },
  },

};

/* Vaisseaux (construits à l'Usine Spatiale, coût fixe par unité) */
const SHIPS = {
  destroyer: {
    name: 'Bouclier électromagnétique', short: 'Bouclier EM', role: 'defense', icon: 'shield', color: '#4f9dff',
    desc: "Bouclier électromagnétique : sa puissance protège la planète contre les pirates.",
    cost: { ferrite: 3000, deuterium: 1200 }, factor: 1,
    atk: 60, explore: 0,
    req: { buildings: { shipyard: 1 } },
  },
  frigate: {
    name: 'Explorer', role: 'explore', icon: 'shipFrigate', color: '#ff6b6b',
    desc: "Vaisseau d'exploration : les explorers partent automatiquement en expédition (30 s) et rapportent un artefact selon leur score (explorers × aléatoire) : le meilleur artefact dont le seuil est atteint. Sans armement, il ne défend pas la planète.",
    cost: { ferrite: 4000, deuterium: 2000, darkMatter: 200 }, factor: 1,
    atk: 0, explore: 50,
    req: { buildings: { shipyard: 2 } },
  },
  warship: {
    name: 'Destroyer', role: 'galaxy', icon: 'shipDestroyer', color: '#ff9f43',
    desc: "Vaisseau de guerre de la carte galactique : cliquez sur une planète de la carte pour y envoyer un destroyer. Les combats de la carte se comptent en nombre de destroyers.",
    cost: { ferrite: 8000, deuterium: 4000, darkMatter: 500 }, factor: 1,
    atk: 0, explore: 0,
    req: { buildings: { shipyard: 10 } },
  },
};

/* Technologies d'une lune (payées avec le compteur de la lune) */
const MOON_TECHS = {
  cargo: {
    name: 'Ascenseur Gravitationnel', short: 'Ascenseur', icon: 'lift', color: '#a77bff',
    desc: 'Toutes les 30 secondes, envoie le stock de la lune vers la planète principale. Chaque niveau augmente la quantité transportée.',
    cost: { darkMatter: 10000 }, factor: 1.8,
  },
};

/* Lignes de technologies (un type par ligne) */
/* Artefacts : trouvés par les explorers au retour d'expédition.
   pts : score d'expédition minimum (explorers × aléatoire) ; on reçoit le meilleur accessible.
   Chaque exemplaire cumule son effet, sans limite de nombre. */
const ARTIFACT_RARITY = {
  common:    { name: 'Commun',     color: '#9fb0c8', weight: 60 },
  rare:      { name: 'Rare',       color: '#4fc3ff', weight: 30 },
  legendary: { name: 'Légendaire', color: '#ffb347', weight: 10 },
};
const ARTIFACTS = {
  meteor:   { pts: 2, name: 'Fragment de météorite', icon: '☄️', rarity: 'common',    effect: n => `+${2 * n} % de production de ferrite` },
  frost:    { pts: 5, name: 'Cristal de givre',      icon: '❄️', rarity: 'common',    effect: n => `+${2 * n} % de production de deutérium` },
  gear:     { pts: 10, name: 'Rouage ancien',         icon: '⚙️', rarity: 'common',    effect: n => `−${2 * n} % sur le coût des mines` },
  relic:    { pts: 20, name: 'Amphore stellaire',     icon: '🏺', rarity: 'common',    effect: n => `+${10 * n} % de capacité des entrepôts` },
  compass:  { pts: 35, name: 'Boussole galactique',   icon: '🧭', rarity: 'rare',      effect: n => `+${n} % de toute production` },
  voidShard:{ pts: 55, name: 'Éclat du vide',         icon: '🔮', rarity: 'rare',      effect: n => `+${5 * n} % de matière noire de l'Accélérateur` },
  cannon:   { pts: 80, name: 'Canon précurseur',      icon: '🔱', rarity: 'rare',      effect: n => `+${5 * n} % de puissance des boucliers électromagnétiques` },
  aegis:    { pts: 110, name: 'Égide antique',         icon: '🛡️', rarity: 'rare',      effect: n => `+${3 * n} % de chances qu'un vaisseau détruit soit sauvé (65 % max)` },
  seal:     { pts: 150, name: 'Sceau diplomatique',    icon: '📜', rarity: 'rare',      effect: n => `−${Math.min(100, 10 * n)} % de ressources pillées par les pirates` },
  hourglass:{ pts: 250, name: 'Sablier temporel',      icon: '⏳', rarity: 'legendary', effect: n => `Accélérateur : une collision toutes les ${String(Math.round(Math.max(2, 10 - 0.2 * n) * 10) / 10).replace('.', ',')} s (−0,2 s par sablier, 2 s minimum)` },
  starHeart:{ pts: 400, name: 'Cœur d\'étoile',        icon: '🌟', rarity: 'legendary', effect: n => `+${n} % de ferrite par clic` },
};

/* Commerce : ordre de déblocage des sens d'échange (un par niveau) */
const EXCHANGE_PAIRS = [
  ['ferrite', 'deuterium'], ['deuterium', 'ferrite'],
  ['deuterium', 'darkMatter'], ['darkMatter', 'deuterium'],
  ['ferrite', 'darkMatter'], ['darkMatter', 'ferrite'],
];

/* Lignes du bloc Technologies (les techs « extraction » sont dans le bloc Extraction,
   les « hidden » ne sont pas affichées) */
const TECH_TYPES = [
  { id: 'politics', label: 'Politique' },
  { id: 'auto',     label: 'Automatisation' },
];

/* Noms de planète, tirés au lancement d'une partie : « Gliese-581 »… */
const PLANET_NAMES = ['Kepler', 'Gliese', 'Trappist', 'Proxima', 'Arcturus', 'Véga', 'Altaïr', 'Rigel', 'Sirius',
  'Aldébaran', 'Antarès', 'Deneb', 'Castor', 'Pollux', 'Elysium', 'Orion', 'Thalassa', 'Nérée', 'Hélios', 'Cassiopée'];

/* Noms des lunes : « Alpha#2 », « Sigma#7 »… */
const MOON_NAMES = ['Alpha', 'Bêta', 'Gamma', 'Delta', 'Epsilon', 'Zêta', 'Thêta', 'Iota', 'Kappa',
  'Lambda', 'Omicron', 'Rho', 'Sigma', 'Tau', 'Phi', 'Oméga'];

/* Ce que débloque chaque niveau d'Achat Automatique */
const AUTO_UNLOCKS = [
  { label: 'Mine de Ferrite', ids: ['mineFerrite'] },
  { label: 'Extracteur de Deutérium', ids: ['mineDeuterium'] },
  { label: 'Accélérateur de particules', ids: ['trading'] },
  { label: 'Commerce', ids: ['exchanger'] },
  { label: 'Entrepôts', ids: ['storeFerrite', 'storeDeuterium', 'storeDarkMatter'] },
  { label: 'Usine Spatiale, vaisseaux et Cuirassé', ids: ['shipyard', 'destroyer', 'frigate', 'armor'] },
  { label: 'Commerce', ids: ['xferDeut', 'xferDark', 'peace'] },
  { label: 'Mine la plus basse', lowest: true },
];

/* Événements : toutes les 30 s, un événement est tiré au sort selon son poids
   (les pirates sont un événement parmi les autres). */
const EVENTS = {
  pirates: {
    name: 'Pirates', kind: 'raid', share: 0.4, effect: 'Combat', color: '#ffb347',
    desc: 'Une vague pirate attaque : votre flotte la repousse si sa puissance de feu est suffisante, sinon les pirates pillent vos stocks.',
  },
  boss: {
    name: 'Chef pirate', kind: 'raid', weight: 4, effect: 'Boss', color: '#e0457b',
    desc: "Le chef pirate attaque en personne avec une flotte 5 fois plus puissante que la vague en cours. Victoire : gros butin (dont de la matière noire) et un trophée (+3 % de toute production, permanent). Défaite : pillage doublé et lourdes pertes.",
    cond: G => S.raid.wave >= 3,
  },
  hyperinflation: {
    name: 'Hyperinflation', kind: 'neg', weight: 9, effect: 'Prix ×2', color: '#ff8a8a',
    desc: 'Tous les prix sont doublés pendant 30 s.',
    apply(G) { S.raid.fx.inflation = Date.now() + G.RAID_PERIOD * 1000; return { note: 'Tous les prix ×2 pendant 30 s' }; },
  },
  rebellion: {
    name: 'Rébellion', kind: 'neg', weight: 8, effect: '−10 % flotte', color: '#ff6b6b',
    desc: "Une partie de l'équipage déserte avec 10 % des vaisseaux.",
    cond: G => G.fleetCount() > 0,
    apply(G) {
      const shipsLost = {};
      for (const id in SHIPS) { const n = S.fleet[id] ? Math.max(1, Math.floor(S.fleet[id] * 0.1)) : 0; S.fleet[id] -= n; shipsLost[id] = n; }
      return { shipsLost };
    },
  },
  rush: {
    name: 'Ruée minière', kind: 'pos', weight: 9, effect: 'Clics ×5', color: '#5fd38d',
    desc: 'Chaque clic sur la planète rapporte 5 fois plus pendant 30 s.',
    apply(G) { S.raid.fx.rush = Date.now() + G.RAID_PERIOD * 1000; return { note: 'Clics ×5 pendant 30 s' }; },
  },
  subsidy: {
    name: 'Subvention galactique', kind: 'pos', weight: 9, sticky: true, effect: '+20 s prod.', color: '#7fe0b0',
    desc: 'Verse 20 secondes de production de chaque matériau (au moins 250 ferrite). Tirée uniquement tant que la somme des niveaux des mines est inférieure à 20 ; une subvention annoncée est toujours versée.',
    cond: G => G.mineSum() < 20,
    apply(G) {
      const caps = G.rates().caps, resGain = {};
      const rt = G.rates();
      for (const r of RES_KEYS) { resGain[r] = Math.max(0, Math.min(Math.max(r === 'ferrite' ? 250 : 0, rt[r] * 20), caps[r] - S.res[r])); S.res[r] += resGain[r]; }
      return { resGain };
    },
  },
  tax: {
    name: 'Impôt galactique', kind: 'neg', weight: 10, effect: '−3 à 10 %', color: '#e8d39a',
    desc: 'Prélève entre 3 et 10 % de chaque matériau (taux tiré au sort), inévitable (uniquement si la somme des niveaux des mines dépasse 20).',
    cond: G => G.mineSum() > 20,
    apply(G) {
      const resLost = {};
      const rate = (arguments[1] && arguments[1].rate) || G.taxRate();   // annoncé à l'avance (3 à 10 %)
      for (const r of RES_KEYS) { resLost[r] = S.res[r] * rate; S.res[r] -= resLost[r]; }
      return { resLost, note: `taux ${Math.round(rate * 100)} %` };
    },
  },
  iceAge: {
    name: 'Ère glaciaire', kind: 'neg', weight: 6, effect: 'Prod. 10 %', color: '#bfe9ff',
    desc: 'La production de toutes les mines chute à 10 % pendant 30 s, et la planète se couvre de neige.',
    apply(G) { S.raid.fx.ice = Date.now() + G.RAID_PERIOD * 1000; return { note: 'Production à 10 % pendant 30 s' }; },
  },
  calm: {
    name: 'Calme intersidéral', kind: 'calm', weight: 15, effect: '-', color: '#9fb0c8',
    desc: "L'espace est calme : il ne se passe rien.",
    apply(G) { S.raid.fx.forest = Date.now() + G.RAID_PERIOD * 1000; return { note: "L'espace est calme" }; },   // effet visuel discret : de la végétation pousse sur la planète
  },
  signal: {
    name: 'Signal inconnu', kind: 'mystery', weight: 5, effect: '???', color: '#c9a8ff',
    desc: "Un signal mystérieux : l'un des autres événements, révélé au dernier moment.",
  },
};

/* Vagues pirates (une toutes les 30 s) : nom selon la vague */
const WAVE_TIERS = [
  { from: 1,  name: 'Pillards',        color: '#ffd166' },
  { from: 4,  name: 'Corsaires',       color: '#ffb347' },
  { from: 8,  name: 'Flotte pirate',   color: '#ff8c5a' },
  { from: 13, name: 'Armada pirate',   color: '#ff6b6b' },
  { from: 19, name: 'Pirate', color: '#e0457b' },
];
const STORES = { ferrite: 'storeFerrite', deuterium: 'storeDeuterium', darkMatter: 'storeDarkMatter' };
