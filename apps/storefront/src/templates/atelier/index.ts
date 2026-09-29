import type { StorefrontTemplate } from '../types';
import { Footer, Header } from './chrome';
import { CatalogPage, ProductPage } from './pages';
import { HomeSections } from './sections';

/** « Le cahier du tailleur » : la boutique de mode comme le cahier de commandes de l'atelier. */
export const atelierTemplate: StorefrontTemplate = { id: 'atelier', Header, Footer, HomeSections, ProductPage, CatalogPage };
