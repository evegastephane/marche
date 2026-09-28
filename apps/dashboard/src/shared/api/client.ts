import type { ErrorCode, Problem } from '@marche/contracts';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

/** Messages destinés au marchand, par code métier stable de l'API. */
const MESSAGES: Partial<Record<ErrorCode, string>> = {
  VALIDATION_FAILED: 'Certains champs sont à corriger.',
  NOT_FOUND: 'Cet élément n’existe plus.',
  SKU_TAKEN: 'Ce SKU est déjà utilisé par une autre variante.',
  SLUG_TAKEN: 'Cette adresse est déjà prise.',
  STORE_SLUG_TAKEN: 'Cette adresse de boutique est déjà prise. Essayez-en une autre.',
  CONCURRENT_MODIFICATION: 'Quelqu’un a modifié cet élément entre-temps. Rechargez la page puis recommencez.',
  PRODUCT_NOT_PUBLISHABLE: 'Ce produit ne peut pas être publié : il lui faut un titre, une variante et un prix.',
  INSUFFICIENT_STOCK: 'Stock insuffisant pour au moins un article.',
  STOCK_BELOW_RESERVED: 'Le stock ne peut pas descendre sous les quantités réservées par des commandes.',
  INVALID_ORDER_TRANSITION: 'Cette action n’est plus possible pour cette commande.',
  SITE_ALREADY_EXISTS: 'Votre boutique a déjà un site.',
  STORE_REQUIRED: 'Choisissez d’abord une boutique.',
  UNAUTHENTICATED: 'Votre session a expiré. Reconnectez-vous.',
  FORBIDDEN: 'Votre rôle ne permet pas cette action. Demandez au propriétaire de la boutique.',
  RATE_LIMITED: 'Trop de demandes d’un coup. Patientez quelques secondes.',
  WHATSAPP_NOT_CONFIGURED: 'L’envoi WhatsApp n’est pas encore activé sur Upsell.',
  NO_RECIPIENTS: 'Aucun client n’a encore accepté de recevoir vos nouveautés sur WhatsApp.',
  PRODUCT_NOT_ACTIVE: 'Mettez ce produit en vente avant de l’envoyer à vos clients.',
  INTERNAL_ERROR: 'Le serveur a rencontré un problème. Réessayez dans un instant.',
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly problem: Problem | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Erreurs de champ renvoyées par la validation (chemin → message). */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries((this.problem?.errors ?? []).map((e) => [e.path, e.message]));
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    let problem: Problem | null = null;
    try {
      problem = (await res.json()) as Problem;
    } catch {
      // réponse non JSON (proxy, panne réseau)
    }
    const code = problem?.code ?? (res.status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL_ERROR');
    const message = MESSAGES[code as ErrorCode] ?? problem?.detail ?? problem?.title ?? 'Une erreur est survenue.';
    return new ApiError(res.status, code, message, problem);
  }
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export type ApiRequest = <T>(method: string, path: string, options?: RequestOptions) => Promise<T>;

function toQuery(query: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function createApiClient(getToken: () => Promise<string | null>): ApiRequest {
  return async function request<T>(method: string, path: string, options: RequestOptions = {}) {
    const token = await getToken();
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}${toQuery(options.query)}`, {
        method,
        signal: options.signal,
        headers: {
          ...(options.body !== undefined && { 'content-type': 'application/json' }),
          ...(token && { authorization: `Bearer ${token}` }),
          ...(options.idempotencyKey && { 'idempotency-key': options.idempotencyKey }),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError(0, 'NETWORK', 'Connexion impossible. Vérifiez votre réseau puis réessayez.', null);
    }
    if (!res.ok) throw await ApiError.fromResponse(res);
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  };
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Une erreur est survenue.';
}
