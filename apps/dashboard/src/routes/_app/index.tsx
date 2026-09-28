import type { Currency, ReportingPeriod } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Truck, Warehouse } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useState } from 'react';
import { useLowStock, useOverview } from '@/features/home/api';
import { Afficheur, StoreHeader } from '@/features/home/store-overview';
import { useOrderPreview } from '@/features/orders/api';
import { OrderQuickActions } from '@/features/orders/quick-actions';
import { PAYMENT_STATUS } from '@/features/orders/status';
import { useProductList } from '@/features/products/api';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { useSite } from '@/features/site/api';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { formatMoney, formatRelative, orderNumber, plural } from '@/shared/lib/format';
import { Badge, Led } from '@/shared/ui/badge';
import { Card, CardHeader } from '@/shared/ui/card';
import { EmptyState, LoadError, Skeleton } from '@/shared/ui/feedback';
import { EASE_OUT, glide, riseIn } from '@/shared/ui/motion';

export const Route = createFileRoute('/_app/')({ component: Accueil });

/** Une commande qui part glisse vers la droite, et la file se resserre. */
const rowExit = {
  opacity: 0,
  x: 40,
  transition: { duration: 0.24, ease: EASE_OUT },
};

function Accueil() {
  const [period, setPeriod] = useState<ReportingPeriod>('30d');
  const store = useCurrentStore();
  const site = useSite();
  const overview = useOverview(period);
  // Une seule touche orange : la prochaine commande à expédier, sinon la mise en ligne du site.
  const nothingToShip = overview.data !== undefined && overview.data.ordersToFulfill === 0;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <StoreHeader store={store.data} site={site.data} lightSite={nothingToShip} />
      <Afficheur overview={overview.data} period={period} onPeriodChange={setPeriod} />
      {overview.error && <LoadError message={errorMessage(overview.error)} onRetry={() => void overview.refetch()} />}
      <motion.div
        variants={riseIn}
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8"
      >
        <AExpedier currency={store.data?.currency} total={overview.data?.ordersToFulfill} />
        <div className="flex flex-col gap-6 lg:gap-8">
          <Demarrage hasSite={Boolean(site.data)} siteOnline={site.data?.status === 'PUBLISHED'} />
          <StockBas />
        </div>
      </motion.div>
    </div>
  );
}

/** La file des commandes à faire partir, la plus ancienne en tête, sa touche allumée. */
function AExpedier({ currency, total }: { currency: Currency | undefined; total: number | undefined }) {
  const orders = useOrderPreview('to-ship', 8);
  const items = orders.data?.items ?? [];

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="À expédier"
        count={total}
        actions={
          <Link
            to="/orders"
            search={{ filter: 'to-ship' }}
            className="group inline-flex items-center gap-1 text-[0.8125rem] font-[560] text-ink-2 no-underline hover:text-ink"
          >
            Toutes les commandes
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
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
          Les commandes passées sur votre site ou saisies ici arrivent dans cette file, jusqu’à leur départ.
        </EmptyState>
      ) : (
        <LayoutGroup>
          <ul className="border-t border-line">
            <AnimatePresence initial={false}>
              {items.map((order, index) => (
                <motion.li
                  key={order.id}
                  layout="position"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { ...glide, delay: index * 0.035 } }}
                  exit={rowExit}
                  className="border-b border-line last:border-b-0"
                >
                  <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors duration-200 hover:bg-surface-2 max-sm:grid-cols-[auto_1fr]">
                    <Link
                      to="/orders/$orderId"
                      params={{ orderId: order.id }}
                      className="well tabular inline-flex h-10 min-w-16 items-center justify-center rounded-[0.7rem] px-2.5 text-[0.9375rem] font-[600] text-ink no-underline after:absolute after:inset-0 after:content-['']"
                    >
                      {orderNumber(order.number)}
                    </Link>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-[600]">{order.customerName ?? order.email ?? 'Client'}</span>
                      <span className="tabular flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-ink-2">
                        <span>{plural(order.itemsCount, 'article', 'articles')}</span>
                        <span aria-hidden>·</span>
                        <span className="font-[600] text-ink">
                          {formatMoney(order.totalAmount, currency ?? order.currency)}
                        </span>
                        {order.placedAt && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{formatRelative(order.placedAt)}</span>
                          </>
                        )}
                        {order.paymentStatus === 'UNPAID' && (
                          <Badge tone={PAYMENT_STATUS.UNPAID.tone} className="ml-1 h-5 text-[0.8125rem]">
                            {PAYMENT_STATUS.UNPAID.label}
                          </Badge>
                        )}
                      </span>
                    </div>
                    <div className="relative z-10 max-sm:col-span-2 max-sm:justify-self-end">
                      <OrderQuickActions order={order} lit={index === 0} />
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </LayoutGroup>
      )}
    </Card>
  );
}

