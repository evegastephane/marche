import type { CampaignDto, ProductListItemDto } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Megaphone, PackageSearch, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { messagePreview, useAudience, useCampaigns, useLaunchCampaign } from '@/features/campaigns/api';
import { ProductPicker } from '@/features/products/product-picker';
import { Thumbnail } from '@/features/products/thumbnail';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { formatDateTime, formatMoney, plural } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { Dialog } from '@/shared/ui/dialog';
import { EmptyState, LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { EASE_OUT, glide, riseIn } from '@/shared/ui/motion';
import { siteHost } from '@/shared/ui/site-address';

export const Route = createFileRoute('/_app/campaigns')({ component: Campagnes });

function Campagnes() {
  const audience = useAudience();
  const campaigns = useCampaigns();

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Campagnes"
        subtitle="Envoyez un produit sur WhatsApp aux clients qui ont accepté de recevoir vos nouveautés."
      />
      {audience.error && <LoadError message={errorMessage(audience.error)} onRetry={() => void audience.refetch()} />}
      {audience.data && !audience.data.configured ? <NotConfigured /> : <Composer recipients={audience.data?.recipients} />}

      <Card className="overflow-hidden">
        <CardHeader title="Campagnes envoyées" count={campaigns.data?.length} />
        {campaigns.isPending ? (
          <div className="flex flex-col gap-3 px-5 pb-5">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : campaigns.error ? (
          <div className="px-5 pb-5">
            <LoadError message={errorMessage(campaigns.error)} onRetry={() => void campaigns.refetch()} />
          </div>
        ) : campaigns.data.length === 0 ? (
          <EmptyState icon={Megaphone} title="Aucune campagne pour l’instant">
            Chaque campagne apparaîtra ici avec ses messages envoyés, délivrés et lus.
          </EmptyState>
        ) : (
          <ul className="border-t border-line">
            <AnimatePresence initial={false}>
              {campaigns.data.map((campaign, index) => (
                <CampaignRow key={campaign.id} campaign={campaign} index={index} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Nouvelle campagne : un produit, l'aperçu du message, l'audience, et la touche d'envoi. */
function Composer({ recipients }: { recipients: number | undefined }) {
  const store = useCurrentStore();
  const launch = useLaunchCampaign();
  const [product, setProduct] = useState<ProductListItemDto | null>(null);
  const [picking, setPicking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const currency = store.data?.currency ?? 'XOF';
  const count = recipients ?? 0;
  const preview = messagePreview({
    firstName: 'Awa',
    store: store.data?.name ?? 'votre boutique',
    product: product?.title ?? 'votre produit',
    price: product ? formatMoney(product.priceMinAmount, currency) : '…',
    url: product && store.data ? `https://${siteHost(store.data.slug)}/products/${product.slug}` : 'lien du produit',
  });

  const send = () =>
    product &&
    launch.mutate(
      { productId: product.id },
      {
        onSuccess: (campaign) => {
          setConfirming(false);
          setProduct(null);
          toast('Campagne lancée', {
            description: `${plural(campaign.counts.total, 'message part', 'messages partent')} sur WhatsApp.`,
          });
        },
        onError: (error) => {
          setConfirming(false);
          toast.error(errorMessage(error));
        },
      },
    );

  return (
    <motion.section variants={riseIn} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="heading text-[1.0625rem]">Nouvelle campagne</h2>
        <AnimatePresence mode="wait" initial={false}>
          {product ? (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="well flex items-center gap-3 rounded-xl p-3"
            >
              <Thumbnail media={product.thumbnail} alt={product.title} className="size-14" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-[600]">{product.title}</span>
                <span className="tabular text-[0.875rem] text-ink-2">{formatMoney(product.priceMinAmount, currency)}</span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => setPicking(true)}>
                Changer
              </Button>
            </motion.div>
          ) : (
            <motion.button
              key="choisir"
              type="button"
              onClick={() => setPicking(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong p-4 text-left text-ink-2 transition-colors hover:border-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <PackageSearch className="size-6 shrink-0" strokeWidth={1.6} aria-hidden />
              <span className="flex flex-col">
                <span className="font-[600] text-ink">Choisir le produit à envoyer</span>
                <span className="text-[0.875rem]">Un produit en vente, avec sa photo et son prix.</span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <div className="display-window flex items-end justify-between gap-4 rounded-xl px-4 py-3.5">
          <span className="flex flex-col gap-1">
            <span className="legend text-display-dim">Destinataires</span>
            <span className="text-[0.8125rem] text-display-dim">ont accepté vos nouveautés</span>
          </span>
          {recipients === undefined ? (
            <Skeleton className="h-9 w-14 opacity-40" />
          ) : (
            <AnimatedNumber value={count} className="readout text-[2.25rem]" />
          )}
        </div>

        <Button
          variant="primary"
          size="lg"
          icon={<Send strokeWidth={1.8} />}
          disabled={!product || count === 0}
          onClick={() => setConfirming(true)}
        >
          {count > 0 ? `Envoyer à ${plural(count, 'client', 'clients')}` : 'Aucun client à contacter'}
        </Button>
        {count === 0 && recipients !== undefined && (
          <p className="text-[0.8125rem] text-ink-2">
            Vos clients acceptent en cochant « Recevoir les nouveautés sur WhatsApp » au moment de commander sur votre site.
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="heading text-[1.0625rem]">Aperçu du message</h2>
        <motion.p
          key={preview}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="well rounded-2xl rounded-tl-md px-4 py-3.5 text-[0.9375rem] leading-relaxed break-words whitespace-pre-line"
        >
          {preview}
        </motion.p>
        <p className="text-[0.8125rem] text-ink-2">
          Le prénom de chaque client remplace « Awa ». Le texte exact est celui du modèle approuvé par Meta ; chaque message
          envoyé est facturé par Meta selon le pays du client. Un client qui répond « STOP » ne reçoit plus rien.
        </p>
      </Card>

      <ProductPicker
        open={picking}
        onOpenChange={setPicking}
        exclude={new Set()}
        title="Produit à envoyer"
        onPick={(picked) => {
          const chosen = picked.find((p) => p.status === 'ACTIVE') ?? null;
          if (picked.length > 0 && !chosen) toast.error('Choisissez un produit en vente.');
          setProduct(chosen);
        }}
      />
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Envoyer la campagne ?"
        description={
          product
            ? `« ${product.title} » part sur WhatsApp vers ${plural(count, 'client', 'clients')}. Un message envoyé ne se rattrape pas.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Pas maintenant
          </Button>
          <Button variant="primary" icon={<Send strokeWidth={1.8} />} loading={launch.isPending} onClick={send}>
            Envoyer
          </Button>
        </div>
      </Dialog>
    </motion.section>
  );
}

function CampaignRow({ campaign, index }: { campaign: CampaignDto; index: number }) {
  const sending = campaign.status === 'SENDING';
  const c = campaign.counts;
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { ...glide, delay: Math.min(index, 10) * 0.03 } }}
      className="grid gap-x-6 gap-y-3 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {campaign.productId ? (
            <Link
              to="/products/$productId"
              params={{ productId: campaign.productId }}
              className="truncate font-[600] text-ink no-underline hover:underline"
            >
              {campaign.productTitle}
            </Link>
          ) : (
            <span className="truncate font-[600]">{campaign.productTitle}</span>
          )}
          <Badge tone={sending ? 'attention' : 'on'}>{sending ? 'Envoi en cours' : 'Terminée'}</Badge>
        </span>
        <span className="text-[0.8125rem] text-ink-2">
          {formatDateTime(campaign.createdAt)} · {plural(c.total, 'destinataire', 'destinataires')}
        </span>
      </div>
      <dl className="tabular grid grid-cols-4 gap-x-5 text-right">
        {(
          [
            ['Envoyés', c.sent],
            ['Délivrés', c.delivered],
            ['Lus', c.read],
            ['Échecs', c.failed],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <dt className="legend">{label}</dt>
            <dd className={cn('text-[1.0625rem] font-[600]', label === 'Échecs' && value > 0 && 'text-danger-ink')}>
              <AnimatedNumber value={value} />
            </dd>
          </div>
        ))}
      </dl>
    </motion.li>
  );
}

/** L'envoi n'est pas encore branché côté plateforme : on explique quoi faire, sans jargon inutile. */
function NotConfigured() {
  return (
    <motion.section variants={riseIn} className="panel flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Badge tone="off">Envoi WhatsApp non activé</Badge>
      </div>
      <p className="max-w-[70ch] text-ink-2">
        L’envoi de campagnes WhatsApp n’est pas encore activé sur Upsell. Dès qu’il le sera, vous choisirez ici un produit
        et l’enverrez en un geste aux clients qui ont accepté vos nouveautés.
      </p>
      <p className="max-w-[70ch] text-[0.875rem] text-ink-2">
        En attendant, rien n’est perdu : vos clients donnent déjà leur accord au moment de commander sur votre site. Ils
        seront prêts à recevoir votre première campagne.
      </p>
    </motion.section>
  );
}
