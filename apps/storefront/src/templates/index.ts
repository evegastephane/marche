import type { StorefrontStoreDto } from '@marche/contracts';
import type { ComponentType, ReactNode } from 'react';
import { Footer, Header } from './default/components/chrome';
import { HomeSections } from './default/sections';

/**
 * Contrat d'un template (Abstract Factory, docs/ARCHITECTURE.md §5.5) : une famille cohérente
 * d'en-tête, pied de page et sections. Ajouter un template = ajouter une entrée au registre.
 */
export interface StorefrontTemplate {
  id: string;
  Header: ComponentType<{ store: StorefrontStoreDto; cartCount: number }>;
  Footer: ComponentType<{ store: StorefrontStoreDto }>;
  HomeSections: (props: { site: string; store: StorefrontStoreDto }) => ReactNode;
}

const defaultTemplate: StorefrontTemplate = { id: 'default', Header, Footer, HomeSections };

const TEMPLATES: Record<string, StorefrontTemplate> = { [defaultTemplate.id]: defaultTemplate };

export function getTemplate(id: string): StorefrontTemplate {
  return TEMPLATES[id] ?? defaultTemplate;
}
