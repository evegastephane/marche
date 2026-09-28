import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronRight, SearchX, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { z } from 'zod';
import { customerName, useCustomerList } from '@/features/customers/api';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { errorMessage } from '@/shared/api/client';
import { formatMoney, formatRelative, plural } from '@/shared/lib/format';
import { useMedia } from '@/shared/lib/use-media';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { glide, riseIn } from '@/shared/ui/motion';
import { SearchInput } from '@/shared/ui/search';

const searchSchema = z.object({ q: z.string().trim().max(100).optional().catch(undefined) });

export const Route = createFileRoute('/_app/customers/')({
  validateSearch: searchSchema,
  component: Clients,
});

function Clients() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const store = useCurrentStore();
  const currency = store.data?.currency ?? 'XOF';
  const list = useCustomerList(q || undefined);
  const desktop = useMedia('(min-width: 768px)');
  const customers = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clients"
        subtitle="Chaque commande crée ou complète la fiche de son client, retrouvé par son e-mail."
      />

      <motion.div variants={riseIn} className="flex justify-end">
        <SearchInput
          label="Rechercher un client"
          placeholder="Nom, e-mail ou téléphone"
          value={q ?? ''}
          onChange={(value) => void navigate({ search: { q: value || undefined }, replace: true })}
          className="w-full md:w-80"
        />
      </motion.div>

      <Card className="overflow-hidden">
        {list.isPending ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : list.error ? (
          <div className="p-5">
            <LoadError message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
          </div>
        ) : customers.length === 0 ? (
          q ? (
            <EmptyState icon={SearchX} title={`Aucun client pour « ${q} »`}>
              Cherchez un nom, une adresse e-mail ou un numéro.
            </EmptyState>
          ) : (
            <EmptyState icon={Users} title="Pas encore de client">
              Vos clients apparaissent ici dès leur première commande, sur votre site ou saisie dans Upsell.
            </EmptyState>
          )
        ) : desktop ? (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="legend">
                <th className="px-5 pt-4 pb-3 font-[600]">Client</th>
                <th className="px-3 pt-4 pb-3 font-[600]">Téléphone</th>
                <th className="px-3 pt-4 pb-3 text-right font-[600]">Commandes</th>
                <th className="px-3 pt-4 pb-3 text-right font-[600]">Total dépensé</th>
                <th className="px-5 pt-4 pb-3 text-right font-[600]">Dernière commande</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {customers.map((customer, index) => (
                <motion.tr
                  key={customer.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...glide, delay: Math.min(index, 12) * 0.025 }}
                  className="relative border-t border-line transition-colors duration-200 hover:bg-surface-2"
                >
                  <td className="max-w-[22rem] px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={customerName(customer)} />
                      <div className="min-w-0">
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId: customer.id }}
                          className="block truncate font-[600] text-ink no-underline after:absolute after:inset-0 after:content-['']"
                        >
                          {customerName(customer)}
                        </Link>
                        <span className="block truncate text-[0.8125rem] text-ink-2">{customer.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-ink-2">{customer.phone ?? '—'}</td>
                  <td className="px-3 py-3 text-right">{customer.ordersCount}</td>
                  <td className="px-3 py-3 text-right font-[600] whitespace-nowrap">
                    {formatMoney(customer.totalSpentAmount, currency)}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap text-ink-2">
                    {customer.lastOrderAt ? formatRelative(customer.lastOrderAt) : '—'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ul className="divide-y divide-line">
            {customers.map((customer, index) => (
              <motion.li
                key={customer.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...glide, delay: Math.min(index, 10) * 0.03 }}
              >
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: customer.id }}
                  className="flex items-center gap-3 px-4 py-3.5 text-ink no-underline active:bg-surface-2"
                >
                  <Avatar name={customerName(customer)} className="size-10" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-[600]">{customerName(customer)}</span>
                    <span className="tabular text-[0.8125rem] text-ink-2">
                      {plural(customer.ordersCount, 'commande', 'commandes')} ·{' '}
                      {formatMoney(customer.totalSpentAmount, currency)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-ink-3" strokeWidth={1.8} aria-hidden />
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>

      {list.hasNextPage && (
        <Button
          variant="secondary"
          className="self-center"
          loading={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          Voir plus de clients
        </Button>
      )}
    </div>
  );
}
