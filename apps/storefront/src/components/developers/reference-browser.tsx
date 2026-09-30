'use client';

import { Search, X } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import type { ApiField, ApiGroup, ApiOperation } from '@/lib/developers';

const METHOD_TONE: Record<string, string> = {
  get: 'text-[var(--up-ink-3)]',
  delete: 'text-[var(--up-danger-ink)]',
};

function Fields({ legend, fields }: { legend: string; fields: (ApiField & { in?: string })[] }) {
  if (fields.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="up-legend">{legend}</span>
      <dl className="grid gap-x-5 gap-y-2 text-[0.875rem] sm:grid-cols-[minmax(8rem,max-content)_1fr]">
        {fields.map((field) => (
          <div key={`${field.in ?? 'body'}-${field.name}`} className="contents">
            <dt className="up-code flex items-baseline gap-1.5 text-[0.8125rem] break-all">
              {field.name}
              {field.required && (
                <span className="text-[0.6875rem] font-[600] tracking-[0.06em] text-[var(--up-ink-3)] uppercase">requis</span>
              )}
            </dt>
            <dd className="min-w-0 pb-1 text-[var(--up-ink-2)] max-sm:mb-1.5">
              <span className="up-code text-[0.8125rem] break-words text-[var(--up-ink-3)]">{field.type}</span>
              {field.in === 'path' && <span> · dans le chemin</span>}
              {field.description && <span> · {field.description}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Operation({ operation }: { operation: ApiOperation }) {
  return (
    <article id={operation.anchor} className="flex scroll-mt-24 flex-col gap-4 px-5 py-6 sm:px-7">
      <header className="flex flex-col gap-2">
        <a href={`#${operation.anchor}`} className="group flex min-w-0 items-baseline gap-3 no-underline">
          <span
            className={`w-14 shrink-0 text-[0.6875rem] font-[650] tracking-[0.08em] uppercase ${METHOD_TONE[operation.method] ?? 'text-[var(--up-ink)]'}`}
          >
            {operation.method}
          </span>
          <span className="up-code min-w-0 text-[0.9375rem] break-all text-[var(--up-ink)] group-hover:underline group-hover:decoration-[var(--up-line-strong)] group-hover:underline-offset-4">
            {operation.path}
          </span>
        </a>
        {operation.summary && <h3 className="up-heading text-[1.0625rem] sm:pl-[4.25rem]">{operation.summary}</h3>}
      </header>
      <div className="flex flex-col gap-4 sm:pl-[4.25rem]">
        {operation.description && <p className="max-w-[72ch] text-[0.9375rem] leading-[1.6] text-[var(--up-ink-2)]">{operation.description}</p>}
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[0.875rem]">
          <span className="up-legend">Accès</span>
          <span className="up-code text-[0.8125rem]">{operation.access}</span>
        </p>
        <Fields legend="Paramètres" fields={operation.params} />
        <Fields legend="Corps JSON" fields={operation.body} />
      </div>
    </article>
  );
}

function matches(operation: ApiOperation, needle: string): boolean {
  return `${operation.method} ${operation.path} ${operation.summary ?? ''} ${operation.description ?? ''}`
    .toLowerCase()
    .includes(needle);
}

export function ReferenceBrowser({ groups }: { groups: ApiGroup[] }) {
  const [query, setQuery] = useState('');
  const needle = useDeferredValue(query.trim().toLowerCase());
  const shown = groups
    .map((group) => ({ ...group, operations: needle ? group.operations.filter((op) => matches(op, needle)) : group.operations }))
    .filter((group) => group.operations.length > 0);
  const total = shown.reduce((sum, group) => sum + group.operations.length, 0);

  const nav = (api: ApiGroup['api'], legend: string) => (
    <div className="flex flex-col gap-1">
      <span className="up-legend px-3 pb-1">{legend}</span>
      {shown
        .filter((group) => group.api === api)
        .map((group) => (
          <a
            key={group.slug}
            href={`#${group.slug}`}
            className="flex h-9 items-center justify-between rounded-[0.7rem] px-3 text-[0.875rem] font-[560] text-[var(--up-ink-2)] no-underline transition-colors hover:bg-[var(--up-surface-2)] hover:text-[var(--up-ink)]"
          >
            {group.tag}
            <span className="tabular-nums text-[0.75rem] font-[500] text-[var(--up-ink-3)]">{group.operations.length}</span>
          </a>
        ))}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
      <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
        <label className="relative flex items-center">
          <span className="sr-only">Chercher une route</span>
          <Search aria-hidden className="pointer-events-none absolute left-3.5 size-4 text-[var(--up-ink-3)]" strokeWidth={1.8} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="products, stock, checkout…"
            className="up-field pr-10 pl-10 text-[0.9375rem]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Effacer la recherche"
              className="absolute right-1.5 inline-flex size-8 items-center justify-center rounded-lg text-[var(--up-ink-3)] hover:bg-[var(--up-surface-3)] hover:text-[var(--up-ink)]"
            >
              <X className="size-4" strokeWidth={1.8} />
            </button>
          )}
        </label>
        <nav aria-label="Thèmes de l’API" className="flex flex-col gap-5 max-lg:hidden">
          {nav('storefront', 'Vitrine · pk_')}
          {nav('admin', 'Administration · sk_')}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col gap-10">
        {shown.length === 0 && (
          <div className="up-panel flex flex-col gap-1 px-6 py-8">
            <p className="up-heading">Aucune route ne correspond à « {query.trim()} »</p>
            <p className="text-[var(--up-ink-2)]">Cherchez un chemin (products, inventory), une méthode (post) ou un mot (commande).</p>
          </div>
        )}
        {needle && shown.length > 0 && (
          <p className="text-[0.875rem] text-[var(--up-ink-2)]" aria-live="polite">
            <span className="tabular-nums">{total}</span> route{total > 1 ? 's' : ''} pour « {query.trim()} »
          </p>
        )}
        {shown.map((group) => (
          <section key={group.slug} id={group.slug} aria-labelledby={`${group.slug}-titre`} className="flex scroll-mt-24 flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id={`${group.slug}-titre`} className="up-heading text-[1.375rem]">
                {group.tag}
              </h2>
              <span className="up-code text-[0.8125rem] text-[var(--up-ink-3)]">
                {group.api === 'storefront' ? '/storefront/v1 · pk_' : '/api/v1 · sk_'}
              </span>
            </div>
            <div className="up-panel flex flex-col divide-y divide-[var(--up-line)]">
              {group.operations.map((operation) => (
                <Operation key={operation.id} operation={operation} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
