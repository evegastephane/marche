'use client';

import type { Currency, StorefrontAccessoryDto, StorefrontBundleDto } from '@marche/contracts';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { cn, formatMoney } from '@/lib/format';
import { packDiscount } from '@/lib/product';
import type { Configurator } from './use-configurator';

function thumbnail(accessory: StorefrontAccessoryDto) {
  return accessory.image?.renditions['400'] ?? accessory.image?.url;
}

/**
 * Accessoires à cocher : ils partent au panier avec l'article, d'un seul geste.
 * Un accessoire à plusieurs déclinaisons propose son choix une fois coché.
 */
export function AccessoryChooser({
  accessories,
  currency,
  configurator,
  className,
  itemClassName,
}: {
  accessories: StorefrontAccessoryDto[];
  currency: Currency;
  configurator: Configurator;
  className?: string;
  itemClassName?: string;
}) {
  if (accessories.length === 0) return null;
  return (
    <ul className={cn('flex flex-col', className)}>
      {accessories.map((accessory) => {
        const chosen = configurator.extras[accessory.id];
        const checked = chosen !== undefined;
        const src = thumbnail(accessory);
        const variant = accessory.variants.find((v) => v.id === chosen) ?? accessory.variants[0];
        return (
          <li key={accessory.id} className={cn('flex flex-col gap-2 py-3', itemClassName)}>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => configurator.toggleExtra(accessory, checked ? null : (accessory.variants[0]?.id ?? null))}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-[0.35rem] border-2 border-current transition-colors peer-checked:bg-fg peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
              >
                {checked && <Check className="size-4" strokeWidth={3} />}
              </span>
              {src ? (
                <img src={src} alt="" loading="lazy" className="size-12 shrink-0 rounded-md object-cover" />
              ) : (
                <span aria-hidden className="size-12 shrink-0 rounded-md bg-current/10" />
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{accessory.title}</span>
                <span className="tabular text-sm opacity-80">
                  {accessory.priceMinAmount !== accessory.priceMaxAmount ? 'dès ' : '+ '}
                  {formatMoney(variant?.priceAmount ?? accessory.priceMinAmount, currency)}
                </span>
              </span>
            </label>
            {checked && accessory.variants.length > 1 && (
              <select
                aria-label={`Déclinaison de ${accessory.title}`}
                value={chosen}
                onChange={(e) => configurator.toggleExtra(accessory, e.target.value)}
                className="ml-9 min-h-11 rounded-md border border-current/30 bg-transparent px-3 text-sm"
              >
                {accessory.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} · {formatMoney(v.priceAmount, currency)}
                  </option>
                ))}
              </select>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Pack à prix réduit : l'appareil (dans la déclinaison choisie) et ses articles.
 * L'économie affichée suit la même règle que le panier ; c'est le panier qui fait foi.
 */
export function BundleOffer({
  bundle,
  currency,
  configurator,
  className,
  buttonClassName,
}: {
  bundle: StorefrontBundleDto;
  currency: Currency;
  configurator: Configurator;
  className?: string;
  buttonClassName?: string;
}) {
  const [choice, setChoice] = useState<Record<string, string>>(() =>
    Object.fromEntries(bundle.items.map((item) => [item.id, item.variants[0]?.id ?? ''])),
  );
  const anchorPrice = configurator.variant?.priceAmount ?? 0;
  const itemsPrice = bundle.items.reduce((sum, item) => {
    const variant = item.variants.find((v) => v.id === choice[item.id]) ?? item.variants[0];
    return sum + (variant?.priceAmount ?? item.priceMinAmount);
  }, 0);
  const total = anchorPrice + itemsPrice;
  const saving = packDiscount(bundle.discountType, bundle.discountValue, total);
  const ready = configurator.status === 'available' && bundle.items.every((item) => choice[item.id]);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{bundle.title}</p>
        <p className="tabular text-sm">
          {bundle.discountType === 'PERCENT' ? `−${bundle.discountValue} %` : `−${formatMoney(bundle.discountValue, currency)}`}
        </p>
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {bundle.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 truncate">+ {item.title}</span>
            {item.variants.length > 1 ? (
              <select
                aria-label={`Déclinaison de ${item.title}`}
                value={choice[item.id]}
                onChange={(e) => setChoice((prev) => ({ ...prev, [item.id]: e.target.value }))}
                className="min-h-10 rounded-md border border-current/30 bg-transparent px-2 text-sm"
              >
                {item.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="tabular text-sm">
          <span className="font-semibold">{formatMoney(total - saving, currency)}</span>{' '}
          <s className="opacity-70">
            <span className="sr-only">au lieu de </span>
            {formatMoney(total, currency)}
          </s>{' '}
          <span className="opacity-80">soit {formatMoney(saving, currency)} d’économie</span>
        </p>
        <button
          type="button"
          disabled={!ready || configurator.pending}
          onClick={() => configurator.addBundle(bundle.items.map((item) => choice[item.id]!).filter(Boolean))}
          className={cn('min-h-11 px-4 font-semibold disabled:opacity-50', buttonClassName)}
        >
          Ajouter le pack
        </button>
      </div>
    </div>
  );
}
