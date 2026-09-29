import type { SpecialRequestDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Inbox } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { z } from 'zod';
import { useRequestList, useRequestSummary } from '@/features/requests/api';
import {
  REQUEST_FILTERS,
  REQUEST_STATUS,
  REQUEST_TYPE,
} from '@/features/requests/status';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { errorMessage } from '@/shared/api/client';
import { formatRelative, plural } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import {
  EmptyState,
  LoadError,
  PageHeader,
  Skeleton,
} from '@/shared/ui/feedback';
import { EASE_OUT, riseIn } from '@/shared/ui/motion';
import { Tabs } from '@/shared/ui/tabs';

const searchSchema = z.object({
  filter: z
    .enum(['all', 'NEW', 'QUOTED', 'CONVERTED', 'DECLINED'])
    .catch('NEW')
    .default('NEW'),
});

export const Route = createFileRoute('/_app/requests/')({
  validateSearch: searchSchema,
  component: Demandes,
});

/** Ce que le client veut, en une ligne : l'article et sa configuration. */
function wanted(request: SpecialRequestDto): string {
  const configuration = request.options.map((o) => o.value).join(' / ');
  return configuration
    ? `${request.productTitle} · ${configuration}`
    : request.productTitle;
}

function Demandes() {
  const { filter } = Route.useSearch();
  const navigate = Route.useNavigate();
  const list = useRequestList(filter);
  const summary = useRequestSummary();
  const store = useCurrentStore();
  const newCount = summary.data?.newCount ?? 0;
  const requests = list.data?.pages.flatMap((page) => page.items) ?? [];
  const services =
    store.data?.type === 'ELECTRONICS'
      ? 'configurations absentes du stock et reprises d’anciens appareils'
      : 'configurations absentes du stock et pièces sur mesure';

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Demandes"
        subtitle={`Ce que vos clients demandent depuis le site : ${services}. Faites une offre, puis transformez-la en commande.`}
      />

      <motion.div variants={riseIn}>
        <Tabs
          label="Filtrer les demandes"
          items={REQUEST_FILTERS.map((item) =>
            item.value === 'NEW'
              ? {
                  ...item,
                  attention: newCount > 0,
                  count: newCount || undefined,
                }
              : item,
          )}
          value={filter}
          onChange={(value) =>
            void navigate({ search: { filter: value }, replace: true })
          }
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
            <LoadError
              message={errorMessage(list.error)}
              onRetry={() => void list.refetch()}
            />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={filter === 'NEW' ? 'Rien à traiter' : 'Aucune demande ici'}
          >
            {filter === 'NEW'
              ? 'Quand un client demande un article absent du stock, une reprise ou une pièce sur mesure, sa demande arrive ici et vous recevez un e-mail.'
              : 'Aucune demande ne correspond à ce filtre pour l’instant.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {requests.map((request, index) => (
                <motion.li
                  key={request.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.3,
                      ease: EASE_OUT,
                      delay: Math.min(index, 12) * 0.025,
                    },
                  }}
                  className="relative transition-colors duration-200 hover:bg-surface-2"
                >
                  <Link
                    to="/requests/$requestId"
                    params={{ requestId: request.id }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-3.5 text-ink no-underline sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-[650]">
                        {[request.firstName, request.lastName]
                          .filter(Boolean)
                          .join(' ')}
                      </span>
                      <span className="truncate text-[0.875rem] text-ink-2">
                        {request.quantity > 1 ? `${request.quantity} × ` : ''}
                        {wanted(request)}
                      </span>
                    </span>
                    <span className="hidden flex-col gap-1 sm:flex">
                      <span className="text-[0.875rem] font-[560]">
                        {REQUEST_TYPE[request.type].label}
                      </span>
                      <span className="tabular text-[0.8125rem] text-ink-2">
                        {formatRelative(request.createdAt)}
                        {request.details.length > 0 &&
                          ` · ${plural(request.details.length, 'précision', 'précisions')}`}
                      </span>
                    </span>
                    <Badge tone={REQUEST_STATUS[request.status].tone}>
                      {REQUEST_STATUS[request.status].label}
                    </Badge>
                  </Link>
                </motion.li>
              ))}
            </AnimatePresence>
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
          Voir les demandes plus anciennes
        </Button>
      )}
    </div>
  );
}
