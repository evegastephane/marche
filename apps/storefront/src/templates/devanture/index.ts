import type { StorefrontTemplate } from '../types';
import { Footer, Header } from './chrome';
import { CatalogPage, ProductPage } from './pages';
import { HomeSections } from './sections';

/** « La devanture peinte » : la façade peinte de la boutique de quartier, mode et électronique. */
export const devantureTemplate: StorefrontTemplate = { id: 'devanture', Header, Footer, HomeSections, ProductPage, CatalogPage };
