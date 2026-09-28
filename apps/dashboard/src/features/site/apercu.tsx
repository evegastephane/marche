import type { ThemeSettings } from '@marche/contracts';
import { motion } from 'motion/react';
import { glide as snappy } from '@/shared/ui/motion';

const SERIF = new Set(['Playfair Display', 'Lora']);

function family(font: string): string {
  return `'${font}', ${SERIF.has(font) ? 'Georgia, serif' : 'ui-sans-serif, system-ui, sans-serif'}`;
}

/**
 * Aperçu schématique de l'accueil du site, dessiné à partir des réglages du thème :
 * il suit chaque modification avant même l'enregistrement.
 */
export function ApercuSite({
  settings,
  storeName,
  host,
}: {
  settings: ThemeSettings;
  storeName: string;
  host: string;
}) {
  const { colors, fonts, announcement } = settings;
  const hero = settings.sections.find((s) => s.type === 'hero' && s.enabled);
  const featured = settings.sections.find((s) => s.type === 'featured-collection' && s.enabled);
  const grid = settings.sections.find((s) => s.type === 'product-grid' && s.enabled);

  return (
    <figure className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-2xl bg-white shadow-float ring-1 ring-line">
        <div className="flex items-center gap-2 bg-surface-2 px-3 py-2">
          <span className="flex gap-1" aria-hidden>
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </span>
          <span className="tabular flex-1 truncate rounded-md bg-surface px-2.5 py-0.5 text-center text-[0.75rem] text-ink-2">
            {host}
          </span>
        </div>
        <motion.div
          animate={{
            backgroundColor: colors.background,
            color: colors.foreground,
          }}
          transition={{ duration: 0.3 }}
          style={{ fontFamily: family(fonts.body) }}
        >
          {announcement.enabled && announcement.text && (
            <p
              className="px-4 py-1.5 text-center text-[0.6875rem] font-semibold"
              style={{ background: colors.accent, color: colors.foreground }}
            >
              {announcement.text}
            </p>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="truncate text-[0.9375rem] font-bold" style={{ fontFamily: family(fonts.heading) }}>
              {storeName}
            </span>
            <span className="flex gap-3 text-[0.625rem] opacity-70" aria-hidden>
              <span>Boutique</span>
              <span>Panier</span>
            </span>
          </div>
          {hero && hero.type === 'hero' && (
            <motion.div
              className="flex flex-col items-start gap-2 px-4 py-6"
              animate={{ backgroundColor: colors.primary }}
              transition={{ duration: 0.3 }}
              style={{ color: '#fff' }}
            >
              <p className="text-[1.25rem] leading-tight font-bold" style={{ fontFamily: family(fonts.heading) }}>
                {hero.title}
              </p>
              {hero.subtitle && <p className="text-[0.6875rem] opacity-85">{hero.subtitle}</p>}
              {hero.ctaLabel && (
                <span
                  className="mt-1 rounded-md px-2.5 py-1 text-[0.625rem] font-bold"
                  style={{
                    background: colors.accent,
                    color: colors.foreground,
                  }}
                >
                  {hero.ctaLabel}
                </span>
              )}
            </motion.div>
          )}
          {[featured, grid].map(
            (section) =>
              section &&
              (section.type === 'featured-collection' || section.type === 'product-grid') && (
                <div key={section.id} className="flex flex-col gap-2 px-4 py-4">
                  <p className="text-[0.8125rem] font-bold" style={{ fontFamily: family(fonts.heading) }}>
                    {section.title}
                  </p>
                  <div className="grid grid-cols-4 gap-2" aria-hidden>
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="flex flex-col gap-1"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...snappy, delay: 0.2 + i * 0.05 }}
                      >
                        <span
                          className="aspect-[4/5] rounded-md"
                          style={{
                            background: colors.foreground,
                            opacity: 0.08,
                          }}
                        />
                        <span
                          className="h-1.5 w-3/4 rounded-full"
                          style={{
                            background: colors.foreground,
                            opacity: 0.2,
                          }}
                        />
                        <span
                          className="h-1.5 w-1/3 rounded-full"
                          style={{ background: colors.primary, opacity: 0.6 }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ),
          )}
        </motion.div>
      </div>
      <figcaption className="text-[0.8125rem] text-ink-2">
        Aperçu simplifié : les photos et les produits réels s’affichent sur le site.
      </figcaption>
    </figure>
  );
}
