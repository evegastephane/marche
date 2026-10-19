import { type AddableSectionType, answeredFaqItems, type Section, type StoreDto } from '@marche/contracts';
import {
  Columns2,
  FolderOpen,
  LayoutGrid,
  type LucideIcon,
  MessageCircle,
  MessageCircleQuestionMark,
  RectangleHorizontal,
  Tag,
  Type,
} from 'lucide-react';
import type { ReactNode } from 'react';

/** Ce que l'éditeur dit de chaque type de section : nom, phrase, pictogramme et croquis. */
export interface SectionKind {
  name: string;
  description: string;
  icon: LucideIcon;
  sketch: ReactNode;
}

/**
 * Croquis au trait d'une section, dans une fenêtre 120 × 72 : des aplats et des filets, comme un plan.
 * Les traits suivent l'encre tierce, les aplats le filet appuyé : ils basculent avec le thème.
 */
function Sketch({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 120 72" aria-hidden className="h-full w-full text-ink-3" fill="none">
      {children}
    </svg>
  );
}

const block = 'fill-line-strong';
const ink = 'fill-ink-3';

export const SECTION_KINDS: Record<AddableSectionType, SectionKind> = {
  hero: {
    name: 'Bannière d’accueil',
    description: 'Un grand titre, une phrase et un bouton, avec ou sans photo.',
    icon: RectangleHorizontal,
    sketch: (
      <Sketch>
        <rect x="8" y="8" width="104" height="56" rx="5" className={block} />
        <rect x="16" y="22" width="48" height="7" rx="2" className={ink} />
        <rect x="16" y="33" width="34" height="4" rx="2" className={ink} opacity="0.55" />
        <rect x="16" y="44" width="22" height="8" rx="4" className="fill-accent" />
      </Sketch>
    ),
  },
  'product-grid': {
    name: 'Nouveautés',
    description: 'Vos derniers produits en vente, ou les moins chers d’abord.',
    icon: LayoutGrid,
    sketch: (
      <Sketch>
        <rect x="8" y="10" width="40" height="5" rx="2" className={ink} />
        {[8, 36, 64, 92].map((x) => (
          <g key={x}>
            <rect x={x} y="22" width="20" height="26" rx="3" className={block} />
            <rect x={x} y="52" width="16" height="3" rx="1.5" className={ink} opacity="0.55" />
            <rect x={x} y="58" width="10" height="3" rx="1.5" className={ink} />
          </g>
        ))}
      </Sketch>
    ),
  },
  'featured-collection': {
    name: 'Produits d’une catégorie',
    description: 'Les produits d’une catégorie de votre choix, sous-catégories comprises.',
    icon: FolderOpen,
    sketch: (
      <Sketch>
        <rect x="8" y="10" width="30" height="9" rx="4.5" className={ink} opacity="0.55" />
        {[8, 46, 84].map((x) => (
          <g key={x}>
            <rect x={x} y="26" width="28" height="30" rx="3" className={block} />
            <rect x={x} y="60" width="18" height="3" rx="1.5" className={ink} />
          </g>
        ))}
      </Sketch>
    ),
  },
  'brand-strip': {
    name: 'Marques',
    description: 'Les marques de vos produits en vente, sur une ligne.',
    icon: Tag,
    sketch: (
      <Sketch>
        <rect x="8" y="14" width="34" height="5" rx="2" className={ink} />
        {[
          [8, 30],
          [42, 26],
          [72, 38],
          [8, 32],
          [44, 30],
        ].map(([x, w], i) => (
          <rect key={i} x={x} y={i < 3 ? 30 : 46} width={w} height="10" rx="5" className={block} />
        ))}
      </Sketch>
    ),
  },
  'rich-text': {
    name: 'Texte',
    description: 'Quelques paragraphes : votre histoire, vos engagements.',
    icon: Type,
    sketch: (
      <Sketch>
        <rect x="8" y="12" width="44" height="6" rx="2" className={ink} />
        {[26, 34, 42, 50].map((y, i) => (
          <rect key={y} x="8" y={y} width={i === 3 ? 62 : 100} height="3.5" rx="1.75" className={ink} opacity="0.55" />
        ))}
      </Sketch>
    ),
  },
  'image-text': {
    name: 'Image et texte',
    description: 'Une photo à côté d’un titre et d’un texte, avec un bouton si besoin.',
    icon: Columns2,
    sketch: (
      <Sketch>
        <rect x="8" y="10" width="48" height="52" rx="4" className={block} />
        <rect x="66" y="18" width="40" height="6" rx="2" className={ink} />
        {[30, 37, 44].map((y, i) => (
          <rect key={y} x="66" y={y} width={i === 2 ? 28 : 46} height="3.5" rx="1.75" className={ink} opacity="0.55" />
        ))}
        <rect x="66" y="52" width="22" height="7" rx="3.5" className={ink} />
      </Sketch>
    ),
  },
  faq: {
    name: 'Questions fréquentes',
    description: 'Livraison, paiement, échanges : les réponses se déplient.',
    icon: MessageCircleQuestionMark,
    sketch: (
      <Sketch>
        {[12, 30, 48].map((y) => (
          <g key={y}>
            <rect x="8" y={y} width="104" height="13" rx="3" className={block} />
            <rect x="14" y={y + 5} width="56" height="3.5" rx="1.75" className={ink} />
            <path d={`M101 ${y + 6.5}h6M104 ${y + 3.5}v6`} className="stroke-ink-3" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        ))}
      </Sketch>
    ),
  },
  contact: {
    name: 'Contact et WhatsApp',
    description: 'WhatsApp, téléphone et e-mail de vos Paramètres, adresse et horaires.',
    icon: MessageCircle,
    sketch: (
      <Sketch>
        <rect x="8" y="10" width="104" height="52" rx="5" className={block} />
        <rect x="16" y="20" width="38" height="6" rx="2" className={ink} />
        <rect x="16" y="31" width="30" height="3.5" rx="1.75" className={ink} opacity="0.55" />
        <rect x="64" y="20" width="40" height="11" rx="3" className="fill-accent" />
        <rect x="64" y="35" width="40" height="11" rx="3" className={ink} opacity="0.35" />
      </Sketch>
    ),
  },
};

