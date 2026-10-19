import type { Currency, PosSessionDto, PosSessionStatus } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronRight, Settings2, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { z } from 'zod';
import { useIsStoreAdmin, usePosSessions, usePosSettings } from '@/features/pos/api';
import { PosSettingsDialog } from '@/features/pos/settings-dialog';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { errorMessage } from '@/shared/api/client';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { useMedia } from '@/shared/lib/use-media';
import { Badge, Led } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { glide, riseIn } from '@/shared/ui/motion';
import { Tabs } from '@/shared/ui/tabs';

const searchSchema = z.object({ status: z.enum(['OPEN', 'CLOSED']).optional().catch(undefined) });

export const Route = createFileRoute('/_app/pos/sessions/')({
  validateSearch: searchSchema,
  component: HistoriqueDesCaisses,
});

/** Écart d'une caisse : témoin plein si juste, rouge sinon ; « en cours » tant qu'elle est ouverte. */
function Difference({ session, currency }: { session: PosSessionDto; currency: Currency }) {
  if (session.status === 'OPEN' || session.difference === null) {
    return (
      <span className="inline-flex items-center gap-2 text-ink-2">
        <Led tone="off" /> en cours
      </span>
    );
  }
  const exact = session.difference === 0;
  return (
    <span className={exact ? 'inline-flex items-center gap-2 text-ink-2' : 'inline-flex items-center gap-2 text-danger-ink'}>
      <Led tone={exact ? 'on' : 'danger'} />
      {exact ? 'juste' : `${session.difference > 0 ? '+' : '−'}${formatMoney(Math.abs(session.difference), currency)}`}
    </span>
  );
}

function HistoriqueDesCaisses() {
  const { status } = Route.useSearch();
  const navigate = Route.useNavigate();
  const store = useCurrentStore();
  const currency = store.data?.currency ?? 'XOF';
  const isAdmin = useIsStoreAdmin();
  const settings = usePosSettings();
  const list = usePosSessions(status);
  const desktop = useMedia('(min-width: 768px)');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sessions = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Historique des caisses"
        subtitle={isAdmin ? 'Chaque ouverture de caisse, ses ventes et son écart à la fermeture, pour tous les vendeurs.' : 'Vos ouvertures de caisse, leurs ventes et leur écart à la fermeture.'}
        actions={
          <>
            {isAdmin && settings.data && (
              <Button variant="secondary" icon={<Settings2 strokeWidth={1.8} />} onClick={() => setSettingsOpen(true)}>
                Réglages
              </Button>
            )}
            <Link to="/pos" className={buttonClasses('secondary')}>
              <Wallet strokeWidth={1.8} /> Caisse
            </Link>
          </>
        }
      />

      <motion.div variants={riseIn}>
        <Tabs<'ALL' | PosSessionStatus>
          label="Filtrer les caisses"
          value={status ?? 'ALL'}
          onChange={(value) => void navigate({ search: { status: value === 'ALL' ? undefined : value }, replace: true })}
          items={[
            { value: 'ALL', label: 'Toutes' },
            { value: 'OPEN', label: 'Ouvertes' },
            { value: 'CLOSED', label: 'Fermées' },
          ]}
        />
      </motion.div>

      <Card className="overflow-hidden">
        {list.isPending ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : list.error ? (
          <div className="p-5">
            <LoadError message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Aucune caisse"
            action={
              <Link to="/pos" className="font-[600] text-ink underline underline-offset-4">
                Ouvrir la caisse
              </Link>
            }
          >
            Chaque ouverture de caisse apparaît ici, avec ses ventes et le comptage de fin de journée.
          </EmptyState>
        ) : desktop ? (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="legend">
                <th className="px-5 pt-4 pb-3 font-[600]">Ouverture</th>
                <th className="px-3 pt-4 pb-3 font-[600]">Vendeur</th>
                <th className="px-3 pt-4 pb-3 text-right font-[600]">Tickets</th>
                <th className="px-3 pt-4 pb-3 text-right font-[600]">Ventes nettes</th>
                <th className="px-3 pt-4 pb-3 font-[600]">Écart</th>
                <th className="px-5 pt-4 pb-3 font-[600]">État</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {sessions.map((session, index) => (
                <motion.tr
                  key={session.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...glide, delay: Math.min(index, 12) * 0.025 }}
                  className="relative border-t border-line transition-colors duration-200 hover:bg-surface-2"
                >
                  <td className="px-5 py-3">
                    <Link
                      to="/pos/sessions/$sessionId"
                      params={{ sessionId: session.id }}
                      className="block font-[600] text-ink no-underline after:absolute after:inset-0 after:content-['']"
                    >
                      {formatDateTime(session.openedAt)}
                    </Link>
                    <span className="block text-[0.8125rem] text-ink-2">{session.label ?? 'Caisse'}</span>
                  </td>
                  <td className="px-3 py-3 text-ink-2">{session.openedBy.name}</td>
                  <td className="px-3 py-3 text-right">{session.totals.salesCount}</td>
                  <td className="px-3 py-3 text-right font-[600] whitespace-nowrap">{formatMoney(session.totals.netAmount, currency)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Difference session={session} currency={currency} />
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={session.status === 'OPEN' ? 'on' : 'off'}>{session.status === 'OPEN' ? 'Ouverte' : 'Fermée'}</Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ul>
            {sessions.map((session) => (
              <li key={session.id} className="border-t border-line first:border-t-0">
                <Link
                  to="/pos/sessions/$sessionId"
                  params={{ sessionId: session.id }}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 text-ink no-underline hover:bg-surface-2"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="tabular font-[600]">{formatDateTime(session.openedAt)}</span>
                    <span className="truncate text-[0.8125rem] text-ink-2">
                      {session.openedBy.name} · {session.totals.salesCount} ticket{session.totals.salesCount > 1 ? 's' : ''}
                    </span>
                    <span className="text-[0.8125rem]">
                      <Difference session={session} currency={currency} />
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular font-[600]">{formatMoney(session.totals.netAmount, currency)}</span>
                    <ChevronRight className="size-4 text-ink-3" strokeWidth={1.8} aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {list.hasNextPage && (
          <div className="flex justify-center border-t border-line p-3">
            <Button variant="ghost" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
              Afficher plus
            </Button>
          </div>
        )}
      </Card>

      {settings.data && <PosSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings.data} />}
    </div>
  );
}
