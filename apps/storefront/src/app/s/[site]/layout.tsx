import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { ConsentBanner } from '@/components/analytics';
import { CART_COOKIE, PREVIEW_COOKIE } from '@/lib/site';
import { getCart, getStore } from '@/lib/storefront-api';
import { themeStyle } from '@/lib/theme';
import { getTemplate } from '@/templates';
import { MotionProvider } from '@/templates/default/components/motion';

type Params = Promise<{ site: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { site } = await params;
  const store = await getStore(site);
  const hero = store.theme.sections.find((s) => s.type === 'hero');
  return {
    title: { default: store.name, template: `%s · ${store.name}` },
    description: hero?.type === 'hero' ? (hero.subtitle ?? hero.title) : undefined,
  };
}

/** Chaque boutique habille le même template avec ses couleurs et ses polices. */
export default async function SiteLayout({ children, params }: { children: ReactNode; params: Params }) {
  const { site } = await params;
  const store = await getStore(site);
  const template = getTemplate(store.templateId);
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  const previewing = jar.has(PREVIEW_COOKIE);
  const cart = cartId ? await getCart(site, cartId) : null;

  return (
    <div style={themeStyle(store.theme)} className="flex min-h-dvh flex-col bg-bg font-body text-fg">
      <MotionProvider>
        {previewing && (
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-fg px-4 py-2 text-center text-sm text-bg">
            <span className="font-semibold">Aperçu du brouillon</span>
            <span className="opacity-80">Vos visiteurs voient encore la version publiée.</span>
            <a href="/preview/exit" className="font-semibold text-bg underline">
              Quitter l’aperçu
            </a>
          </p>
        )}
        <template.Header store={store} cartCount={cart?.itemsCount ?? 0} />
        <main className="flex-1">{children}</main>
        <template.Footer store={store} />
        <ConsentBanner storeId={store.id} privacyHref="/confidentialite" />
      </MotionProvider>
    </div>
  );
}
