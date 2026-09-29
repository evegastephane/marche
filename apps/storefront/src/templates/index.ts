import { atelierTemplate } from './atelier';
import { boiteTemplate } from './boite';
import { couvertureTemplate } from './couverture';
import { Footer, Header } from './default/components/chrome';
import { CatalogPage, ProductPage } from './default/pages';
import { HomeSections } from './default/sections';
import { devantureTemplate } from './devanture';
import { enseigneTemplate } from './enseigne';
import { patronTemplate } from './patron';
import type { StorefrontTemplate } from './types';
import { vitrineTemplate } from './vitrine';

export type { CatalogPageProps, ProductPageProps, StorefrontTemplate } from './types';

const defaultTemplate: StorefrontTemplate = { id: 'default', Header, Footer, HomeSections, ProductPage, CatalogPage };

/** Registre des templates : ajouter un template = ajouter une entrée (et son manifeste dans les contrats). */
const TEMPLATES: Record<string, StorefrontTemplate> = Object.fromEntries(
  [defaultTemplate, atelierTemplate, patronTemplate, couvertureTemplate, vitrineTemplate, boiteTemplate, enseigneTemplate, devantureTemplate].map((t) => [t.id, t]),
);

export function getTemplate(id: string): StorefrontTemplate {
  return TEMPLATES[id] ?? defaultTemplate;
}
