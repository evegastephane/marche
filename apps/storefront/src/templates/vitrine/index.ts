import type { StorefrontTemplate } from '../types';
import { Footer, Header } from './chrome';
import { CatalogPage, ProductPage } from './pages';
import { HomeSections } from './sections';

/** « La vitrine du vendeur » : la boutique d'électronique comme un comptoir vitré. */
export const vitrineTemplate: StorefrontTemplate = { id: 'vitrine', Header, Footer, HomeSections, ProductPage, CatalogPage };
