import type { OrderListItemDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { ReceiptText, SearchX } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { z } from 'zod';
import { useOverview } from '@/features/home/api';
import { useOrderList } from '@/features/orders/api';
import { OrderQuickActions } from '@/features/orders/quick-actions';
import { ORDER_FILTERS, ORDER_STATUS, type OrderFilter, PAYMENT_STATUS } from '@/features/orders/status';
import { errorMessage } from '@/shared/api/client';
import { formatDate, formatMoney, formatRelative, orderNumber, plural } from '@/shared/lib/format';
import { useMedia } from '@/shared/lib/use-media';
import { Badge } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { EASE_OUT, glide, riseIn } from '@/shared/ui/motion';
import { SearchInput } from '@/shared/ui/search';
import { Tabs } from '@/shared/ui/tabs';

const searchSchema = z.object({
  filter: z.enum(['all', 'to-ship', 'unpaid', 'fulfilled', 'cancelled', 'draft']).catch('all').default('all'),
  q: z.string().trim().max(100).optional().catch(undefined),
});

export const Route = createFileRoute('/_app/orders/')({
  validateSearch: searchSchema,
  component: Commandes,
});

function Commandes() {
  const { filter, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const list = useOrderList(filter, q || undefined);
  const overview = useOverview('30d');
  const desktop = useMedia('(min-width: 768px)');
  const orders = list.data?.pages.flatMap((page) => page.items) ?? [];
  // La touche orange de l'écran : « Expédier » sur la première commande à faire partir.
  const lit = orders.findIndex((order) => order.status === 'PLACED');
  const toShip = overview.data?.ordersToFulfill ?? 0;

  const setSearch = (next: { filter?: OrderFilter; q?: string }) =>
    void navigate({
      search: (prev) => ({
        ...prev,
        ...next,
        q: (next.q ?? prev.q) || undefined,
      }),
      replace: true,
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Commandes"
        subtitle="Encaissez, expédiez, suivez. Le stock réservé se libère si vous annulez."
        actions={
          <Link to="/orders/new" className={buttonClasses('secondary')}>
            <Plus strokeWidth={1.8} /> Nouvelle commande
          </Link>
        }
      />

      <motion.div variants={riseIn} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          label="Filtrer les commandes"
          items={ORDER_FILTERS.map((item) =>
            item.value === 'to-ship' ? { ...item, attention: toShip > 0, count: toShip || undefined } : item,
          )}
          value={filter}
          onChange={(value) => setSearch({ filter: value })}
        />
        <SearchInput
          label="Rechercher une commande"
          placeholder="N°, client ou e-mail"
          value={q ?? ''}
          onChange={(value) => setSearch({ q: value })}
          className="md:w-72"
        />
      </motion.div>

      <Card className="overflow-hidden">
        {list.isPending ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : list.error ? (
          <div className="p-5">
            <LoadError message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
          </div>
        ) : orders.length === 0 ? (
          q ? (
            <EmptyState icon={SearchX} title={`Aucune commande pour « ${q} »`}>
              Cherchez un numéro sans le dièse (1001), un nom ou une adresse e-mail.
            </EmptyState>
          ) : (
            <EmptyState icon={ReceiptText} title="Aucune commande ici">
              {filter === 'all'
                ? 'Les commandes passées sur votre site apparaissent ici avec leur numéro, du plus récent au plus ancien.'
                : 'Aucune commande ne correspond à ce filtre pour l’instant.'}
            </EmptyState>
          )
        ) : (
          <LayoutGroup>{desktop ? <OrderTable orders={orders} lit={lit} /> : <OrderCards orders={orders} lit={lit} />}</LayoutGroup>
        )}
      </Card>

      {list.hasNextPage && (
        <Button
          variant="secondary"
          className="self-center"
          loading={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          Voir les commandes plus anciennes
        </Button>
      )}
    </div>
  );
}

function States({ order }: { order: OrderListItemDto }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      <Badge tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</Badge>
      {order.status !== 'DRAFT' && order.status !== 'CANCELLED' && (
        <Badge tone={PAYMENT_STATUS[order.paymentStatus].tone}>{PAYMENT_STATUS[order.paymentStatus].label}</Badge>
      )}
    </span>
  );
}

function OrderTable({ orders, lit }: { orders: OrderListItemDto[]; lit: number }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="legend">
          <th className="px-5 pt-4 pb-3 font-[600]">Commande</th>
          <th className="px-3 pt-4 pb-3 font-[600]">Client</th>
          <th className="px-3 pt-4 pb-3 font-[600]">Date</th>
          <th className="px-3 pt-4 pb-3 text-right font-[600]">Total</th>
          <th className="px-3 pt-4 pb-3 font-[600]">État</th>
          <th className="px-5 pt-4 pb-3">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="tabular">
        <AnimatePresence initial={false}>
          {orders.map((order, index) => (
            <motion.tr
              key={order.id}
              layout="position"
              initial={{ opacity: 0, y: 6 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.32, ease: EASE_OUT, delay: Math.min(index, 12) * 0.025 },
              }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="relative border-t border-line transition-colors duration-200 hover:bg-surface-2"
            >
              <td className="px-5 py-3">
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: order.id }}
                  className="text-[0.9375rem] font-[650] text-ink no-underline after:absolute after:inset-0 after:content-['']"
                >
                  {orderNumber(order.number)}
                </Link>
              </td>
              <td className="max-w-[16rem] px-3 py-3">
                <span className="block truncate font-[560]">{order.customerName ?? '—'}</span>
                <span className="block truncate text-[0.8125rem] text-ink-2">{order.email}</span>
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-ink-2">
                <span title={order.placedAt ?? order.createdAt}>{formatRelative(order.placedAt ?? order.createdAt)}</span>
              </td>
              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span className="font-[600]">{formatMoney(order.totalAmount, order.currency)}</span>
                <span className="block text-[0.8125rem] text-ink-2">{plural(order.itemsCount, 'article', 'articles')}</span>
              </td>
              <td className="px-3 py-3">
                <States order={order} />
              </td>
              <td className="relative z-10 px-5 py-3">
                <div className="flex justify-end">
                  <OrderQuickActions order={order} lit={index === lit} />
                </div>
              </td>
            </motion.tr>
          ))}
        </AnimatePresence>
      </tbody>
    </table>
  );
}

function OrderCards({ orders, lit }: { orders: OrderListItemDto[]; lit: number }) {
  return (
    <ul className="divide-y divide-line">
      {orders.map((order, index) => (
        <motion.li
          key={order.id}
          layout="position"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...glide, delay: Math.min(index, 10) * 0.03 }}
          className="relative flex flex-col gap-2.5 px-4 py-4 active:bg-surface-2"
        >
          <div className="flex items-start justify-between gap-3">
            <Link
              to="/orders/$orderId"
              params={{ orderId: order.id }}
              className="tabular text-[1.0625rem] font-[650] text-ink no-underline after:absolute after:inset-0 after:content-['']"
            >
              {orderNumber(order.number)}
            </Link>
            <span className="tabular text-[1rem] font-[600]">{formatMoney(order.totalAmount, order.currency)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[0.875rem] text-ink-2">
            <span className="truncate">{order.customerName ?? order.email ?? 'Client'}</span>
            <span className="shrink-0">{formatDate(order.placedAt ?? order.createdAt)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <States order={order} />
            <div className="relative z-10">
              <OrderQuickActions order={order} compact lit={index === lit} />
            </div>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
