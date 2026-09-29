import type { StorefrontTemplate } from '../types';
import { Footer, Header } from './chrome';
import { CatalogPage, ProductPage } from './pages';
import { HomeSections } from './sections';

/** « La couverture de magazine » : la boutique publie son numéro du mois. */
export const couvertureTemplate: StorefrontTemplate = { id: 'couverture', Header, Footer, HomeSections, ProductPage, CatalogPage };