/** Nom du type, y compris pour une section ancienne que l'éditeur ne propose plus. */
export function kindOf(section: Section): SectionKind {
  if (section.type === 'newsletter') {
    return { name: 'Lettre d’information', description: '', icon: Type, sketch: null };
  }
  return SECTION_KINDS[section.type];
}

/** Ligne de résumé sous le nom de la section : son titre, ou ce qu'elle montre. */
export function sectionSummary(section: Section, categoryName: (id: string) => string | undefined): string {
  switch (section.type) {
    case 'featured-collection': {
      const category = section.categoryId ? categoryName(section.categoryId) : undefined;
      if (category) return section.title && section.title !== category ? `${section.title} · ${category}` : category;
      return section.collectionId ? (section.title ?? 'Ancien catalogue') : 'Aucune catégorie choisie';
    }
    case 'faq': {
      const answered = answeredFaqItems(section).length;
      return `${section.title || 'Questions fréquentes'} · ${answered} réponse${answered > 1 ? 's' : ''}`;
    }
    case 'product-grid':
      return `${section.title || 'Produits'} · ${section.limit} produits`;
    default:
      return ('title' in section && section.title) || kindOf(section).name;
  }
}

/**
 * Ce qu'il reste à faire pour que la section paraisse sur le site, ou null si elle est prête.
 * `fix` dit où le faire quand ce n'est pas dans la section (les Paramètres).
 */
export function sectionGap(section: Section, store: StoreDto): { message: string; fix?: 'settings' } | null {
  switch (section.type) {
    case 'hero':
      return section.title.trim() ? null : { message: 'Le titre est obligatoire.' };
    case 'featured-collection':
      return section.categoryId || section.collectionId ? null : { message: 'Choisissez une catégorie.' };
    case 'rich-text':
      return section.body.trim() ? null : { message: 'Écrivez le texte : vide, la section ne s’affiche pas.' };
    case 'image-text':
      return section.imageMediaId || section.body.trim() ? null : { message: 'Ajoutez une photo ou un texte.' };
    case 'faq': {
      const missing = section.items.filter((item) => item.question.trim() && !item.answer.trim()).length;
      if (section.items.length === 0) return { message: 'Ajoutez une première question.' };
      return missing > 0
        ? { message: `${missing} réponse${missing > 1 ? 's' : ''} à écrire : sans réponse, la question reste cachée.` }
        : null;
    }
    case 'contact': {
      const reachable =
        ((section.showPhone || section.showWhatsapp) && store.phone) || (section.showEmail && store.contactEmail);
      if (reachable || section.address?.trim() || section.hours?.trim()) return null;
      return { message: 'Ajoutez un téléphone ou un e-mail dans les Paramètres.', fix: 'settings' };
    }
    default:
      return null;
  }
}
