import { Check, Globe, PackageCheck, ReceiptText } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { UpsellLogo, UpsellMark } from '@/shared/ui/brand';
import { EASE_OUT, Reveal } from '@/shared/ui/motion';
import { ThemeToggle } from '@/shared/ui/theme';

const CHIPS = [
  {
    icon: PackageCheck,
    label: 'Stock à jour',
    className: 'top-[18%] right-[10%]',
    delay: 0.9,
    float: 7,
  },
  {
    icon: Globe,
    label: 'Site en ligne',
    className: 'top-[36%] left-[8%]',
    delay: 1.05,
    float: 9,
  },
  {
    icon: ReceiptText,
    label: 'Nouvelle commande',
    className: 'top-[52%] right-[16%]',
    delay: 1.2,
    float: 6,
  },
];

/** Connexion et inscription : le panneau de marque à gauche, le formulaire au calme à droite. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="sticky top-3 m-3 hidden h-[calc(100dvh-1.5rem)] min-h-[36rem] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#0c1a3c] p-12 text-white lg:flex">
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -top-40 -right-32 size-[34rem] rounded-full bg-[#0b57f0] opacity-50 blur-[120px]"
          animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.6, 0.45] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -bottom-48 -left-24 size-[28rem] rounded-full bg-[#ff5a2b] opacity-25 blur-[120px]"
          animate={{ scale: [1.1, 1, 1.1] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative flex items-center gap-3">
          <span className="inline-flex rounded-2xl bg-white p-2.5">
            <UpsellMark intro className="h-8 w-auto" delay={0.2} />
          </span>
          <motion.span
            className="text-[1.5rem] font-[800] tracking-[-0.04em]"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.4 }}
          >
            Upsell
          </motion.span>
        </div>

        {CHIPS.map((chip) => (
          <motion.span
            key={chip.label}
            aria-hidden
            className={`absolute ${chip.className} inline-flex items-center gap-2.5 rounded-2xl border border-white/12 bg-white/8 py-2 pr-4 pl-2 text-[0.875rem] font-[650] backdrop-blur-md`}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: [0, -chip.float, 0], scale: 1 }}
            transition={{
              opacity: { duration: 0.5, delay: chip.delay },
              scale: {
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: chip.delay,
              },
              y: {
                duration: 5 + chip.float / 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: chip.delay,
              },
            }}
          >
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-white text-[#0b57f0]">
              <chip.icon className="size-4" strokeWidth={2.3} />
            </span>
            {chip.label}
            <Check className="size-4 text-[#25c16f]" strokeWidth={3} />
          </motion.span>
        ))}

        <div className="relative flex flex-col gap-5">
          <Reveal delay={0.3}>
            <p className="display text-[3.5rem] xl:text-[4.25rem]">
              Votre boutique,
              <br />
              <span className="text-[#fdb52a]">plus haut.</span>
            </p>
          </Reveal>
          <Reveal delay={0.45}>
            <p className="max-w-[40ch] text-[1.0625rem] text-white/75">
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
