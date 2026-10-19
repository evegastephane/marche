'use client';

import { Lock, Menu, ShoppingBag } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { ROOT_DOMAIN, storeSlug } from '@/lib/platform';
import {
  amount,
  type DemoProduct,
  PRODUCTS,
  TEMPLATES,
  type TemplateId,
} from './data';
import { Swatch } from './wax';

/*
 * Le site de la boutique d'exemple au téléphone, dans quatre des vrais modèles d'Upsell (rendus simplifiés).
 * Il lit le stock de la page : un article épuisé l'est aussi ici.
 */

const FONTS: Record<
  TemplateId,
  { heading: string; body: string; hand?: string }
> = {
  default: {
    heading: 'var(--font-inter), sans-serif',
    body: 'var(--font-inter), sans-serif',
  },
  atelier: {
    heading: 'var(--font-archivo), sans-serif',
    body: 'var(--font-archivo), sans-serif',
    hand: 'var(--font-kalam), cursive',
  },
  couverture: {
    heading: 'var(--font-big-shoulders), sans-serif',
    body: 'var(--font-schibsted), sans-serif',
  },
  devanture: {
    heading: 'var(--font-alfa-slab), serif',
    body: 'var(--font-karla), sans-serif',
  },
};

export function Phone({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`uh-phone ${className ?? ''}`}>
      <div className="uh-phone-screen">
        <span aria-hidden className="uh-phone-island" />
        {children}
      </div>
    </div>
  );
}

export function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div
      aria-hidden
      className="flex h-9 shrink-0 items-end justify-between px-6 pb-1 text-[11px] font-[650] tabular-nums"
      style={{ color: dark ? '#fff' : '#111' }}
    >
      <span>18:42</span>
      <span className="flex items-center gap-1">
        <span className="flex items-end gap-[1.5px]">
          {[4, 6, 8, 10].map((h) => (
            <span
              key={h}
              className="w-[2.5px] rounded-[1px] bg-current"
              style={{ height: h }}
            />
          ))}
        </span>
        <span className="ml-1 h-[10px] w-[20px] rounded-[3px] border border-current/60 p-[1.5px]">
          <span className="block h-full w-[70%] rounded-[1.5px] bg-current" />
        </span>
      </span>
    </div>
  );
}

function stockNote(product: DemoProduct, left: number) {
  if (left === 0) return 'Épuisé';
  if (left <= product.threshold) return `Plus que ${left}`;
  return null;
}

export function SiteScreen({
  template,
  name,
  stock,
  address,
}: {
  template: TemplateId;
  name: string;
  stock: Record<string, number>;
  /** Adresse affichée dans la barre (tapée lettre à lettre à la génération). */
  address?: string;
}) {
  const palette = TEMPLATES.find((t) => t.id === template)!.palette;
  const fonts = FONTS[template];
  const slug = storeSlug(name) || 'chez-awa';
  const style = {
    '--s-bg': palette.bg,
    '--s-fg': palette.fg,
    '--s-muted': palette.muted,
    '--s-surface': palette.surface,
    '--s-line': palette.line,
    '--s-primary': palette.primary,
    '--s-accent': palette.accent,
    '--s-heading': fonts.heading,
    '--s-body': fonts.body,
    '--s-hand': fonts.hand ?? fonts.heading,
  } as CSSProperties;
  const dark = template === 'devanture';
  const products = PRODUCTS.slice(0, 4);

  return (
    <div className="uh-site" data-template={template} style={style}>
      <StatusBar dark={dark} />
      <div className="uh-site-url">
        <Lock className="size-3 shrink-0" strokeWidth={2.2} aria-hidden />
        <span className="truncate tabular-nums">
          {address ?? `${slug}.${ROOT_DOMAIN}`}
        </span>
      </div>
      <div className="uh-site-head">
        <span className="uh-site-name">{name}</span>
        <span className="flex shrink-0 items-center gap-3">
          <ShoppingBag className="size-[18px]" strokeWidth={1.8} aria-hidden />
          <Menu className="size-5" strokeWidth={1.8} aria-hidden />
        </span>
      </div>
      <div className="uh-site-hero" data-flip-id="hero">
        <span className="uh-site-hero-art">
          <Swatch wax="cercles" radius={0} className="size-full" />
        </span>
        <span className="uh-site-hero-text">
          <span className="uh-site-hero-title">
            {template === 'atelier' ? 'Cousu main à Dakar' : 'Wax de saison'}
          </span>
          <span className="uh-site-hero-cta">Voir</span>
        </span>
      </div>
      <ul className="uh-site-grid">
        {products.map((product) => {
          const left = stock[product.id] ?? 0;
          const note = stockNote(product, left);
          return (
            <li key={product.id} className="uh-site-card" data-out={left === 0}>
              <span className="uh-site-photo" data-site-tile={product.id}>
                <Swatch wax={product.wax} radius={0} className="size-full" />
              </span>
              <span className="uh-site-card-text">
                <span className="uh-site-card-name">{product.name}</span>
                <span className="uh-site-card-price">
                  {amount(product.price)} FCFA
                </span>
                {note && <span className="uh-site-card-note">{note}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
