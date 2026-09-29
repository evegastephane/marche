import type {
  SpecialRequestStatus,
  SpecialRequestType,
} from '@marche/contracts';
import type { BadgeTone } from '@/shared/ui/badge';
import type { RequestFilter } from './api';

/** Nouvelle = il y a quelque chose à faire (témoin orange), offre envoyée = en attente du client. */
export const REQUEST_STATUS: Record<
  SpecialRequestStatus,
  { label: string; tone: BadgeTone }
> = {
  NEW: { label: 'À traiter', tone: 'attention' },
  QUOTED: { label: 'Offre envoyée', tone: 'draft' },
  CONVERTED: { label: 'Commandée', tone: 'on' },
  DECLINED: { label: 'Refusée', tone: 'off' },
};

export const REQUEST_TYPE: Record<
  SpecialRequestType,
  { label: string; detailsTitle: string; priceLabel: string }
> = {
  CONFIGURATION: {
    label: 'Sur commande',
    detailsTitle: 'Précisions',
    priceLabel: 'Prix unitaire',
  },
  TRADE_IN: {
    label: 'Reprise',
    detailsTitle: 'Appareil à reprendre',
    priceLabel: 'Prix unitaire, reprise déduite',
  },
  MADE_TO_MEASURE: {
    label: 'Sur mesure',
    detailsTitle: 'Mesures du client',
    priceLabel: 'Prix de la pièce sur mesure',
  },
};

export const REQUEST_FILTERS: { value: RequestFilter; label: string }[] = [
  { value: 'NEW', label: 'À traiter' },
  { value: 'QUOTED', label: 'Offres envoyées' },
  { value: 'CONVERTED', label: 'Commandées' },
  { value: 'DECLINED', label: 'Refusées' },
  { value: 'all', label: 'Toutes' },
];
