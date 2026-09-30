import type { Metadata } from 'next';
import { ReferenceBrowser } from '@/components/developers/reference-browser';
import { loadApiReference, PUBLIC_API_URL } from '@/lib/developers';

export const metadata: Metadata = { title: 'Référence des API' };
export const revalidate = 60;

export default async function ReferencePage() {
  const reference = await loadApiReference();
  const count = reference?.groups.reduce((sum, group) => sum + group.operations.length, 0) ?? 0;

  return (
    <main className="mx-auto flex w-full max-w-[76rem] flex-col gap-10 px-4 pt-10 pb-24 sm:px-6 lg:px-10 lg:pt-14">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-[62ch] flex-col gap-3">
          <h1 className="up-display-title up-rise text-[2.25rem] sm:text-[2.75rem]">Référence des API</h1>
          <p className="up-rise text-[1.0625rem] leading-[1.6] text-[var(--up-ink-2)] [--up-delay:60ms]">
            Chaque route, ses paramètres et son corps, lus directement sur l’API : cette page est toujours à jour.
          </p>
        </div>
        <div className="up-lcd up-rise flex items-stretch overflow-hidden rounded-2xl [--up-delay:120ms]">
          <div className="flex flex-col gap-1.5 px-5 py-3.5">
            <span className="up-legend">Routes</span>
            <span className="text-[1.75rem] leading-none font-light tracking-[-0.02em] tabular-nums">{count}</span>
          </div>
          <div className="flex flex-col justify-center gap-1.5 border-l border-[var(--up-display-line)] px-5 py-3.5">
            <span className="up-legend">OpenAPI {reference?.version ?? ''}</span>
            <a href={`${PUBLIC_API_URL}/openapi.json`} className="up-code text-[0.8125rem] text-[var(--up-display-ink)] underline decoration-[var(--up-display-line)] underline-offset-4 hover:decoration-current">
              /openapi.json
            </a>
          </div>
        </div>
      </header>

      {reference ? (
        <ReferenceBrowser groups={reference.groups} />
      ) : (
        <div role="alert" className="flex flex-col gap-1 rounded-xl bg-[var(--up-danger-soft)] px-5 py-4 text-[var(--up-danger-ink)]">
          <p className="font-[650]">L’API ne répond pas pour le moment.</p>
          <p className="text-[0.9375rem]">
            La référence est lue sur {PUBLIC_API_URL}/openapi.json. Rechargez la page dans un instant.
          </p>
        </div>
      )}
    </main>
  );
}
