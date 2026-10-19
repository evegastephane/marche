'use client';

import { Check, Rocket } from 'lucide-react';
import { motion, useInView } from 'motion/react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { ROOT_DOMAIN, storeSlug } from '@/lib/platform';
import { Badge, cx, GLIDE, Led } from './dashboard/ui';
import { PRODUCTS, TEMPLATES, type TemplateId } from './data';
import { EASE, Flip, gsap } from './gsap';
import { Phone, SiteScreen, StatusBar } from './phone-site';
import { emitTick, useHome, useShownName } from './state';
import { Swatch } from './wax';

type Phase = 'idle' | 'building' | 'live';

/**
 * « Publiez » : la page Site du dashboard à gauche, le téléphone à droite. Un clic sur « Générer mon site » et
 * les produits du catalogue s'envolent vers le téléphone pour bâtir la boutique ; on change de modèle, on tape
 * son nom, le site suit. Sans clic, la démonstration se lance seule après un moment.
 */
export function PublishDemo() {
  const {
    storeName,
    setStoreName,
    stock,
    siteLive,
    setSiteLive,
    template,
    setTemplate,
  } = useHome();
  const name = useShownName();
  const [phase, setPhase] = useState<Phase>(siteLive ? 'live' : 'idle');
  const [typed, setTyped] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const inView = useInView(screen, { amount: 0.6 });
  const address = `${storeSlug(name) || 'chez-awa'}.${ROOT_DOMAIN}`;

  const generate = useCallback(() => {
    setPhase((current) => (current === 'idle' ? 'building' : current));
  }, []);

  // Sans clic, le bouton s'enfonce tout seul après un moment passé sur le chapitre.
  useEffect(() => {
    if (!inView || phase !== 'idle') return;
    const timer = window.setTimeout(() => {
      if (button.current)
        gsap.fromTo(
          button.current,
          { scale: 0.96 },
          { scale: 1, duration: 0.5, ease: 'back.out(3)' },
        );
      generate();
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [inView, phase, generate]);

  // La construction : l'adresse s'écrit, l'en-tête et le bandeau se posent, les produits arrivent du catalogue.
  useLayoutEffect(() => {
    if (phase !== 'building' || !screen.current || !root.current) return;
    const site = screen.current;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const finish = () => {
      setPhase('live');
      setSiteLive(true);
      emitTick(1.4);
    };
    if (reduce) {
      finish();
      return;
    }
    const tiles = [...site.querySelectorAll<HTMLElement>('[data-site-tile]')];
    const clones: HTMLElement[] = [];
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: finish });
      const typing = { n: 0 };
      tl.to(
        typing,
        {
          n: address.length,
          duration: 0.9,
          ease: 'none',
          onUpdate: () => setTyped(address.slice(0, Math.round(typing.n))),
        },
        0,
      );
      tl.from(
        site.querySelectorAll('.uh-site-head, .uh-site-hero'),
        { y: 26, autoAlpha: 0, duration: 0.9, ease: EASE, stagger: 0.12 },
        0.35,
      );
      gsap.set(tiles, { autoAlpha: 0 });
      tiles.forEach((tile, index) => {
        const id = tile.dataset.siteTile;
        const source = root.current?.querySelector<HTMLElement>(
          `[data-catalog-tile="${id}"]`,
        );
        if (!source) {
          tl.to(tile, { autoAlpha: 1, duration: 0.4 }, 0.8 + index * 0.08);
          return;
        }
        const from = source.getBoundingClientRect();
        // Catalogue masqué (téléphone) : le produit apparaît sur place.
        if (from.width === 0) {
          tl.to(tile, { autoAlpha: 1, duration: 0.5 }, 0.8 + index * 0.08);
          return;
        }
        const to = tile.getBoundingClientRect();
        const clone = source.cloneNode(true) as HTMLElement;
        clone.removeAttribute('data-catalog-tile');
        Object.assign(clone.style, {
          position: 'absolute',
          left: `${from.left + window.scrollX}px`,
          top: `${from.top + window.scrollY}px`,
          width: `${from.width}px`,
          height: `${from.height}px`,
          margin: '0',
          zIndex: '60',
          pointerEvents: 'none',
        });
        document.body.append(clone);
        clones.push(clone);
        const at = 0.75 + index * 0.09;
        tl.to(
          clone,
          {
            left: to.left + window.scrollX,
            top: to.top + window.scrollY,
            width: to.width,
            height: to.height,
            borderRadius: getComputedStyle(tile).borderRadius,
            duration: 1.05,
            ease: 'expo.inOut',
          },
          at,
        )
          .to(
            clone,
            {
              keyframes: { rotation: [0, index % 2 ? -7 : 7, 0] },
              duration: 1.05,
              ease: 'none',
            },
            at,
          )
          .set(tile, { autoAlpha: 1 }, at + 1.05)
          .set(clone, { display: 'none' }, at + 1.05);
      });
      tl.from(
        site.querySelectorAll('.uh-site-card-text'),
        { y: 10, autoAlpha: 0, duration: 0.6, ease: EASE, stagger: 0.06 },
        1.6,
      );
    }, site);
    return () => {
      ctx.revert();
      for (const clone of clones) clone.remove();
    };
    // L'adresse est lue au départ de la construction ; la suite la met à jour normalement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Changer de modèle : les mêmes produits glissent vers leur place dans le nouveau gabarit.
  const chooseTemplate = (id: TemplateId) => {
    if (id === template) return;
    if (screen.current && phase === 'live') {
      flipState.current = Flip.getState(
        screen.current.querySelectorAll(
          '[data-site-tile], .uh-site-hero, .uh-site-name, .uh-site-card-text',
        ),
      );
    }
    setTemplate(id);
    emitTick(0.5);
  };
  useLayoutEffect(() => {
    const state = flipState.current;
    if (!state) return;
    flipState.current = null;
    Flip.from(state, {
      duration: 0.85,
      ease: 'expo.inOut',
      stagger: 0.025,
      nested: true,
      prune: true,
    });
  }, [template]);

  return (
    <div
      ref={root}
      className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16"
    >
      <div data-thread="link" className="uh-dash rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="d-display text-[1.75rem]">Site</h3>
            <Badge tone={phase === 'live' ? 'on' : 'off'}>
              {phase === 'live' ? 'En ligne' : 'Hors ligne'}
            </Badge>
          </div>

          <label className="flex flex-col gap-2">
            <span className="d-label">Nom de la boutique</span>
            <input
              value={storeName}
              onChange={(event) =>
                setStoreName(event.target.value.slice(0, 40))
              }
              placeholder="Chez Awa"
              autoComplete="off"
              spellCheck={false}
              className="d-input"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="d-label mb-2">Modèle</legend>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => {
                const active = t.id === template;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseTemplate(t.id)}
                    className="d-template group"
                    data-active={active}
                  >
                    {active && (
                      <motion.span
                        layoutId="template-knob"
                        className="d-template-knob"
                        transition={GLIDE}
                      />
                    )}
                    <span
                      aria-hidden
                      className="relative flex h-9 w-12 shrink-0 max-sm:hidden flex-col gap-[3px] overflow-hidden rounded-md p-[4px]"
                      style={{
                        background: t.palette.bg,
                        boxShadow: `inset 0 0 0 1px ${t.palette.line}`,
                      }}
                    >
                      <span
                        className="h-[5px] w-6 rounded-[2px]"
                        style={{ background: t.palette.fg }}
                      />
                      <span className="flex flex-1 gap-[3px]">
                        <span
                          className="flex-1 rounded-[2px]"
                          style={{ background: t.palette.surface }}
                        />
                        <span
                          className="flex-1 rounded-[2px]"
                          style={{ background: t.palette.accent }}
                        />
                      </span>
                    </span>
                    <span className="relative min-w-0 text-left text-[0.8125rem] leading-tight font-[600]">
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2 max-sm:hidden">
            <span className="d-label flex items-center justify-between">
              Produits en vente{' '}
              <span className="font-[500] text-[var(--d-ink-3)] tabular-nums">
                {PRODUCTS.length}
              </span>
            </span>
            <ul className="grid grid-cols-6 gap-2">
              {PRODUCTS.map((product) => (
                <li key={product.id}>
                  <span
                    data-catalog-tile={product.id}
                    className="block aspect-square overflow-hidden rounded-[0.6rem] shadow-[0_0_0_1px_var(--d-line)]"
                  >
                    <Swatch
                      wax={product.wax}
                      radius={0}
                      className="size-full"
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {phase === 'live' ? (
            <div className="d-well flex h-12 items-center gap-2.5 rounded-xl px-4 text-[0.875rem] font-[560]">
              <Led tone="on" />
              <span className="min-w-0 flex-1 truncate tabular-nums">
                {address}
              </span>
              <Check
                className="size-4 text-[var(--d-ink-2)]"
                strokeWidth={2}
                aria-hidden
              />
            </div>
          ) : (
            <button
              ref={button}
              type="button"
              onClick={generate}
              disabled={phase === 'building'}
              className="d-key-primary d-key-lg w-full"
            >
              <Rocket
                className={cx(
                  'size-[1.1em]',
                  phase === 'building' && 'animate-pulse',
                )}
                strokeWidth={1.8}
                aria-hidden
              />
              {phase === 'building' ? 'Mise en ligne…' : 'Générer mon site'}
            </button>
          )}
        </div>
      </div>

      <div className="relative flex justify-center">
        <Phone className="uh-phone-lg">
          <div ref={screen} className="relative h-full">
            {phase === 'idle' ? (
              <div className="flex h-full flex-col bg-[#f6f5f1]">
                <StatusBar />
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                  <span className="text-[0.9375rem] font-[600] text-[#1b1a17]">
                    Votre site s’affichera ici
                  </span>
                  <span className="text-[0.8125rem] text-[#6b6962]">
                    Un clic, et vos produits en vente le remplissent.
                  </span>
                </div>
              </div>
            ) : (
              <SiteScreen
                template={template}
                name={name}
                stock={stock}
                address={phase === 'building' ? typed || ' ' : undefined}
              />
            )}
          </div>
        </Phone>
      </div>
    </div>
  );
}
