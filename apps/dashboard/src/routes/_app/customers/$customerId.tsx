import type { CustomerDetailDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Mail, MapPin, Phone, UserX } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { customerName, useCustomer } from '@/features/customers/api';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/features/orders/status';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { ApiError, errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { currencyLabel, formatAmount, formatDate, formatMoney, orderNumber, plural } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Card, CardHeader } from '@/shared/ui/card';
import { EmptyState, LoadError, Skeleton } from '@/shared/ui/feedback';
import { glide, riseIn } from '@/shared/ui/motion';

export const Route = createFileRoute('/_app/customers/$customerId')({ component: ClientDetail });

function ClientDetail() {
  const { customerId } = Route.useParams();
  const customer = useCustomer(customerId);
  return (
    <div className="flex flex-col gap-6">
      <motion.div variants={riseIn} className="self-start">
        <Link
          to="/customers"
          className="group inline-flex items-center gap-1.5 text-[0.875rem] font-[560] text-ink-2 no-underline hover:text-ink"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.8} /> Clients
        </Link>
      </motion.div>
      {customer.isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-72" />
          <Skeleton className="h-64" />
        </div>
      ) : customer.error ? (
        customer.error instanceof ApiError && customer.error.code === 'NOT_FOUND' ? (
          <div className="panel">
            <EmptyState icon={UserX} title="Client introuvable">
              Il appartient peut-être à une autre boutique.
            </EmptyState>
          </div>
        ) : (
          <LoadError message={errorMessage(customer.error)} onRetry={() => void customer.refetch()} />
        )
      ) : (
        <Detail customer={customer.data} />
      )}
    </div>
  );
}

function Detail({ customer }: { customer: CustomerDetailDto }) {
  const store = useCurrentStore();
  const currency = store.data?.currency ?? 'XOF';
  const name = customerName(customer);
  const address = customer.defaultAddress;
  const average = customer.ordersCount > 0 ? Math.round(customer.totalSpentAmount / customer.ordersCount) : 0;

  return (
    <>
      <motion.header variants={riseIn} className="flex flex-wrap items-center gap-4">
        <Avatar name={name} className="size-14 text-[1rem]" />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="display text-[1.875rem] break-words md:text-[2.25rem]">{name}</h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-2">
            <span>Client depuis le {formatDate(customer.createdAt)}</span>
            {customer.whatsappOptOutAt ? (
              <Badge tone="off">Désinscrit des nouveautés WhatsApp</Badge>
            ) : customer.whatsappOptInAt ? (
              <Badge tone="on">Accepte les nouveautés WhatsApp</Badge>
            ) : null}
          </p>
        </div>
      </motion.header>

      <motion.section
        variants={riseIn}
        aria-label="Chiffres du client"
        className="display-window grid grid-cols-2 overflow-hidden rounded-2xl sm:grid-cols-3"
      >
        <Reading label="Total dépensé" className="col-span-2 border-b border-display-line sm:col-span-1 sm:border-r sm:border-b-0">
          <span className="flex items-baseline gap-2">
            <AnimatedNumber
              value={customer.totalSpentAmount}
              format={(n) => formatAmount(Math.round(n), currency)}
              className="readout text-[2.25rem]"
            />
            <span className="text-[0.875rem] text-display-dim">{currencyLabel(currency)}</span>
          </span>
        </Reading>
        <Reading label="Commandes" className="border-r border-display-line">
          <AnimatedNumber value={customer.ordersCount} className="readout text-[2.25rem]" />
        </Reading>
        <Reading label="Panier moyen">
          <span className="flex items-baseline gap-2">
            <AnimatedNumber
              value={average}
              format={(n) => formatAmount(Math.round(n), currency)}
              className="readout text-[2.25rem]"
            />
            <span className="text-[0.875rem] text-display-dim">{currencyLabel(currency)}</span>
          </span>
        </Reading>
      </motion.section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-8">
        <Card className="overflow-hidden">
          <CardHeader title="Coordonnées" />
          <ul className="flex flex-col gap-2.5 px-5 pb-5 text-[0.9375rem]">
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0 text-ink-3" strokeWidth={1.8} aria-hidden />
              <a href={`mailto:${customer.email}`} className="truncate text-ink">
                {customer.email}
              </a>
            </li>
            {customer.phone && (
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0 text-ink-3" strokeWidth={1.8} aria-hidden />
                <a href={`tel:${customer.phone}`} className="text-ink">
                  {customer.phone}
                </a>
              </li>
            )}
            {address && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink-3" strokeWidth={1.8} aria-hidden />
                <address className="not-italic text-ink">
                  {address.line1}
                  {address.line2 && (
                    <>
                      <br />
                      {address.line2}
                    </>
                  )}
                  <br />
                  {[address.postalCode, address.city].filter(Boolean).join(' ')} · {address.country}
                </address>
              </li>
            )}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Commandes" count={customer.ordersCount} />
          {customer.orders.length === 0 ? (
            <p className="px-5 pb-5 text-ink-2">Aucune commande pour l’instant.</p>
          ) : (
            <ul className="border-t border-line">
              {customer.orders.map((order, index) => (
                <motion.li
                  key={order.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...glide, delay: Math.min(index, 10) * 0.03 }}
                  className="border-b border-line last:border-b-0"
                >
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId: order.id }}
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 text-ink no-underline transition-colors duration-200 hover:bg-surface-2"
                  >
                    <span className="tabular font-[650]">{orderNumber(order.number)}</span>
                    <span className="flex flex-wrap gap-x-3 gap-y-1">
                      <Badge tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</Badge>
                      {order.status !== 'DRAFT' && order.status !== 'CANCELLED' && (
                        <Badge tone={PAYMENT_STATUS[order.paymentStatus].tone}>
                          {PAYMENT_STATUS[order.paymentStatus].label}
                        </Badge>
                      )}
                    </span>
                    <span className="tabular text-right">
                      <span className="block font-[600]">{formatMoney(order.totalAmount, order.currency)}</span>
                      <span className="block text-[0.8125rem] text-ink-2">
                        {formatDate(order.placedAt ?? order.createdAt)} · {plural(order.itemsCount, 'article', 'articles')}
                      </span>
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Reading({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-[8.5rem] flex-col justify-between gap-4 p-5 sm:p-6', className)}>
      <span className="legend text-display-dim">{label}</span>
      {children}
    </div>
  );
}
