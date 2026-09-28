import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { UpsellLogo } from '@/shared/ui/brand';
import { EASE_OUT, press, Reveal } from '@/shared/ui/motion';
import { ThemeToggle } from '@/shared/ui/theme';

/** Les quatre fonctions de l'instrument, dont les témoins s'allument à la mise sous tension. */
const FUNCTIONS = ['Produits', 'Stock', 'Commandes', 'Site'];

/**
 * Connexion et inscription : à gauche, la façade noire de l'instrument qui s'allume
 * (logo, puis les témoins des quatre fonctions l'un après l'autre) ; à droite, le formulaire au calme.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="display-window sticky top-3 m-3 hidden h-[calc(100dvh-1.5rem)] min-h-[36rem] flex-col justify-between rounded-[1.25rem] p-10 lg:flex xl:p-12">
        <UpsellLogo intro delay={0.15} className="text-[1.75rem] text-display-ink" />

        <div className="grid max-w-[26rem] grid-cols-2 gap-2.5" aria-hidden>
          {FUNCTIONS.map((label, index) => (
            <motion.div
              key={label}
              className="flex h-24 flex-col justify-between rounded-xl p-4 shadow-[inset_0_0_0_1px_var(--color-display-line)]"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, ease: EASE_OUT, delay: 0.5 + index * 0.06 }}
            >
              <span className="relative inline-flex size-2">
                <span className="size-2 rounded-full shadow-[inset_0_0_0_1.5px_var(--color-display-dim)]" />
                <motion.span
                  className="led-lit absolute inset-0 rounded-full"
                  initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...press, delay: 1.1 + index * 0.16 }}
                />
              </span>
              <span className="legend text-display-dim">{label}</span>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <Reveal delay={0.3}>
            <p className="display text-[3rem] xl:text-[3.75rem]">
              Votre boutique,
              <br />
              plus haut.
            </p>
          </Reveal>
          <Reveal delay={0.4}>
            <p className="max-w-[40ch] text-[1.0625rem] text-display-dim">
              Produits, stock et commandes au même endroit. Votre site se met en ligne en un clic, avec votre stock à
              jour.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative flex flex-col items-center justify-center gap-8 px-4 py-10">
        <ThemeToggle className="absolute top-4 right-4" />
        <Reveal className="lg:hidden">
          <UpsellLogo intro className="text-[1.75rem]" />
        </Reveal>
        <Reveal delay={0.1}>{children}</Reveal>
      </section>
    </div>
  );
}
