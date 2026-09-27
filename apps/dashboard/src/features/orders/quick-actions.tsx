import type { OrderListItemDto } from '@marche/contracts';
import { Banknote, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/client';
import { orderNumber } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { type OrderAction, useOrderAction } from './api';

/** Les deux gestes du quotidien, directement sur la ligne : encaisser et expédier. */
export function OrderQuickActions({ order, compact = false }: { order: OrderListItemDto; compact?: boolean }) {
  const action = useOrderAction();
  if (order.status !== 'PLACED') return null;

  const run = (type: OrderAction['type'], success: string) => {
    action.mutate(
      { id: order.id, action: { type } as OrderAction },
      {
        onSuccess: () => toast(success, { description: orderNumber(order.number) }),
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };
  const pending = action.isPending ? action.variables?.action.type : undefined;

  return (
    <div className="flex items-center gap-1.5">
      {order.paymentStatus === 'UNPAID' && (
        <Button
          size="sm"
          variant="secondary"
          icon={<Banknote />}
          loading={pending === 'mark-paid'}
          disabled={action.isPending}
          onClick={(event) => {
            event.stopPropagation();
            run('mark-paid', 'Commande marquée payée');
          }}
        >
          {compact ? <span className="sr-only">Marquer payée</span> : 'Payée'}
        </Button>
      )}
      <Button
        size="sm"
        icon={<Truck />}
        loading={pending === 'fulfill'}
        disabled={action.isPending}
        onClick={(event) => {
          event.stopPropagation();
          run('fulfill', 'Commande expédiée, stock mis à jour');
        }}
      >
        Expédier
      </Button>
    </div>
  );
}
