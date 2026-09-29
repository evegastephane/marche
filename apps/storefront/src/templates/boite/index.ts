import type { StorefrontTemplate } from '../types';
import { Footer, Header } from './chrome';
import { CatalogPage, ProductPage } from './pages';
import { HomeSections } from './sections';

/** « La boîte du téléphone » : chaque appareil présenté comme sa boîte d'origine. */
export const boiteTemplate: StorefrontTemplate = { id: 'boite', Header, Footer, HomeSections, ProductPage, CatalogPage };
