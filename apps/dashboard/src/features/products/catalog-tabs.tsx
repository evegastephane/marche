import { Link } from '@tanstack/react-router';
import { motion } from 'motion/react';
import { cn } from '@/shared/lib/cn';
import { riseIn } from '@/shared/ui/motion';

const TABS = [
  { to: '/products', label: 'Produits' },
  { to: '/categories', label: 'Catégories' },
  { to: '/brands', label: 'Marques' },
] as const;

/**
 * Les trois rangements du catalogue sous une seule touche du menu : un rail en creux,
 * la page ouverte porte la face de touche (même geste que les autres sélecteurs).
 */
export function CatalogTabs() {
  return (
    <motion.nav
      variants={riseIn}
      aria-label="Catalogue"
      className="well flex max-w-full gap-0.5 self-start overflow-x-auto rounded-xl p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className="relative inline-flex h-8 shrink-0 items-center rounded-lg px-3.5 text-[0.8125rem] font-[580] text-ink-2 no-underline transition-colors duration-200 hover:text-ink max-md:h-10"
          activeProps={{ 'aria-current': 'page' }}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-lg bg-key shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]"
                />
              )}
              <span className={cn('relative', isActive && 'text-ink')}>{tab.label}</span>
            </>
          )}
        </Link>
      ))}
    </motion.nav>
  );
}
