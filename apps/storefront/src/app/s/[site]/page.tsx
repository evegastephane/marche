import { getStore } from '@/lib/storefront-api';
import { getTemplate } from '@/templates';

export default async function StoreHome({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const store = await getStore(site);

  // R10 : le site existe dès sa génération ; sans produit en vente, il l'annonce simplement.
  if (!store.hasProducts) {
    return (
      <section className="bg-primary text-on-primary">
        <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-start justify-center gap-5 px-4 py-20 sm:px-6">
          <h1 className="text-5xl font-bold sm:text-7xl">{store.name}</h1>
          <p className="max-w-[44ch] text-xl opacity-85">Bientôt disponible. La boutique prépare ses premiers articles.</p>
          {store.contactEmail && (
            <a href={`mailto:${store.contactEmail}`} className="font-semibold text-on-primary">
              {store.contactEmail}
            </a>
          )}
        </div>
      </section>
    );
  }

  const template = getTemplate(store.templateId);
  return <template.HomeSections site={site} store={store} />;
}