function StockBas() {
  const low = useLowStock(6);
  const items = low.data?.items ?? [];
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Stock bas" count={low.data ? items.length : undefined} />
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
        <ul className="border-t border-line">
          {items.map((item, index) => (
            <motion.li
              key={item.variantId}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...glide, delay: 0.08 + index * 0.035 }}
              className="border-b border-line last:border-b-0"
            >
              <Link
                to="/products/$productId"
                params={{ productId: item.productId }}
                className="flex items-center justify-between gap-4 px-5 py-3 text-ink no-underline transition-colors duration-200 hover:bg-surface-2"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-[600]">{item.productTitle}</span>
                  <span className="truncate text-[0.8125rem] text-ink-2">
                    {item.variantTitle} · {item.sku}
                  </span>
                </span>
                {item.isOut ? (
                  <Badge tone="danger">Rupture</Badge>
                ) : (
                  <Badge tone="attention">Plus que {item.available}</Badge>
                )}
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * Les trois étapes qui mènent à une boutique qui vend, en témoins : allumé = fait.
 * Une jauge à trois cases se remplit ; le bloc disparaît une fois tout fait.
 */
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
    },
    {
      done: hasSite && siteOnline,
      title: 'Mettre le site en ligne',
      detail: 'Il se remplit tout seul avec vos produits en vente.',
      to: '/site' as const,
    },
    {
      done: (orders.data?.items.length ?? 0) > 0,
      title: 'Recevoir une première commande',
      detail: 'Partagez l’adresse de votre site à vos clients.',
      to: '/orders' as const,
    },
  ];
  if (steps.every((s) => s.done)) return null;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE_OUT }}
      className="panel overflow-hidden"
    >
      <CardHeader
        title="Démarrage"
        actions={
          <span className="flex items-center gap-1" aria-hidden>
            {steps.map((step, index) => (
              <span key={step.title} className="well h-2 w-5 overflow-hidden rounded-[3px]">
                {step.done && (
                  <motion.span
                    className="block h-full w-full origin-left bg-ink"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.2 + index * 0.1 }}
                  />
                )}
              </span>
            ))}
          </span>
        }
      />
      <ol className="flex flex-col px-2 pb-2">
        {steps.map((step) => (
          <li key={step.title}>
            <Link
              to={step.to}
              className={cn(
                'group flex items-center gap-3 rounded-[0.7rem] px-3 py-2.5 no-underline transition-colors duration-200 hover:bg-surface-2',
                step.done ? 'text-ink-2' : 'text-ink',
              )}
            >
              <Led tone={step.done ? 'on' : 'off'} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn('font-[600]', step.done && 'font-[500] line-through decoration-ink-3/60')}>
                  {step.title}
                </span>
                {!step.done && <span className="text-[0.8125rem] text-ink-2">{step.detail}</span>}
              </span>
              {!step.done && (
                <ArrowRight
                  className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                  strokeWidth={1.8}
                />
              )}
            </Link>
          </li>
        ))}
      </ol>
      <p className="sr-only">
        {doneCount} étape(s) sur {steps.length} terminée(s)
      </p>
    </motion.section>
  );
}
