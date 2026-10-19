'use client';

import {
  Check,
  CheckCheck,
  ChevronLeft,
  ExternalLink,
  RotateCcw,
  Send,
  ShoppingBag,
} from 'lucide-react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Badge, cx, GLIDE, Rolling } from './dashboard/ui';
import { amount, fcfa, productById } from './data';
import { Phone, StatusBar } from './phone-site';
import { emitTick, useHome, useShownName } from './state';
import { Swatch } from './wax';

const CHOICES = ['robe', 'bazin', 'chemise'] as const;
/** Clients d'exemple qui ont accepté les nouveautés au moment de commander. */
const AUDIENCE = 248;

type Delivery = 'sending' | 'sent' | 'delivered' | 'read';
type Bubble =
  | {
      id: string;
      from: 'shop';
      productId: string;
      delivery: Delivery;
      at: string;
    }
  | { id: string; from: 'client'; text: string; at: string }
  | { id: string; from: 'typing' };

function clock() {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

/**
 * « Annoncez » : la page Campagnes à gauche (on choisit le produit, on envoie), la conversation du client à droite.
 * Le visiteur joue les deux rôles : il envoie la nouveauté, puis répond comme un client (voir le site, ou STOP).
 */
export function WhatsAppDemo() {
  const { stock } = useHome();
  const name = useShownName();
  const [productId, setProductId] = useState<string>('robe');
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [sent, setSent] = useState(false);
  const [counts, setCounts] = useState({ sent: 0, delivered: 0, read: 0 });
  const [optedOut, setOptedOut] = useState(0);
  const [page, setPage] = useState<string | null>(null);
  const [replied, setReplied] = useState(false);
  const timers = useRef<number[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: 0.35 });
  const touched = useRef(false);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(
    () => () => timers.current.forEach((t) => window.clearTimeout(t)),
    [],
  );

  const send = () => {
    if (sent) return;
    setSent(true);
    emitTick(1.2);
    const id = `m${Date.now()}`;
    setBubbles((current) => [...current, { id: 'typing', from: 'typing' }]);
    later(900, () =>
      setBubbles((current) => [
        ...current.filter((b) => b.from !== 'typing'),
        { id, from: 'shop', productId, delivery: 'sending', at: clock() },
      ]),
    );
    const mark = (delivery: Delivery) =>
      setBubbles((current) =>
        current.map((b) =>
          b.id === id && b.from === 'shop' ? { ...b, delivery } : b,
        ),
      );
    later(1500, () => {
      mark('sent');
      setCounts({ sent: AUDIENCE - optedOut, delivered: 0, read: 0 });
    });
    later(2600, () => {
      mark('delivered');
      setCounts((c) => ({ ...c, delivered: 231 }));
    });
    later(4200, () => {
      mark('read');
      setCounts((c) => ({ ...c, read: 174 }));
    });
  };

  const reply = (text: string) => {
    setReplied(true);
    setBubbles((current) => [
      ...current,
      { id: `r${Date.now()}`, from: 'client', text, at: clock() },
    ]);
    if (text === 'STOP') {
      later(700, () => {
        setOptedOut(1);
        emitTick(0.6);
      });
    }
  };

  const openSite = () => {
    const shop = bubbles.find((b) => b.from === 'shop');
    if (shop?.from !== 'shop') return;
    setReplied(true);
    setPage(shop.productId);
  };

  // Sans geste du visiteur, la nouveauté part seule après un moment : la conversation n'est jamais vide.
  const sendRef = useRef(send);
  sendRef.current = send;
  useEffect(() => {
    if (!inView || sent || touched.current) return;
    const timer = window.setTimeout(() => {
      if (!touched.current) sendRef.current();
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [inView, sent]);

  const reset = () => {
    touched.current = true;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setBubbles([]);
    setSent(false);
    setReplied(false);
    setPage(null);
    setCounts({ sent: 0, delivered: 0, read: 0 });
  };

  const message = bubbles.find((b) => b.from === 'shop');
  const canReply =
    message?.from === 'shop' && message.delivery === 'read' && !replied;
  const recipients = AUDIENCE - optedOut;

  return (
    <div
      ref={root}
      className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16"
    >
      <div data-thread="link" className="uh-dash rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="d-display text-[1.75rem]">Campagnes</h3>
            <Badge tone="on">WhatsApp relié</Badge>
          </div>
          <div className="d-display-window flex items-end justify-between gap-4 rounded-2xl p-5 max-sm:hidden">
            <span className="flex flex-col gap-2">
              <span className="d-legend">Destinataires</span>
              <Rolling
                value={recipients}
                className="d-readout text-[2.75rem]"
              />
            </span>
            <span className="max-w-[13rem] pb-1 text-right text-[0.75rem] text-[var(--d-display-dim)]">
              clients qui ont accepté vos nouveautés en commandant
              {optedOut > 0 && (
                <span className="block font-[600] text-[var(--d-ink)]">
                  1 désinscription (STOP)
                </span>
              )}
            </span>
          </div>

          <fieldset className="flex flex-col gap-2" disabled={sent}>
            <legend className="d-label mb-2">Produit à annoncer</legend>
            <div className="flex flex-col gap-2">
              {CHOICES.map((id) => {
                const product = productById(id);
                const active = id === productId;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      touched.current = true;
                      setProductId(id);
                    }}
                    className="d-template group !h-auto py-2"
                    data-active={active}
                  >
                    {active && (
                      <motion.span
                        layoutId="campaign-knob"
                        className="d-template-knob"
                        transition={GLIDE}
                      />
                    )}
                    <Swatch
                      wax={product.wax}
                      radius={10}
                      className="relative size-10 shrink-0"
                    />
                    <span className="relative flex min-w-0 flex-1 flex-col text-left">
                      <span className="truncate text-[0.875rem] font-[600]">
                        {product.name}
                      </span>
                      <span className="text-[0.75rem] text-[var(--d-ink-2)] tabular-nums">
                        {fcfa(product.price)} · {stock[id] ?? 0} en stock
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {sent ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Envoyés', value: counts.sent },
                  { label: 'Reçus', value: counts.delivered },
                  { label: 'Lus', value: counts.read },
                ].map((cell) => (
                  <span
                    key={cell.label}
                    className="d-well flex flex-col gap-1 rounded-xl px-3 py-2.5"
                  >
                    <span className="d-legend">{cell.label}</span>
                    <Rolling
                      value={cell.value}
                      className="text-[1.25rem] font-[600]"
                    />
                  </span>
                ))}
              </div>
              {optedOut > 0 && (
                <span className="text-[0.8125rem] font-[600] sm:hidden">
                  1 désinscription (STOP) : {recipients} destinataires
                </span>
              )}
              <button
                type="button"
                onClick={reset}
                className="uh-link-dark inline-flex items-center gap-1.5 self-start text-[0.875rem]"
              >
                <RotateCcw className="size-3.5" strokeWidth={2} aria-hidden />{' '}
                Nouvelle campagne
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={send}
              className="d-key-primary d-key-lg w-full"
            >
              <Send className="size-[1.05em]" strokeWidth={1.8} aria-hidden />{' '}
              Envoyer à {recipients} clients
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-5">
        <Phone className="uh-phone-lg uh-phone-chat">
          <div className="relative flex h-full flex-col overflow-hidden bg-[#ece8e1]">
            <div className="bg-[#f7f6f2]">
              <StatusBar />
              <div className="flex items-center gap-2.5 border-b border-black/5 px-3 pt-1 pb-2.5">
                <ChevronLeft
                  className="size-5 text-[#3b3a36]"
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#101115] text-[0.8125rem] font-[700] text-white">
                  {name.slice(0, 1).toUpperCase()}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[0.875rem] font-[650] text-[#141414]">
                    {name}
                  </span>
                  <span className="text-[0.6875rem] text-[#6b6962]">
                    Compte professionnel
                  </span>
                </span>
              </div>
            </div>
            <div
              className="relative flex flex-1 flex-col justify-end gap-2 overflow-hidden px-3 pt-3 pb-3"
              aria-live="polite"
            >
              <span className="mx-auto mb-auto rounded-md bg-white/70 px-2 py-0.5 text-[0.6875rem] font-[600] text-[#55534d]">
                Aujourd’hui
              </span>
              {!sent && (
                <p className="mx-auto max-w-[15rem] rounded-lg bg-white/60 px-3 py-2 text-center text-[0.75rem] text-[#55534d]">
                  Choisissez un produit, puis envoyez : le message arrive ici.
                </p>
              )}
              <AnimatePresence initial={false}>
                {bubbles.map((bubble) => (
                  <motion.div
                    key={bubble.id}
                    layout="position"
                    initial={{ opacity: 0, y: 14, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1, transition: GLIDE }}
                    exit={{ opacity: 0, transition: { duration: 0.12 } }}
                    className={cx(
                      'flex',
                      bubble.from === 'client'
                        ? 'justify-end'
                        : 'justify-start',
                    )}
                    style={{
                      transformOrigin:
                        bubble.from === 'client' ? '100% 100%' : '0% 100%',
                    }}
                  >
                    {bubble.from === 'typing' && (
                      <span className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 shadow-[0_1px_1px_rgb(0_0_0/0.08)]">
                        {[0, 1, 2].map((dot) => (
                          <motion.span
                            key={dot}
                            className="size-1.5 rounded-full bg-[#8e8b84]"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{
                              duration: 0.9,
                              repeat: Infinity,
                              delay: dot * 0.15,
                            }}
                          />
                        ))}
                      </span>
                    )}
                    {bubble.from === 'shop' && (
                      <ShopMessage
                        productId={bubble.productId}
                        delivery={bubble.delivery}
                        at={bubble.at}
                        name={name}
                        onOpen={() => {
                          setReplied(true);
                          setPage(bubble.productId);
                        }}
                      />
                    )}
                    {bubble.from === 'client' && (
                      <span className="flex max-w-[75%] items-end gap-2 rounded-2xl rounded-br-md bg-[#ffe3d1] px-3 py-2 text-[0.8125rem] text-[#1b1a17] shadow-[0_1px_1px_rgb(0_0_0/0.08)]">
                        {bubble.text}
                        <span className="flex items-center gap-0.5 text-[0.625rem] text-[#7a6a5f] tabular-nums">
                          {bubble.at}{' '}
                          <CheckCheck
                            className="size-3"
                            strokeWidth={2}
                            aria-hidden
                          />
                        </span>
                      </span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {page && (
                <ProductPage
                  key="page"
                  productId={page}
                  onBack={() => setPage(null)}
                />
              )}
            </AnimatePresence>
          </div>
        </Phone>

        <div className="flex min-h-12 flex-wrap items-center justify-center gap-2">
          <AnimatePresence>
            {canReply &&
              [
                { label: 'Voir sur le site', act: openSite },
                { label: 'Répondre STOP', act: () => reply('STOP') },
              ].map((chip, index) => (
                <motion.button
                  key={chip.label}
                  type="button"
                  onClick={chip.act}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { ...GLIDE, delay: index * 0.08 },
                  }}
                  exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
                  className="uh-chip"
                >
                  {chip.label}
                </motion.button>
              ))}
          </AnimatePresence>
          {canReply && (
            <span className="w-full text-center text-[0.8125rem] text-[var(--uh-ink-3)]">
              Répondez comme le ferait votre client.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ShopMessage({
  productId,
  delivery,
  at,
  name,
  onOpen,
}: {
  productId: string;
  delivery: Delivery;
  at: string;
  name: string;
  onOpen: () => void;
}) {
  const product = productById(productId);
  return (
    <span className="flex w-[82%] flex-col overflow-hidden rounded-2xl rounded-bl-md bg-white text-[#1b1a17] shadow-[0_1px_1px_rgb(0_0_0/0.08)]">
      <span className="p-1">
        <Swatch
          wax={product.wax}
          radius={12}
          className="aspect-[16/10] w-full"
        />
      </span>
      <span className="px-3 pt-1.5 pb-1 text-[0.8125rem] leading-snug">
        Nouveau chez <strong className="font-[700]">{name}</strong> :{' '}
        {product.name}, {amount(product.price)} FCFA. Disponible maintenant.
      </span>
      <span className="flex items-center justify-between gap-2 px-3 pb-2 text-[0.625rem] text-[#8e8b84]">
        <span>Répondez STOP pour ne plus recevoir nos nouveautés.</span>
        <span className="flex shrink-0 items-center gap-0.5 tabular-nums">
          {at}
          {delivery === 'sending' && <span className="size-3" />}
          {delivery === 'sent' && (
            <Check className="size-3" strokeWidth={2} aria-label="envoyé" />
          )}
          {delivery === 'delivered' && (
            <CheckCheck className="size-3" strokeWidth={2} aria-label="reçu" />
          )}
          {delivery === 'read' && (
            <CheckCheck
              className="size-3 text-[#f66b21]"
              strokeWidth={2.2}
              aria-label="lu"
            />
          )}
        </span>
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="flex h-10 items-center justify-center gap-1.5 border-t border-black/[0.07] text-[0.8125rem] font-[650] text-[#0f6fd6] transition-colors hover:bg-black/[0.03]"
      >
        <ExternalLink className="size-3.5" strokeWidth={2} aria-hidden /> Voir
        sur le site
      </button>
    </span>
  );
}

/** La fiche produit du site, ouverte depuis le message. */
function ProductPage({
  productId,
  onBack,
}: {
  productId: string;
  onBack: () => void;
}) {
  const { stock } = useHome();
  const name = useShownName();
  const product = productById(productId);
  const left = stock[productId] ?? 0;
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ x: '100%', transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
      className="absolute inset-0 z-10 flex flex-col bg-white text-[#101115]"
    >
      <StatusBar />
      <div className="flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-0.5 text-[0.8125rem] font-[600]"
          aria-label="Revenir à la conversation"
        >
          <ChevronLeft className="size-5" strokeWidth={2} aria-hidden /> {name}
        </button>
        <ShoppingBag className="size-[18px]" strokeWidth={1.8} aria-hidden />
      </div>
      <Swatch wax={product.wax} radius={0} className="aspect-square w-full" />
      <div className="flex flex-col gap-1.5 px-4 pt-4">
        <span className="text-[1.125rem] leading-tight font-[750] tracking-[-0.02em]">
          {product.name}
        </span>
        <span className="text-[0.9375rem] font-[600] tabular-nums">
          {fcfa(product.price)}
        </span>
        <span className="text-[0.75rem] text-[#595b62]">
          {left === 0
            ? 'Épuisé'
            : left <= product.threshold
              ? `Plus que ${left} en stock`
              : 'En stock'}{' '}
          · {product.variant}
        </span>
      </div>
      <div className="mt-auto p-4">
        <span className="flex h-11 items-center justify-center rounded-full bg-[#101115] text-[0.875rem] font-[650] text-white">
          {left === 0 ? 'Épuisé' : 'Ajouter au panier'}
        </span>
      </div>
    </motion.div>
  );
}
