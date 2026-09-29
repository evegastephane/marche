import type { StorefrontTemplate } from '../types';
import { Footer, Header } from './chrome';
import { CatalogPage, ProductPage } from './pages';
import { HomeSections } from './sections';

/** « L'enseigne lumineuse » : la devanture du vendeur de téléphones, le soir. */
export const enseigneTemplate: StorefrontTemplate = { id: 'enseigne', Header, Footer, HomeSections, ProductPage, CatalogPage };
