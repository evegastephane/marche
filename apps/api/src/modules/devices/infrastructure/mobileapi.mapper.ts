import { COLOR_PRESETS, type ProductAttributes, type ProductKind } from '@marche/contracts';

/** Fiche d'appareil telle que la renvoie MobileAPI.dev (champs utilisés seulement, tous facultatifs). */
export interface MobileApiDevice {
  id: number | string;
  name?: string;
  manufacturer_name?: string;
  device_type?: string;
  colors?: string;
  storage?: string;
  release_date?: string;
  camera?: string;
  battery_capacity?: string;
  hardware?: string;
  screen_resolution?: string;
  network?: { technology?: string; bands_5g?: string };
  body?: { sim?: string };
  display?: { type?: string; size?: string };
  platform?: { os?: string; chipset?: string };
  memory?: { internal?: string };
  main_camera?: { modules?: string };
  battery?: { type?: string };
  misc?: { colors?: string };
}

/** Résultat de l'autocomplétion du service. */
export interface MobileApiHit {
  id: number | string;
  name?: string;
  manufacturer_name?: string;
  release_date?: string;
}

/** Fiche normalisée, en français, prête pour le catalogue partagé. */
export interface NormalizedDevice {
  providerId: string;
  brand: string;
  name: string;
  kind: ProductKind;
  year: number | null;
  attributes: ProductAttributes;
  storages: string[];
  colors: { value: string; hex: string | null }[];
  description: string;
}

const KIND_BY_TYPE: Record<string, ProductKind> = {
  smartphone: 'PHONE',
  phone: 'PHONE',
  tablet: 'TABLET',
  smartwatch: 'WATCH',
  watch: 'WATCH',
  laptop: 'COMPUTER',
};

/** Coloris courants : nom anglais du fabricant → nom français. Les autres restent tels quels (le marchand corrige). */
const COLOR_NAMES: Record<string, string> = {
  black: 'Noir',
  white: 'Blanc',
  silver: 'Argent',
  gold: 'Or',
  blue: 'Bleu',
  red: 'Rouge',
  green: 'Vert',
  purple: 'Violet',
  violet: 'Violet',
  pink: 'Rose',
  yellow: 'Jaune',
  orange: 'Orange',
  gray: 'Gris',
  grey: 'Gris',
  brown: 'Marron',
  beige: 'Beige',
  graphite: 'Graphite',
  midnight: 'Minuit',
  starlight: 'Lumière stellaire',
  titanium: 'Titane',
  'natural titanium': 'Titane naturel',
  'black titanium': 'Titane noir',
  'white titanium': 'Titane blanc',
  'space gray': 'Gris sidéral',
  'space grey': 'Gris sidéral',
  'rose gold': 'Or rose',
  'sierra blue': 'Bleu alpin',
  'pacific blue': 'Bleu pacifique',
  'deep blue': 'Bleu profond',
  'light blue': 'Bleu clair',
  'dark blue': 'Bleu foncé',
  'navy': 'Bleu marine',
  'mint': 'Menthe',
  'lavender': 'Lavande',
  'cream': 'Crème',
  'bronze': 'Bronze',
  'copper': 'Cuivre',
};

/** Couleur de base d'un nom anglais, pour choisir une pastille du nuancier. */
const BASE_HEX: [RegExp, string][] = [
  [/black|midnight|graphite|onyx|obsidian/i, 'Noir'],
  [/white|starlight|cream|pearl/i, 'Blanc'],
  [/silver|titanium|platinum/i, 'Argent'],
  [/rose gold|pink|coral/i, 'Rose'],
  [/gold|champagne/i, 'Or'],
  [/navy|deep blue|dark blue/i, 'Bleu nuit'],
  [/blue|cyan|aqua|teal/i, 'Bleu'],
  [/red|crimson/i, 'Rouge'],
  [/green|mint|olive|emerald/i, 'Vert'],
  [/purple|violet|lavender|lilac/i, 'Violet'],
  [/yellow|lemon/i, 'Jaune'],
  [/orange/i, 'Orange'],
  [/gray|grey|space/i, 'Gris'],
  [/brown|bronze|copper/i, 'Marron'],
  [/beige|sand/i, 'Beige'],
];

const nbsp = ' ';

/** « 3998 » → « 3 998 » (espace fine insécable, comme le reste des montants du site). */
function group(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, nbsp);
}

const decimalFr = (n: number) => n.toString().replace('.', ',');

function firstSegment(value: string | undefined): string | undefined {
  const head = value?.split(/[,;]/)[0]?.trim();
  return head || undefined;
}

