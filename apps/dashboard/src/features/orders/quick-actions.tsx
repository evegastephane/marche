import type { OrderListItemDto } from '@marche/contracts';
import { Banknote, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/api/client';
import { orderNumber } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { type OrderAction, useOrderAction } from './api';

/** Nom de la lumière orange partagée par les touches « Expédier » d'une liste. */
export const NEXT_ACTION_LIGHT = 'next-action';

/**
 * Les deux gestes du quotidien, directement sur la ligne : encaisser et expédier.
 * `lit` allume la touche « Expédier » : c'est la prochaine commande à faire partir ; quand elle part,
 * la lumière orange glisse jusqu'à la touche de la suivante.
 */
export function OrderQuickActions({
  order,
  compact = false,
  lit = false,
}: {
  order: OrderListItemDto;
  compact?: boolean;
  lit?: boolean;
}) {
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
          variant="ghost"
          icon={<Banknote strokeWidth={1.8} />}
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
        lightId={NEXT_ACTION_LIGHT}
        lit={lit}
        icon={<Truck strokeWidth={1.8} />}
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
