import { describe, expect, it } from 'vitest';
import { frenchColor, type MobileApiDevice, normalizeDevice, searchKey } from './mobileapi.mapper.js';

// Réponse d'exemple publiée par MobileAPI.dev (dépôt api-evangelist/mobileapi-dev), image retirée.
const IPHONE: MobileApiDevice = {
  id: 12345,
  name: 'iPhone 17 Pro',
  manufacturer_name: 'Apple',
  device_type: 'smartphone',
  colors: 'Silver, Cosmic Orange, Deep Blue',
  storage: '256GB, 512GB, 1TB',
  release_date: 'Released 2025, September 19',
  camera: '48MP',
  battery_capacity: '3998 mAh',
  hardware: '12GB RAM, Apple A19 Pro',
  network: { technology: 'GSM / CDMA / HSPA / EVDO / LTE / 5G', bands_5g: 'Sub-6 + mmWave' },
  body: { sim: 'Nano-SIM and eSIM or Dual eSIM' },
  display: { type: 'LTPO Super Retina XDR OLED, 120Hz, HDR10, Dolby Vision, 2000 nits (HBM)', size: '6.3 inches, 100.4 cm2 (~91.5% screen-to-body ratio)' },
  platform: { os: 'iOS 19', chipset: 'Apple A19 Pro (3 nm)' },
  memory: { internal: '256GB 12GB RAM, 512GB 12GB RAM, 1TB 12GB RAM' },
  main_camera: {
    modules: '48 MP, f/1.7, 24mm (wide); 48 MP, f/2.8, 100mm (periscope telephoto), 4x optical zoom; 48 MP, f/2.2, 13mm, 120˚ (ultrawide)',
  },
  battery: { type: 'Li-Ion 3998 mAh, non-removable' },
  misc: { colors: 'Silver, Cosmic Orange, Deep Blue' },
};

// Fiche synthétique d'un téléphone Android d'entrée de gamme (format du service, valeurs d'essai).
const ANDROID: MobileApiDevice = {
  id: 'tx-1',
  name: 'Spark Test',
  manufacturer_name: 'Tecno',
  device_type: 'smartphone',
  release_date: 'Released 2024, March',
  network: { technology: 'GSM / HSPA / LTE', bands_5g: '' },
  body: { sim: 'Dual SIM (Nano-SIM, dual stand-by)' },
  display: { type: 'IPS LCD, 90Hz', size: '6.6 inches' },
  platform: { os: 'Android 14, HIOS 14', chipset: 'Mediatek Helio G85 (12 nm)' },
  memory: { internal: '128GB 4GB RAM, 128GB 8GB RAM, 256GB 8GB RAM' },
  main_camera: { modules: '50 MP, f/1.6 (wide); 0.08 MP (auxiliary lens)' },
  battery: { type: 'Li-Po 5000 mAh' },
  misc: { colors: 'Black, Blue, Green' },
};

describe('Fiche MobileAPI.dev → fiche Upsell', () => {
  it('traduit la fiche d’un iPhone : écran, processeur, mémoire, photo, batterie, réseau', () => {
    const device = normalizeDevice(IPHONE);
    expect(device).toMatchObject({ providerId: '12345', brand: 'Apple', name: 'iPhone 17 Pro', kind: 'PHONE', year: 2025 });
    expect(device.attributes).toEqual({
      model: 'iPhone 17 Pro',
      screenSize: 6.3,
      screenTech: 'LTPO Super Retina XDR OLED',
      processor: 'Apple A19 Pro',
      ram: '12 Go',
      os: 'iOS 19',
      battery: '3 998 mAh',
      camera: 'Triple 48 Mpx',
      network5g: true,
      dualSim: true,
    });
    expect(device.storages).toEqual(['256 Go', '512 Go', '1 To']);
    expect(device.colors).toEqual([
      { value: 'Argent', hex: '#C7C7CC' },
      { value: 'Cosmic Orange', hex: '#F66B21' },
      { value: 'Bleu profond', hex: '#1B2A4A' },
    ]);
  });

  it('garde plusieurs mémoires vives, repère le double SIM et l’absence de 5G', () => {
    const device = normalizeDevice(ANDROID);
    expect(device.attributes).toMatchObject({
      model: 'Spark Test',
      ram: '4 Go ou 8 Go',
      os: 'Android 14',
      processor: 'Mediatek Helio G85',
      camera: 'Double 50 Mpx',
      battery: '5 000 mAh',
      network5g: false,
      dualSim: true,
    });
    expect(device.storages).toEqual(['128 Go', '256 Go']);
  });

  it('rédige une description à partir de la fiche seulement', () => {
    const { description } = normalizeDevice(ANDROID);
    expect(description).toBe(
      'Le Tecno Spark Test offre un écran IPS LCD de 6,6 pouces, le processeur Mediatek Helio G85 et 4 Go ou 8 Go de mémoire vive. ' +
        'Appareil photo principal : Double 50 Mpx. Batterie de 5 000 mAh. Système : Android 14. Double SIM. ' +
        'Existe en 128 Go et 256 Go. Coloris : Noir, Bleu et Vert.',
    );
  });

  it('résiste à une fiche presque vide', () => {
    const device = normalizeDevice({ id: 7, name: 'Mystère' });
    expect(device).toMatchObject({ brand: 'Sans marque', kind: 'PHONE', year: null, storages: [], colors: [] });
    expect(device.attributes).toMatchObject({ model: 'Mystère', network5g: false, dualSim: false });
  });

  it('nomme les coloris en français et leur trouve une pastille', () => {
    expect(frenchColor('Space Gray')).toEqual({ value: 'Gris sidéral', hex: '#8E8E93' });
    expect(frenchColor('Midnight')).toEqual({ value: 'Minuit', hex: '#111111' });
    expect(frenchColor('Glacier Mist')).toEqual({ value: 'Glacier Mist', hex: null });
  });

  it('normalise un nom pour la recherche', () => {
    expect(searchKey('Samsung Galaxy A54 5G')).toBe('samsung galaxy a54 5g');
    expect(searchKey('  Téléphone — iPhone 12  ')).toBe('telephone iphone 12');
  });
});