/** « 256GB » → « 256 Go », « 1TB » → « 1 To ». */
function capacity(token: string): string | null {
  const match = /(\d+(?:\.\d+)?)\s*(GB|TB|MB)/i.exec(token);
  if (!match) return null;
  const unit = match[2]!.toUpperCase() === 'TB' ? 'To' : match[2]!.toUpperCase() === 'MB' ? 'Mo' : 'Go';
  return `${decimalFr(Number(match[1]))} ${unit}`;
}

const unique = <T>(values: T[]) => [...new Set(values)];

function parseStorages(device: MobileApiDevice): { storages: string[]; ram: string[] } {
  const internal = device.memory?.internal;
  if (internal) {
    const variants = internal.split(',').map((part) => part.trim()).filter(Boolean);
    const storages = unique(variants.map((v) => capacity(v.split(/\s+/)[0] ?? '')).filter((v): v is string => v !== null));
    const ram = unique(
      variants
        .map((v) => /(\d+(?:\.\d+)?)\s*GB\s*RAM/i.exec(v))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => `${decimalFr(Number(m[1]))} Go`),
    );
    return { storages, ram };
  }
  const storages = unique((device.storage ?? '').split(',').map((v) => capacity(v.trim())).filter((v): v is string => v !== null));
  const ramMatch = /(\d+(?:\.\d+)?)\s*GB\s*RAM/i.exec(device.hardware ?? '');
  return { storages, ram: ramMatch ? [`${decimalFr(Number(ramMatch[1]))} Go`] : [] };
}

function parseCamera(device: MobileApiDevice): string | undefined {
  const modules = (device.main_camera?.modules ?? '').split(';').map((m) => m.trim()).filter(Boolean);
  const megapixels = modules.map((m) => /(\d+(?:\.\d+)?)\s*MP/i.exec(m)?.[1]).filter((v): v is string => Boolean(v));
  if (megapixels.length > 0) {
    const best = Math.max(...megapixels.map(Number));
    const count = ['', '', 'Double ', 'Triple ', 'Quadruple '][Math.min(megapixels.length, 4)] ?? '';
    return `${count}${decimalFr(best)} Mpx`.trim();
  }
  const single = /(\d+(?:\.\d+)?)\s*MP/i.exec(device.camera ?? '')?.[1];
  return single ? `${decimalFr(Number(single))} Mpx` : undefined;
}

function parseBattery(device: MobileApiDevice): string | undefined {
  const source = `${device.battery?.type ?? ''} ${device.battery_capacity ?? ''}`;
  const mah = /(\d{3,5})\s*mAh/i.exec(source)?.[1];
  return mah ? `${group(Number(mah))} mAh` : undefined;
}

