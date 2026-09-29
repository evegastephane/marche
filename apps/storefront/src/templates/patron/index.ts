import type { StorefrontTemplate } from '../types';
import { Footer, Header } from './chrome';
import { CatalogPage, ProductPage } from './pages';
import { HomeSections } from './sections';

/** « Le patron de couture » : chaque article comme un modèle de patron sous enveloppe. */
export const patronTemplate: StorefrontTemplate = { id: 'patron', Header, Footer, HomeSections, ProductPage, CatalogPage };
