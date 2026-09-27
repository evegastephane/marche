import type { Currency, ReportingPeriod } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Check, PackagePlus, ReceiptText, Store, Truck, Warehouse } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useLowStock, useOverview } from '@/features/home/api';
import { StoreOverview } from '@/features/home/store-overview';
import { useOrderPreview } from '@/features/orders/api';
import { OrderQuickActions } from '@/features/orders/quick-actions';
import { PAYMENT_STATUS } from '@/features/orders/status';
import { useProductList } from '@/features/products/api';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { useSite } from '@/features/site/api';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { formatMoney, formatRelative, orderNumber, plural } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Card, CardHeader } from '@/shared/ui/card';
import { EmptyState, LoadError, Skeleton } from '@/shared/ui/feedback';
import { EASE_OUT, riseIn, snappy } from '@/shared/ui/motion';

export const Route = createFileRoute('/_app/')({ component: Accueil });

/** Une ligne qui quitte une liste (commande expédiée) glisse vers la droite et la liste se resserre. */
const rowExit = {
  opacity: 0,
  x: 48,
  transition: { duration: 0.28, ease: EASE_OUT },
};

function Accueil() {
  const [period, setPeriod] = useState<ReportingPeriod>('30d');
  const store = useCurrentStore();
  const site = useSite();
  const overview = useOverview(period);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <StoreOverview
        store={store.data}
        site={site.data}
        overview={overview.data}
        period={period}
        onPeriodChange={setPeriod}
      />
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
            className="group inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-ink no-underline"
          >
            Toutes les commandes
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
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
        <ul className="border-t border-line">
          <AnimatePresence initial={false}>
            {items.map((order, index) => (
              <motion.li
                key={order.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { ...snappy, delay: index * 0.04 },
                }}
                exit={rowExit}
                className="border-b border-line last:border-b-0"
              >
                <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-colors duration-200 hover:bg-surface-2 max-sm:grid-cols-[auto_1fr]">
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="tabular inline-flex h-10 min-w-14 items-center justify-center rounded-xl bg-brand-soft px-2.5 text-[0.9375rem] font-[750] text-brand-ink no-underline after:absolute after:inset-0 after:content-['']"
                  >
                    {orderNumber(order.number)}
                  </Link>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-[650]">{order.customerName ?? order.email ?? 'Client'}</span>
                    <span className="tabular flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-ink-2">
                      <span>{plural(order.itemsCount, 'article', 'articles')}</span>
                      <span aria-hidden>·</span>
                      <span className="font-semibold text-ink">
                        {formatMoney(order.totalAmount, currency ?? order.currency)}
                      </span>
                      {order.placedAt && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{formatRelative(order.placedAt)}</span>
                        </>
                      )}
                      {order.paymentStatus === 'UNPAID' && (
                        <Badge tone={PAYMENT_STATUS.UNPAID.tone} className="ml-1">
                          {PAYMENT_STATUS.UNPAID.label}
                        </Badge>
                      )}
                    </span>
                  </div>
                  <div className="relative z-10 max-sm:col-span-2 max-sm:justify-self-end">
                    <OrderQuickActions order={order} />
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
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
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...snappy, delay: 0.1 + index * 0.04 }}
              className="border-b border-line last:border-b-0"
            >
              <Link
                to="/products/$productId"
                params={{ productId: item.productId }}
                className="flex items-center justify-between gap-4 px-5 py-3 text-ink no-underline transition-colors duration-200 hover:bg-surface-2"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-[650]">{item.productTitle}</span>
                  <span className="truncate text-[0.8125rem] text-ink-2">
                    {item.variantTitle} · {item.sku}
                  </span>
                </span>
                {item.isOut ? (
                  <Badge tone="danger">Rupture</Badge>
                ) : (
                  <Badge tone="accent">Plus que {item.available}</Badge>
                )}
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </Card>
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
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: EASE_OUT }}
      className="card overflow-hidden"
    >
      <CardHeader
        title="Démarrage"
        actions={
          <span className="tabular text-[0.8125rem] font-semibold text-ink-2">
            {doneCount}/{steps.length}
          </span>
        }
      />
      <div className="mx-5 mb-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <motion.div
          className="h-full rounded-full bg-linear-to-r from-brand to-[#ff5a2b]"
          initial={{ width: 0 }}
          animate={{ width: `${(doneCount / steps.length) * 100}%` }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.2 }}
        />
      </div>
      <ol className="flex flex-col px-3 pb-3">
        {steps.map((step, index) => (
          <motion.li
            key={step.title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...snappy, delay: 0.15 + index * 0.06 }}
          >
            <Link
              to={step.to}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-2 py-2.5 no-underline transition-colors duration-200 hover:bg-surface-2',
                step.done ? 'text-ink-2' : 'text-ink',
              )}
            >
              <span
                className={cn(
                  'relative inline-flex size-8 shrink-0 items-center justify-center rounded-full',
                  step.done ? 'bg-success text-white' : 'bg-brand-soft text-brand-ink',
                )}
                aria-hidden
              >
                {step.done ? (
                  <motion.span
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 18,
                      delay: 0.3 + index * 0.06,
                    }}
                    className="inline-flex"
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </motion.span>
                ) : (
                  <step.icon className="size-4" strokeWidth={2.2} />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn('font-[650]', step.done && 'line-through decoration-ink-3/50')}>{step.title}</span>
                {!step.done && <span className="text-[0.8125rem] text-ink-2">{step.detail}</span>}
              </span>
              {!step.done && (
                <ArrowRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              )}
            </Link>
          </motion.li>
        ))}
      </ol>
      <p className="sr-only">
        {doneCount} étape(s) sur {steps.length} terminée(s)
      </p>
    </motion.section>
  );
}
