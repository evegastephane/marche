import type { Currency, ReportingPeriod } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Check, PackagePlus, ReceiptText, Store, Truck, Warehouse } from 'lucide-react';
import { useState } from 'react';
import { EnseigneBoutique } from '@/features/home/enseigne-boutique';
import { useLowStock, useOverview } from '@/features/home/api';
import { useOrderPreview } from '@/features/orders/api';
import { OrderQuickActions } from '@/features/orders/quick-actions';
import { PAYMENT_STATUS } from '@/features/orders/status';
import { useProductList } from '@/features/products/api';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { useSite } from '@/features/site/api';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { formatMoney, formatRelative, orderNumber, plural } from '@/shared/lib/format';
import { EmptyState, LoadError, PlancheHeader, Skeleton } from '@/shared/ui/feedback';
import { Plaque } from '@/shared/ui/plaque';

export const Route = createFileRoute('/_app/')({ component: Accueil });

function Accueil() {
  const [period, setPeriod] = useState<ReportingPeriod>('30d');
  const store = useCurrentStore();
  const site = useSite();
  const overview = useOverview(period);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <EnseigneBoutique
        store={store.data}
        site={site.data}
        overview={overview.data}
        period={period}
        onPeriodChange={setPeriod}
      />
      {overview.error && <LoadError message={errorMessage(overview.error)} onRetry={() => void overview.refetch()} />}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
        <AExpedier currency={store.data?.currency} total={overview.data?.ordersToFulfill} />
        <div className="flex flex-col gap-6 lg:gap-8">
          <Demarrage hasSite={Boolean(site.data)} siteOnline={site.data?.status === 'PUBLISHED'} />
          <StockBas />
        </div>
      </div>
    </div>
  );
}

function AExpedier({ currency, total }: { currency: Currency | undefined; total: number | undefined }) {
  const orders = useOrderPreview('to-ship', 8);
  const items = orders.data?.items ?? [];

  return (
    <section className="planche overflow-hidden">
      <PlancheHeader
        title="À expédier"
        count={total}
        actions={
          <Link to="/orders" search={{ filter: 'to-ship' }} className="text-[0.875rem] font-semibold text-baobab">
            Toutes les commandes
          </Link>
        }
      />
      {orders.isPending ? (
        <ul className="flex flex-col gap-3 px-5 pb-5">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton className="h-14" />
            </li>
          ))}
        </ul>
      ) : orders.error ? (
        <div className="px-5 pb-5">
          <LoadError message={errorMessage(orders.error)} onRetry={() => void orders.refetch()} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Truck} title="Rien à expédier">
          Les commandes passées sur votre site ou saisies ici arrivent dans cette liste, jusqu’à leur départ.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-filet border-t border-filet">
          {items.map((order) => (
            <li key={order.id}>
              <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors duration-150 hover:bg-baobab-50 max-sm:grid-cols-[auto_1fr]">
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: order.id }}
                  className="lettrage chiffres text-[1.75rem] text-baobab no-underline after:absolute after:inset-0 after:content-['']"
                >
                  {orderNumber(order.number)}
                </Link>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-[640]">{order.customerName ?? order.email ?? 'Client'}</span>
                  <span className="chiffres flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-encre-2">
                    <span>{plural(order.itemsCount, 'article', 'articles')}</span>
                    <span aria-hidden>·</span>
                    <span className="font-semibold text-encre">{formatMoney(order.totalAmount, currency ?? order.currency)}</span>
                    <span aria-hidden>·</span>
                    <span>{order.placedAt ? formatRelative(order.placedAt) : ''}</span>
                    {order.paymentStatus === 'UNPAID' && (
                      <Plaque tone={PAYMENT_STATUS.UNPAID.tone} className="ml-1">
                        {PAYMENT_STATUS.UNPAID.label}
                      </Plaque>
                    )}
                  </span>
                </div>
                <div className="relative z-10 max-sm:col-span-2 max-sm:justify-self-end">
                  <OrderQuickActions order={order} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StockBas() {
  const low = useLowStock(6);
  const items = low.data?.items ?? [];
  return (
    <section className="planche overflow-hidden">
      <PlancheHeader title="Stock bas" count={low.data ? items.length : undefined} />
      {low.isPending ? (
        <div className="flex flex-col gap-2 px-5 pb-5">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : low.error ? (
        <div className="px-5 pb-5">
          <LoadError message={errorMessage(low.error)} onRetry={() => void low.refetch()} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Warehouse} title="Stock au-dessus des seuils" className="py-8">
          Un article apparaît ici dès que sa quantité disponible passe sous son seuil d’alerte.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-filet border-t border-filet">
          {items.map((item) => (
            <li key={item.variantId}>
              <Link
                to="/products/$productId"
                params={{ productId: item.productId }}
                className="flex items-center justify-between gap-4 px-5 py-3 text-encre no-underline transition-colors duration-150 hover:bg-baobab-50"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-[640]">{item.productTitle}</span>
                  <span className="truncate text-[0.8125rem] text-encre-2">
                    {item.variantTitle} · {item.sku}
                  </span>
                </span>
                {item.isOut ? (
                  <Plaque tone="rouge">Rupture</Plaque>
                ) : (
                  <span className="chiffres shrink-0 text-[0.875rem] font-bold text-jaune-900">
                    Plus que {item.available}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Les trois étapes qui mènent à une boutique qui vend ; disparaît une fois tout fait. */
function Demarrage({ hasSite, siteOnline }: { hasSite: boolean; siteOnline: boolean }) {
  const products = useProductList('all', undefined);
  const orders = useOrderPreview('all', 1);
  if (products.isPending || orders.isPending) return null;

  const steps = [
    {
      done: (products.data?.pages[0]?.items.length ?? 0) > 0,
      title: 'Ajouter un premier produit',
      detail: 'Un titre, un prix, une quantité.',
      to: '/products/new' as const,
      icon: PackagePlus,
    },
    {
      done: hasSite && siteOnline,
      title: 'Mettre le site en ligne',
      detail: 'Il se remplit tout seul avec vos produits en vente.',
      to: '/site' as const,
      icon: Store,
    },
    {
      done: (orders.data?.items.length ?? 0) > 0,
      title: 'Recevoir une première commande',
      detail: 'Partagez l’adresse de votre site à vos clients.',
      to: '/orders' as const,
      icon: ReceiptText,
    },
  ];
  if (steps.every((s) => s.done)) return null;

  return (
    <section className="planche overflow-hidden">
      <PlancheHeader title="Démarrage" />
      <ol className="flex flex-col px-3 pb-3">
        {steps.map((step) => (
          <li key={step.title}>
            <Link
              to={step.to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2 py-2.5 no-underline transition-colors duration-150 hover:bg-baobab-50',
                step.done ? 'text-encre-2' : 'text-encre',
              )}
            >
              <span
                className={cn(
                  'relative inline-flex size-8 shrink-0 items-center justify-center rounded-full',
                  step.done ? 'bg-baobab text-white' : 'bg-chaux-2 text-baobab',
                )}
                aria-hidden
              >
                {step.done ? <Check className="size-4" strokeWidth={3} /> : <step.icon className="size-4" strokeWidth={2.2} />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className={cn('font-[640]', step.done && 'line-through decoration-baobab/50')}>{step.title}</span>
                {!step.done && <span className="text-[0.8125rem] text-encre-2">{step.detail}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="sr-only">
        {steps.filter((s) => s.done).length} étape(s) sur {steps.length} terminée(s)
      </p>
    </section>
  );
}
