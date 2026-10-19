import { MAX_SECTIONS, SECTION_LIMITS, type Section, type SectionType } from './theme.js';

/** Sections que l'éditeur du site propose dans son menu « + », dans cet ordre. */
export const ADDABLE_SECTION_TYPES = [
  'hero',
  'product-grid',
  'featured-collection',
  'brand-strip',
  'rich-text',
  'image-text',
  'faq',
  'contact',
] as const satisfies readonly SectionType[];
export type AddableSectionType = (typeof ADDABLE_SECTION_TYPES)[number];

/** « Chez Awa » → « Bienvenue chez Awa » ; « Maison Lumière » → « Bienvenue chez Maison Lumière ». */
export function welcomeTitle(storeName: string): string {
  const name = storeName.trim();
  const title = /^chez\s+/i.test(name) ? `Bienvenue ${name.replace(/^chez/i, 'chez')}` : `Bienvenue chez ${name}`;
  return title.slice(0, 120);
}

/** Pourquoi on ne peut plus ajouter ce type de section, ou null si on peut. */
export function sectionAddBlocker(sections: readonly Section[], type: SectionType): string | null {
  if (sections.length >= MAX_SECTIONS) return `${MAX_SECTIONS} sections au plus sur la page d’accueil.`;
  const limit = SECTION_LIMITS[type];
  if (limit !== undefined && sections.filter((s) => s.type === type).length >= limit) {
    return type === 'hero' ? 'La page a déjà sa bannière d’accueil.' : 'La page a déjà sa section contact.';
  }
  return null;
}

/** Identifiant libre dans la page : « faq », puis « faq-2 », « faq-3 »… */
function freeId(sections: readonly Section[], base: string): string {
  const taken = new Set(sections.map((s) => s.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/**
 * Nouvelle section, prête à s'afficher : textes de départ neutres que le marchand réécrit.
 * Les questions fréquentes arrivent sans réponse : rien n'est affirmé à la place de la boutique.
 */
export function newSection(type: AddableSectionType, sections: readonly Section[], storeName = ''): Section {
  const id = freeId(sections, type);
  switch (type) {
    case 'hero':
      return {
        id,
        type,
        enabled: true,
        title: storeName.trim() ? welcomeTitle(storeName) : 'Bienvenue',
        subtitle: '',
        ctaLabel: 'Voir les produits',
        ctaHref: '/collections',
        imageMediaId: null,
      };
    case 'product-grid':
      return { id, type, enabled: true, title: 'Nouveautés', limit: 8, sort: 'newest' };
    case 'featured-collection':
      return { id, type, enabled: true, title: 'À la une', categoryId: null, collectionId: null, limit: 8 };
    case 'brand-strip':
      return { id, type, enabled: true, title: 'Nos marques' };
    case 'rich-text':
      return { id, type, enabled: true, title: 'À propos', body: '' };
    case 'image-text':
      return { id, type, enabled: true, title: 'Notre histoire', body: '', imageMediaId: null, imagePosition: 'left' };
    case 'faq':
      return {
        id,
        type,
        enabled: true,
        title: 'Questions fréquentes',
        items: [
          { id: 'q1', question: 'Comment se passe la livraison ?', answer: '' },
          { id: 'q2', question: 'Comment puis-je payer ?', answer: '' },
          { id: 'q3', question: 'Puis-je échanger un article ?', answer: '' },
        ],
      };
    case 'contact':
      return {
        id,
        type,
        enabled: true,
        title: 'Nous contacter',
        subtitle: 'Une question sur un article ? Écrivez-nous ou appelez-nous.',
        showPhone: true,
        showWhatsapp: true,
        showEmail: true,
      };
  }
}

/** Questions prêtes à paraître sur le site : une question et sa réponse. */
export function answeredFaqItems(section: Extract<Section, { type: 'faq' }>) {
  return section.items.filter((item) => item.question.trim() && item.answer.trim());
}