function parseScreenSize(device: MobileApiDevice): number | undefined {
  const source = device.display?.size ?? device.screen_resolution ?? '';
  const inches = /(\d+(?:\.\d+)?)\s*(?:inches|")/i.exec(source)?.[1];
  return inches ? Number(inches) : undefined;
}

function parseOs(device: MobileApiDevice): string | undefined {
  const os = firstSegment(device.platform?.os);
  return os?.replace(/\s*\(.*?\)\s*/g, ' ').trim() || undefined;
}

function parseProcessor(device: MobileApiDevice): string | undefined {
  const chipset = device.platform?.chipset ?? /RAM,\s*(.+)$/i.exec(device.hardware ?? '')?.[1];
  return chipset?.replace(/\s*\(.*?\)\s*/g, ' ').trim() || undefined;
}

function parseScreenTech(device: MobileApiDevice): string | undefined {
  return firstSegment(device.display?.type);
}

function has5g(device: MobileApiDevice): boolean {
  const bands = device.network?.bands_5g?.trim();
  return /5G/.test(device.network?.technology ?? '') || Boolean(bands && !/^no$/i.test(bands));
}

function hasDualSim(device: MobileApiDevice): boolean {
  const sim = device.body?.sim ?? '';
  return /dual/i.test(sim) || (/nano/i.test(sim) && /esim/i.test(sim));
}

export function frenchColor(name: string): { value: string; hex: string | null } {
  const key = name.trim().toLowerCase();
  const value = COLOR_NAMES[key] ?? name.trim();
  const base = COLOR_PRESETS.find((c) => c.value.toLowerCase() === value.toLowerCase())?.value ?? BASE_HEX.find(([re]) => re.test(key))?.[1];
  return { value, hex: base ? (COLOR_PRESETS.find((c) => c.value === base)?.hex ?? null) : null };
}

function parseColors(device: MobileApiDevice): { value: string; hex: string | null }[] {
  const list = (device.misc?.colors ?? device.colors ?? '').split(',').map((c) => c.trim()).filter(Boolean);
  const colors = list.map(frenchColor);
  return colors.filter((c, i) => colors.findIndex((o) => o.value === c.value) === i).slice(0, 12);
}

function parseYear(value: string | undefined): number | null {
  const year = /(19|20)\d{2}/.exec(value ?? '')?.[0];
  return year ? Number(year) : null;
}

/** Nom affiché : la marque devant le modèle, sans la répéter si le service l'a déjà mise. */
export function displayName(brand: string, name: string): string {
  return name.toLowerCase().startsWith(brand.toLowerCase()) ? name : `${brand} ${name}`.trim();
}

/** Nom normalisé pour la recherche : minuscules, sans accents ni ponctuation. */
export function searchKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Liste française : « a, b et c ». */
function joinFr(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`;
}

/**
 * Description rédigée à partir de la fiche technique : uniquement ce que la fiche dit, sans promesse.
 * Le marchand la relit, la complète (état, accessoires fournis) et la corrige s'il le faut.
 */
export function describe(device: {
  brand: string;
  name: string;
  attributes: ProductAttributes;
  storages: string[];
  colors: { value: string }[];
}): string {
  const a = device.attributes;
  const title = displayName(device.brand, device.name);
  const screen =
    typeof a.screenSize === 'number'
      ? `un écran${typeof a.screenTech === 'string' ? ` ${a.screenTech}` : ''} de ${decimalFr(a.screenSize)} pouces`
      : undefined;
  const parts = [screen, typeof a.processor === 'string' ? `le processeur ${a.processor}` : undefined, typeof a.ram === 'string' ? `${a.ram} de mémoire vive` : undefined].filter(
    (p): p is string => Boolean(p),
  );
  const sentences = [parts.length > 0 ? `Le ${title} offre ${joinFr(parts)}.` : `${title}.`];
  if (typeof a.camera === 'string') sentences.push(`Appareil photo principal : ${a.camera}.`);
  if (typeof a.battery === 'string') sentences.push(`Batterie de ${a.battery}.`);
  if (typeof a.os === 'string') sentences.push(`Système : ${a.os}.`);
  const extras = [a.network5g === true ? 'compatible 5G' : undefined, a.dualSim === true ? 'double SIM' : undefined].filter((p): p is string => Boolean(p));
  if (extras.length > 0) sentences.push(`${extras.join(', ').replace(/^./, (c) => c.toUpperCase())}.`);
  if (device.storages.length > 0) sentences.push(`Existe en ${joinFr(device.storages)}.`);
  if (device.colors.length > 0) sentences.push(`Coloris : ${joinFr(device.colors.map((c) => c.value))}.`);
  return sentences.join(' ');
}

/** Fiche MobileAPI.dev → fiche du catalogue partagé (attributs des fiches produit Upsell). */
export function normalizeDevice(device: MobileApiDevice): NormalizedDevice {
  const brand = device.manufacturer_name?.trim() || 'Sans marque';
  const name = device.name?.trim() || 'Appareil';
  const kind = KIND_BY_TYPE[(device.device_type ?? '').toLowerCase()] ?? 'PHONE';
  const { storages, ram } = parseStorages(device);
  const attributes: ProductAttributes = {};
  const set = (key: string, value: string | number | boolean | undefined) => {
    if (value !== undefined && value !== '') attributes[key] = typeof value === 'string' ? value.slice(0, 200) : value;
  };
  set('model', name.toLowerCase().startsWith(brand.toLowerCase()) ? name.slice(brand.length).trim() : name);
  if (kind !== 'WATCH') {
    set('screenSize', parseScreenSize(device));
    set('screenTech', parseScreenTech(device));
    set('processor', parseProcessor(device));
    set('ram', ram.length > 0 ? ram.join(' ou ') : undefined);
    set('os', parseOs(device));
  }
  set('battery', parseBattery(device));
  if (kind === 'PHONE') {
    set('camera', parseCamera(device));
    set('network5g', has5g(device));
    set('dualSim', hasDualSim(device));
  }
  const colors = parseColors(device);
  const normalized = { providerId: String(device.id), brand, name, kind, year: parseYear(device.release_date), attributes, storages, colors };
  return { ...normalized, description: describe(normalized) };
}

export function normalizeHit(hit: MobileApiHit): { providerId: string; brand: string; name: string; year: number | null } {
  return {
    providerId: String(hit.id),
    brand: hit.manufacturer_name?.trim() || '',
    name: hit.name?.trim() || '',
    year: parseYear(hit.release_date),
  };
}
