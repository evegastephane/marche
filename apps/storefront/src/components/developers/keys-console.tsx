'use client';

import { ClerkProvider, SignInButton, useAuth, useClerk, useOrganization, useOrganizationList } from '@clerk/react';
import { frFR } from '@clerk/localizations';
import {
  API_SCOPE_RESOURCE_LABELS,
  API_SCOPE_RESOURCES,
  type ApiKeyDto,
  type ApiKeyKind,
  type ApiScope,
  type ApiScopeResource,
  type CreatedApiKeyDto,
  type CreateApiKeyInput,
} from '@marche/contracts';
import { Ban, KeyRound, LogOut, Plus, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { CopyKey } from './code-block';

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const PUBLISHABLE = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const EASE = [0.16, 1, 0.3, 1] as const;
const GLIDE = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } as const;

/** Habillage des fenêtres Clerk : les jetons --up-* du portail (clair ou sombre). */
const appearance = {
  options: { unsafe_disableDevelopmentModeWarnings: true },
  variables: {
    colorPrimary: 'var(--up-accent)',
    colorPrimaryForeground: 'var(--up-on-accent)',
    colorDanger: 'var(--up-danger)',
    colorForeground: 'var(--up-ink)',
    colorMutedForeground: 'var(--up-ink-2)',
    colorMuted: 'var(--up-surface-2)',
    colorBackground: 'var(--up-surface)',
    colorInput: 'var(--up-surface-2)',
    colorInputForeground: 'var(--up-ink)',
    colorBorder: 'var(--up-line-strong)',
    colorRing: 'var(--up-ink)',
    colorNeutral: 'var(--up-ink)',
    colorModalBackdrop: 'var(--up-overlay)',
    fontFamily: 'inherit',
    borderRadius: '0.7rem',
  },
};

// ───────────── Appels à l'API avec la session Upsell ─────────────

class PortalError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  FORBIDDEN: 'Seuls le propriétaire et les administrateurs de la boutique gèrent ses clés.',
  UNAUTHENTICATED: 'Votre session a expiré : reconnectez-vous.',
  STORE_REQUIRED: 'Choisissez d’abord une boutique.',
};

