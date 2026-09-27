import { createFileRoute, Link } from '@tanstack/react-router';
import { ReceiptText, SearchX } from 'lucide-react';
import { z } from 'zod';
import { useOrderList } from '@/features/orders/api';
import { OrderQuickActions } from '@/features/orders/quick-actions';
import { ORDER_FILTERS, ORDER_STATUS, type OrderFilter, PAYMENT_STATUS } from '@/features/orders/status';
import { errorMessage } from '@/shared/api/client';
import { formatDate, formatMoney, formatRelative, orderNumber, plural } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { Onglets } from '@/shared/ui/onglets';
import { Plaque } from '@/shared/ui/plaque';
import { SearchInput } from '@/shared/ui/search';

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
  const orders = list.data?.pages.flatMap((page) => page.items) ?? [];

  const setSearch = (next: { filter?: OrderFilter; q?: string }) =>
    void navigate({ search: (prev) => ({ ...prev, ...next, q: (next.q ?? prev.q) || undefined }), replace: true });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Commandes" subtitle="Encaissez, expédiez, suivez. Le stock réservé se libère si vous annulez." />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Onglets
          label="Filtrer les commandes"
          items={ORDER_FILTERS}
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
      </div>

      <section className="planche overflow-hidden">
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
          <>
            <table className="w-full border-collapse text-left max-md:hidden">
              <thead>
                <tr className="text-[0.75rem] font-bold tracking-[0.05em] text-encre-2 uppercase">
                  <th className="px-5 pt-4 pb-3 font-bold">Commande</th>
                  <th className="px-3 pt-4 pb-3 font-bold">Client</th>
                  <th className="px-3 pt-4 pb-3 font-bold">Date</th>
                  <th className="px-3 pt-4 pb-3 text-right font-bold">Total</th>
                  <th className="px-3 pt-4 pb-3 font-bold">État</th>
                  <th className="px-5 pt-4 pb-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="chiffres">
                {orders.map((order) => (
                  <tr key={order.id} className="relative border-t border-filet transition-colors duration-150 hover:bg-baobab-50">
                    <td className="px-5 py-3">
                      <Link
                        to="/orders/$orderId"
                        params={{ orderId: order.id }}
                        className="lettrage text-[1.5rem] text-baobab no-underline after:absolute after:inset-0 after:content-['']"
                      >
                        {orderNumber(order.number)}
                      </Link>
                    </td>
                    <td className="max-w-[16rem] px-3 py-3">
                      <span className="block truncate font-[620]">{order.customerName ?? '—'}</span>
                      <span className="block truncate text-[0.8125rem] text-encre-2">{order.email}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-encre-2">
                      <span title={order.placedAt ?? order.createdAt}>
                        {formatRelative(order.placedAt ?? order.createdAt)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className="font-[680]">{formatMoney(order.totalAmount, order.currency)}</span>
                      <span className="block text-[0.8125rem] text-encre-2">{plural(order.itemsCount, 'article', 'articles')}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        <Plaque tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</Plaque>
                        {order.status !== 'DRAFT' && order.status !== 'CANCELLED' && (
                          <Plaque tone={PAYMENT_STATUS[order.paymentStatus].tone}>
                            {PAYMENT_STATUS[order.paymentStatus].label}
                          </Plaque>
                        )}
                      </span>
                    </td>
                    <td className="relative z-10 px-5 py-3">
                      <div className="flex justify-end">
                        <OrderQuickActions order={order} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-filet md:hidden">
              {orders.map((order) => (
                <li key={order.id} className="relative flex flex-col gap-2.5 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to="/orders/$orderId"
                      params={{ orderId: order.id }}
                      className="lettrage chiffres text-[1.6rem] text-baobab no-underline after:absolute after:inset-0 after:content-['']"
                    >
                      {orderNumber(order.number)}
                    </Link>
                    <span className="chiffres text-[1rem] font-[700]">{formatMoney(order.totalAmount, order.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[0.875rem] text-encre-2">
                    <span className="truncate">{order.customerName ?? order.email ?? 'Client'}</span>
                    <span className="shrink-0">{formatDate(order.placedAt ?? order.createdAt)}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap gap-1.5">
                      <Plaque tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</Plaque>
                      {order.status !== 'DRAFT' && order.status !== 'CANCELLED' && (
                        <Plaque tone={PAYMENT_STATUS[order.paymentStatus].tone}>
                          {PAYMENT_STATUS[order.paymentStatus].label}
                        </Plaque>
                      )}
                    </span>
                    <div className="relative z-10">
                      <OrderQuickActions order={order} compact />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {list.hasNextPage && (
        <Button variant="secondaire" className="self-center" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
          Voir les commandes plus anciennes
        </Button>
      )}
    </div>
  );
}