function useApi() {
  const { getToken } = useAuth();
  return useCallback(
    async <T,>(method: string, path: string, body?: unknown): Promise<T> => {
      const token = await getToken();
      let response: Response;
      try {
        response = await fetch(`${API}${path}`, {
          method,
          headers: { Authorization: `Bearer ${token ?? ''}`, ...(body ? { 'content-type': 'application/json' } : {}) },
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch {
        throw new PortalError(0, 'NETWORK', `L’API ne répond pas (${API}).`);
      }
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as {
          code?: string;
          detail?: string;
          errors?: { path: string; message: string }[];
        } | null;
        const code = problem?.code ?? 'INTERNAL_ERROR';
        throw new PortalError(
          response.status,
          code,
          MESSAGES[code] ?? problem?.detail ?? 'Une erreur est survenue.',
          Object.fromEntries((problem?.errors ?? []).map((error) => [error.path, error.message])),
        );
      }
      return (await response.json()) as T;
    },
    [getToken],
  );
}

function relative(iso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(Math.round(hours / 24), 'day');
}

// ───────────── Petites pièces de l'instrument ─────────────

/** Sélecteur à glissière : rail en creux, curseur qui glisse. */
function Rail<T extends string>({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  items: { value: T; label: string }[];
}) {
  const [group] = useState(() => Math.random().toString(36).slice(2));
  return (
    <div role="group" aria-label={label} className="up-well up-rail self-start">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={`relative inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-[0.8125rem] font-[580] transition-colors max-md:h-10 ${
              active ? 'text-[var(--up-ink)]' : 'text-[var(--up-ink-2)] hover:text-[var(--up-ink)]'
            }`}
          >
            {active && <motion.span layoutId={`rail-${group}`} transition={GLIDE} className="up-knob absolute inset-0 rounded-lg" />}
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Fenêtre modale native : focus retenu, Échap pour fermer, fond voilé. */
function Sheet({ open, onClose, title, description, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className="m-auto max-h-[88dvh] w-[min(34rem,calc(100vw-1rem))] overflow-y-auto rounded-2xl bg-[var(--up-surface)] p-0 text-[var(--up-ink)] shadow-[0_24px_56px_-20px_rgb(16_17_21/0.32),0_0_0_1px_var(--up-line)] backdrop:bg-[var(--up-overlay)] max-sm:mb-2 max-sm:w-[calc(100vw-1rem)]"
      style={{ minHeight: 0 }}
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="up-heading text-[1.25rem]">{title}</h2>
            {description && <p className="text-[0.9375rem] text-[var(--up-ink-2)]">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="up-key -m-1.5 !size-10 !p-0" data-variant="ghost">
            <X strokeWidth={1.8} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** La clé s'imprime caractère par caractère dans l'afficheur, puis reste sélectionnable d'un clic. */
function KeyReadout({ value, legend }: { value: string; legend: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value.length : 0);
  useEffect(() => {
    if (reduce) return setShown(value.length);
    setShown(0);
    const step = Math.max(8, Math.floor(520 / value.length));
    const timer = setInterval(() => setShown((count) => Math.min(value.length, count + 1)), step);
    return () => clearInterval(timer);
  }, [value, reduce]);
  const done = shown >= value.length;
  return (
    <div className="up-lcd flex flex-col gap-2.5 rounded-2xl px-5 py-4">
      <span className="flex items-center gap-2.5">
        <span className="up-led" data-on={done} aria-hidden />
        <span className="up-legend">{legend}</span>
      </span>
      <output aria-label={legend} className="up-code block text-[0.9375rem] leading-snug break-all select-all sm:text-[1rem]">
        <span className="sr-only">{value}</span>
        <span aria-hidden>
          {value.slice(0, shown)}
          {!done && <span className="ml-px inline-block h-[1.05em] w-[0.55ch] translate-y-[0.15em] bg-[var(--up-accent)]" />}
        </span>
      </output>
    </div>
  );
}

// ───────────── Création d'une clé ─────────────

type Access = 'none' | 'read' | 'write';
const NO_ACCESS: Record<ApiScopeResource, Access> = { catalog: 'read', inventory: 'none', orders: 'none', customers: 'none' };

const KIND_TEXT: Record<ApiKeyKind, string> = {
  PUBLISHABLE: 'Pour un site ou une app qui s’exécute chez le client : lire le catalogue, remplir un panier, passer commande, seulement depuis les adresses déclarées.',
  SECRET: 'Pour un serveur (ERP, script, back-office) : agir sur la boutique avec les droits cochés. Elle ne doit jamais apparaître dans une page web.',
};

function CreateKey({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const api = useApi();
  const [kind, setKind] = useState<ApiKeyKind>('PUBLISHABLE');
  const [name, setName] = useState('');
  const [origins, setOrigins] = useState('');
  const [access, setAccess] = useState(NO_ACCESS);
  const [created, setCreated] = useState<CreatedApiKeyDto | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  const scopes = API_SCOPE_RESOURCES.flatMap((resource) =>
    access[resource] === 'none' ? [] : [`${resource}:${access[resource]}` as ApiScope],
  );

  const close = () => {
    onClose();
    setTimeout(() => {
      setKind('PUBLISHABLE');
      setName('');
      setOrigins('');
      setAccess(NO_ACCESS);
      setCreated(null);
      setError(null);
    }, 200);
  };

  const submit = async () => {
    setPending(true);
    setError(null);
    const input: CreateApiKeyInput =
      kind === 'PUBLISHABLE'
        ? { kind, name, allowedOrigins: origins.split(/[\n,]/).map((line) => line.trim()).filter(Boolean) }
        : { kind, name, scopes };
    try {
      setCreated(await api<CreatedApiKeyDto>('POST', '/api/v1/developers/api-keys', input));
      onCreated();
    } catch (caught) {
      const failure = caught instanceof PortalError ? caught : new PortalError(0, 'X', 'Une erreur est survenue.');
      const field = Object.entries(failure.fields).find(([path]) => path.startsWith('allowedOrigins') || path === 'name');
      setError(field ? { field: field[0].startsWith('allowed') ? 'origins' : 'name', message: field[1] } : { message: failure.message });
    } finally {
      setPending(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={created ? 'Votre clé est prête' : 'Nouvelle clé'}
      description={
        created
          ? created.kind === 'SECRET'
            ? 'Copiez-la maintenant : Upsell n’en garde qu’une empreinte, elle ne sera plus jamais affichée.'
            : 'Collez-la dans votre front. Vous la retrouverez à tout moment dans la liste.'
          : 'Une clé relie un site, une application ou un serveur à votre boutique.'
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {created ? (
          <motion.div key="cle" className="flex flex-col gap-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: EASE }}>
            <KeyReadout value={created.secret} legend={created.kind === 'SECRET' ? `${created.name} · secrète, montrée une fois` : `${created.name} · publique`} />
            <div className="flex flex-wrap justify-end gap-2">
              <CopyKey text={created.secret} label="Copier la clé" className="!h-10 !px-4 !text-[0.9375rem]" />
              <button type="button" className="up-key" data-variant="primary" onClick={close}>
                {created.kind === 'SECRET' ? 'J’ai copié la clé' : 'Terminé'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="flex flex-col gap-5"
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="flex flex-col gap-2.5">
              <Rail
                label="Sorte de clé"
                value={kind}
                onChange={setKind}
                items={[
                  { value: 'PUBLISHABLE', label: 'Publique · pk_' },
                  { value: 'SECRET', label: 'Secrète · sk_' },
                ]}
              />
              <p className="text-[0.875rem] text-[var(--up-ink-2)]">{KIND_TEXT[kind]}</p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8125rem] font-[600]">Nom</span>
              <input
                className="up-field"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={kind === 'SECRET' ? 'Synchro ERP' : 'Site Next.js'}
                maxLength={60}
                required
                aria-invalid={error?.field === 'name' || undefined}
              />
              {error?.field === 'name' && <span className="text-[0.8125rem] font-[560] text-[var(--up-danger-ink)]">{error.message}</span>}
            </label>

            {kind === 'PUBLISHABLE' ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-[0.8125rem] font-[600]">Adresses autorisées</span>
                <textarea
                  className="up-field up-code text-[0.875rem]"
                  rows={3}
                  value={origins}
                  onChange={(event) => setOrigins(event.target.value)}
                  placeholder={'https://www.maboutique.cm\nhttp://localhost:3000'}
                  aria-invalid={error?.field === 'origins' || undefined}
                />
                <span className={`text-[0.8125rem] ${error?.field === 'origins' ? 'font-[560] text-[var(--up-danger-ink)]' : 'text-[var(--up-ink-2)]'}`}>
                  {error?.field === 'origins'
                    ? error.message
                    : 'Une par ligne, sans chemin. http seulement pour localhost. Un navigateur sur une autre adresse est refusé.'}
                </span>
              </label>
            ) : (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-[0.8125rem] font-[600]">Droits</legend>
                <ul className="up-panel flex flex-col divide-y divide-[var(--up-line)]">
                  {API_SCOPE_RESOURCES.map((resource) => (
                    <li key={resource} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="flex min-w-0 flex-col">
                        <span className="font-[600]">{API_SCOPE_RESOURCE_LABELS[resource].label}</span>
                        <span className="text-[0.8125rem] text-[var(--up-ink-2)]">{API_SCOPE_RESOURCE_LABELS[resource].hint}</span>
                      </span>
                      <Rail
                        label={`Droits : ${API_SCOPE_RESOURCE_LABELS[resource].label}`}
                        value={access[resource]}
                        onChange={(value) => setAccess((current) => ({ ...current, [resource]: value }))}
                        items={[
                          { value: 'none', label: 'Aucun' },
                          { value: 'read', label: 'Lecture' },
                          { value: 'write', label: 'Écriture' },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
                <span className="text-[0.8125rem] text-[var(--up-ink-2)]">
                  L’écriture comprend la lecture. Boutique, site, campagnes et clés restent au tableau de bord.
                </span>
              </fieldset>
            )}

            {error && !error.field && (
              <p role="alert" className="rounded-xl bg-[var(--up-danger-soft)] px-4 py-3 text-[0.875rem] font-[560] text-[var(--up-danger-ink)]">
                {error.message}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="up-key" data-variant="ghost" onClick={close}>
                Annuler
              </button>
              <button type="submit" className="up-key" data-variant="primary" disabled={pending || !name.trim() || (kind === 'SECRET' && scopes.length === 0)}>
                {pending ? 'Création…' : 'Créer la clé'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

// ───────────── Liste des clés ─────────────

function scopeSummary(key: ApiKeyDto): string {
  return API_SCOPE_RESOURCES.flatMap((resource) => {
    const label = API_SCOPE_RESOURCE_LABELS[resource].label;
    if (key.scopes.includes(`${resource}:write`)) return [`${label} : écriture`];
    if (key.scopes.includes(`${resource}:read`)) return [`${label} : lecture`];
    return [];
  }).join(' · ');
}

function KeyRow({ apiKey, onRevoke }: { apiKey: ApiKeyDto; onRevoke: () => void }) {
  const revoked = apiKey.revokedAt !== null;
  const detail =
    apiKey.kind === 'PUBLISHABLE'
      ? apiKey.allowedOrigins.join(' · ') || 'Aucune adresse déclarée : appels serveur seulement'
      : scopeSummary(apiKey);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={GLIDE}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className={`truncate font-[600] ${revoked ? 'text-[var(--up-ink-3)] line-through decoration-1' : ''}`}>{apiKey.name}</span>
          <span className="inline-flex items-center gap-2 text-[0.8125rem] font-[560] text-[var(--up-ink-2)]">
            <span className="up-led" data-on={!revoked} aria-hidden />
            {revoked ? 'Révoquée' : apiKey.kind === 'SECRET' ? 'Secrète' : 'Publique'}
          </span>
        </span>
        <span className="truncate text-[0.8125rem] text-[var(--up-ink-2)]">{detail}</span>
      </div>
      <div className="col-span-2 row-start-2 flex min-w-0 flex-col gap-0.5 md:col-span-1 md:row-start-auto">
        <span className="up-code truncate text-[0.8125rem]">{apiKey.hint}</span>
        <span className="text-[0.75rem] text-[var(--up-ink-3)] tabular-nums">
          {revoked && apiKey.revokedAt
            ? `Révoquée ${relative(apiKey.revokedAt)}`
            : apiKey.lastUsedAt
              ? `Dernier appel ${relative(apiKey.lastUsedAt)}`
              : 'Jamais utilisée'}
        </span>
      </div>
      <div className="col-start-2 row-start-1 flex items-center justify-end gap-1 md:col-start-auto md:row-start-auto">
        {apiKey.token && !revoked && <CopyKey text={apiKey.token} />}
        {!revoked && (
          <button type="button" className="up-key" data-variant="ghost" data-size="sm" onClick={onRevoke}>
            <Ban strokeWidth={1.8} aria-hidden />
            Révoquer
          </button>
        )}
      </div>
    </motion.li>
  );
}

function StoreKeys() {
  const api = useApi();
  const { organization } = useOrganization();
  const { signOut } = useClerk();
  const { userMemberships, setActive } = useOrganizationList({ userMemberships: { pageSize: 50 } });
  const [keys, setKeys] = useState<ApiKeyDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ApiKeyDto | null>(null);
  const [revokePending, setRevokePending] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setKeys(await api<ApiKeyDto[]>('GET', '/api/v1/developers/api-keys'));
    } catch (error) {
      setKeys(null);
      setLoadError(error instanceof Error ? error.message : 'Chargement impossible.');
    }
  }, [api]);

  useEffect(() => {
    setKeys(null);
    void load();
  }, [load, organization?.id]);

  const revoke = async () => {
    if (!revoking) return;
    setRevokePending(true);
    try {
      await api('POST', `/api/v1/developers/api-keys/${revoking.id}/revoke`);
      setRevoking(null);
      await load();
    } finally {
      setRevokePending(false);
    }
  };

  const active = keys?.filter((key) => !key.revokedAt).length;
  const stores = userMemberships.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Afficheur : la boutique branchée, ses deux portes, les clés en service. */}
      <section aria-label="Boutique et adresses de l’API" className="up-lcd grid overflow-hidden rounded-[1.25rem] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-2 border-[var(--up-display-line)] px-5 py-4 max-md:border-b md:border-r">
          <span className="up-legend">Boutique</span>
          {stores.length > 1 && setActive ? (
            <select
              aria-label="Changer de boutique"
              value={organization?.id ?? ''}
              onChange={(event) => void setActive({ organization: event.target.value })}
              className="-ml-1 w-full max-w-full cursor-pointer truncate rounded-lg bg-transparent px-1 py-0.5 text-[1.25rem] font-[650] tracking-[-0.015em] text-[var(--up-display-ink)] hover:bg-[var(--up-display-line)]"
            >
              {stores.map((membership) => (
                <option key={membership.organization.id} value={membership.organization.id}>
                  {membership.organization.name}
                </option>
              ))}
            </select>
          ) : (
            <span className="truncate text-[1.25rem] font-[650] tracking-[-0.015em]">{organization?.name}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-2 border-[var(--up-display-line)] px-5 py-4 max-md:border-b md:border-r">
          {[
            ['Vitrine · pk_', '/storefront/v1'],
            ['Administration · sk_', '/api/v1'],
          ].map(([legend, path]) => (
            <span key={legend} className="flex min-w-0 items-center gap-2.5">
              <span className="up-led" data-on={(active ?? 0) > 0} aria-hidden />
              <span className="up-code truncate text-[0.8125rem]">
                {API}
                {path}
              </span>
              <span className="up-legend shrink-0 max-sm:hidden">{legend}</span>
            </span>
          ))}
        </div>
        <div className="flex items-end justify-between gap-6 px-5 py-4 md:flex-col md:items-start md:justify-center">
          <span className="up-legend">Clés actives</span>
          <span className="text-[2rem] leading-none font-light tracking-[-0.02em] tabular-nums">{active ?? '–'}</span>
        </div>
      </section>

      <section className="up-panel overflow-hidden" aria-labelledby="cles-titre">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
          <h2 id="cles-titre" className="up-heading text-[1rem]">
            Clés <span className="ml-1 text-[0.875rem] font-[500] text-[var(--up-ink-3)] tabular-nums">{keys?.length ?? ''}</span>
          </h2>
          <div className="flex items-center gap-2">
            <button type="button" className="up-key" data-variant="ghost" data-size="sm" onClick={() => void signOut()}>
              <LogOut strokeWidth={1.8} aria-hidden />
              Se déconnecter
            </button>
            <button type="button" className="up-key" data-variant="primary" onClick={() => setCreating(true)}>
              <Plus strokeWidth={1.8} aria-hidden />
              Nouvelle clé
            </button>
          </div>
        </header>

        {loadError ? (
          <div className="border-t border-[var(--up-line)] p-5">
            <p role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[var(--up-danger-soft)] px-4 py-3 text-[0.875rem] font-[560] text-[var(--up-danger-ink)]">
              {loadError}
              <button type="button" className="font-[650] underline" onClick={() => void load()}>
                Réessayer
              </button>
            </p>
          </div>
        ) : keys === null ? (
          <div className="flex flex-col gap-3 border-t border-[var(--up-line)] p-5" aria-busy>
            <span className="h-12 animate-pulse rounded-lg bg-[var(--up-surface-2)]" />
            <span className="h-12 animate-pulse rounded-lg bg-[var(--up-surface-2)]" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-start gap-4 border-t border-[var(--up-line)] px-5 py-9 sm:flex-row sm:items-center sm:gap-5">
            <span className="up-well inline-flex size-12 shrink-0 items-center justify-center rounded-xl">
              <KeyRound className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="flex max-w-[52ch] flex-col gap-1">
              <p className="up-heading">Aucune clé pour l’instant</p>
              <p className="text-[var(--up-ink-2)]">
                Une clé publique branche un site sur votre catalogue ; une clé secrète laisse un serveur gérer produits, stock et
                commandes.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--up-line)] border-t border-[var(--up-line)]">
            {keys.map((apiKey) => (
              <KeyRow key={apiKey.id} apiKey={apiKey} onRevoke={() => setRevoking(apiKey)} />
            ))}
          </ul>
        )}
      </section>

      <CreateKey open={creating} onClose={() => setCreating(false)} onCreated={() => void load()} />

      <Sheet
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        title="Révoquer cette clé ?"
        description={
          revoking ? `« ${revoking.name} » cessera de fonctionner tout de suite, pour toujours : les applications qui l’utilisent recevront une erreur 401.` : undefined
        }
      >
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="up-key" data-variant="ghost" onClick={() => setRevoking(null)}>
            Garder
          </button>
          <button type="button" className="up-key" data-variant="danger" disabled={revokePending} onClick={() => void revoke()}>
            {revokePending ? 'Révocation…' : 'Révoquer'}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

// ───────────── Portes d'entrée : connexion, choix de la boutique ─────────────

function Gate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: EASE }}
      className="up-panel flex flex-col gap-5 p-6 sm:max-w-[36rem] sm:p-8"
    >
      <h2 className="up-heading text-[1.375rem]">{title}</h2>
      {children}
    </motion.section>
  );
}

function Console() {
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const { userMemberships, setActive, isLoaded: listLoaded } = useOrganizationList({ userMemberships: { pageSize: 50 } });

  if (!isLoaded) {
    return <span className="block h-40 animate-pulse rounded-2xl bg-[var(--up-surface-2)]" aria-busy aria-label="Chargement" />;
  }
  if (!isSignedIn) {
    return (
      <Gate title="Connectez-vous avec votre compte Upsell">
        <p className="text-[var(--up-ink-2)]">
          Le même compte que le tableau de bord. Vous verrez les clés des boutiques que vous administrez.
        </p>
        <SignInButton mode="modal">
          <button type="button" className="up-key self-start" data-variant="primary" data-size="lg">
            Se connecter
          </button>
        </SignInButton>
      </Gate>
    );
  }
  if (!orgId) {
    const stores = userMemberships.data ?? [];
    return (
      <Gate title="Choisissez une boutique">
        {!listLoaded ? (
          <span className="block h-24 animate-pulse rounded-xl bg-[var(--up-surface-2)]" aria-busy />
        ) : stores.length === 0 ? (
          <p className="text-[var(--up-ink-2)]">Ce compte n’administre encore aucune boutique : créez-la depuis le tableau de bord.</p>
        ) : (
          <ul className="up-panel flex flex-col divide-y divide-[var(--up-line)] overflow-hidden">
            {stores.map((membership) => (
              <li key={membership.organization.id}>
                <button
                  type="button"
                  onClick={() => void setActive?.({ organization: membership.organization.id })}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-[var(--up-surface-2)]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="up-well inline-flex size-8 shrink-0 items-center justify-center rounded-[0.55rem] text-[0.8125rem] font-[650]">
                      {membership.organization.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate font-[600]">{membership.organization.name}</span>
                  </span>
                  <span className="text-[0.8125rem] text-[var(--up-ink-3)]">{membership.role === 'org:admin' ? 'Administrateur' : 'Membre'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Gate>
    );
  }
  return <StoreKeys />;
}

export function KeysConsole() {
  if (!PUBLISHABLE) {
    return (
      <p role="alert" className="rounded-xl bg-[var(--up-danger-soft)] px-5 py-4 text-[var(--up-danger-ink)]">
        Connexion indisponible : NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY manque dans apps/storefront/.env.local.
      </p>
    );
  }
  return (
    <ClerkProvider publishableKey={PUBLISHABLE} localization={frFR} appearance={appearance}>
      <Console />
    </ClerkProvider>
  );
}
