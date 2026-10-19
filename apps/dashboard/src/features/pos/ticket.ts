import {
  MAX_LINE_QUANTITY,
  type PosCustomerInput,
  type PosDiscountInput,
  type PosQuoteInput,
  type PosSaleInput,
  type PosVariantDto,
} from '@marche/contracts';
import { useCallback, useEffect, useMemo, useReducer } from 'react';

/** Ligne du ticket : un article du catalogue (avec ses IMEI s'il est suivi à l'unité). */
export interface TicketLine {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  priceAmount: number;
  quantity: number;
  tracksUnits: boolean;
  /** IMEI des appareils remis : un par exemplaire. */
  serials: string[];
  available: number | null;
  imageUrl: string | null;
}

/** Article divers, hors catalogue, au prix saisi. */
export interface TicketCustomLine {
  id: string;
  title: string;
  unitPriceAmount: number;
  quantity: number;
}

export interface TicketCustomer extends PosCustomerInput {
  /** Nom affiché (client retrouvé ou saisi). */
  label: string;
}

export interface Ticket {
  lines: TicketLine[];
  customLines: TicketCustomLine[];
  customer: TicketCustomer | null;
  discount: PosDiscountInput | null;
  note: string;
}

const EMPTY: Ticket = { lines: [], customLines: [], customer: null, discount: null, note: '' };

type Action =
  | { type: 'add'; variant: PosVariantDto; serial?: string | null }
  | { type: 'quantity'; variantId: string; quantity: number }
  | { type: 'removeSerial'; variantId: string; serial: string }
  | { type: 'remove'; variantId: string }
  | { type: 'addCustom'; line: Omit<TicketCustomLine, 'id'> }
  | { type: 'removeCustom'; id: string }
  | { type: 'customer'; customer: TicketCustomer | null }
  | { type: 'discount'; discount: PosDiscountInput | null }
  | { type: 'note'; note: string }
  | { type: 'reset' }
  | { type: 'load'; ticket: Ticket };

export type AddResult = 'added' | 'duplicate-serial' | 'out-of-stock';

function reducer(ticket: Ticket, action: Action): Ticket {
  switch (action.type) {
    case 'add': {
      const { variant, serial } = action;
      const existing = ticket.lines.find((line) => line.variantId === variant.variantId);
      if (existing) {
        if (variant.tracksUnits) {
          if (!serial || existing.serials.includes(serial)) return ticket;
          return {
            ...ticket,
            lines: ticket.lines.map((line) =>
              line.variantId === variant.variantId ? { ...line, serials: [...line.serials, serial], quantity: line.quantity + 1 } : line,
            ),
          };
        }
        return {
          ...ticket,
          lines: ticket.lines.map((line) =>
            line.variantId === variant.variantId ? { ...line, quantity: Math.min(line.quantity + 1, MAX_LINE_QUANTITY) } : line,
          ),
        };
      }
      if (variant.tracksUnits && !serial) return ticket;
      return {
        ...ticket,
        lines: [
          ...ticket.lines,
          {
            variantId: variant.variantId,
            productTitle: variant.productTitle,
            variantTitle: variant.variantTitle,
            sku: variant.sku,
            priceAmount: variant.priceAmount,
            quantity: 1,
            tracksUnits: variant.tracksUnits,
            serials: serial ? [serial] : [],
            available: variant.available,
            imageUrl: variant.imageUrl,
          },
        ],
      };
    }
    case 'quantity':
      return {
        ...ticket,
        lines: ticket.lines.map((line) =>
          line.variantId === action.variantId && !line.tracksUnits
            ? { ...line, quantity: Math.min(Math.max(action.quantity, 1), MAX_LINE_QUANTITY) }
            : line,
        ),
      };
    case 'removeSerial':
      return {
        ...ticket,
        lines: ticket.lines.flatMap((line) => {
          if (line.variantId !== action.variantId) return [line];
          const serials = line.serials.filter((serial) => serial !== action.serial);
          return serials.length ? [{ ...line, serials, quantity: serials.length }] : [];
        }),
      };
    case 'remove':
      return { ...ticket, lines: ticket.lines.filter((line) => line.variantId !== action.variantId) };
    case 'addCustom':
      return { ...ticket, customLines: [...ticket.customLines, { ...action.line, id: crypto.randomUUID() }] };
    case 'removeCustom':
      return { ...ticket, customLines: ticket.customLines.filter((line) => line.id !== action.id) };
    case 'customer':
      return { ...ticket, customer: action.customer };
    case 'discount':
      return { ...ticket, discount: action.discount };
    case 'note':
      return { ...ticket, note: action.note };
    case 'reset':
      return EMPTY;
    case 'load':
      return action.ticket;
  }
}

function storageKey(sessionId: string): string {
  return `upsell:caisse:${sessionId}`;
}

function readStored(sessionId: string): Ticket {
  try {
    const raw = window.localStorage.getItem(storageKey(sessionId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Ticket>;
    return {
      lines: Array.isArray(parsed.lines) ? parsed.lines : [],
      customLines: Array.isArray(parsed.customLines) ? parsed.customLines : [],
      customer: parsed.customer ?? null,
      discount: parsed.discount ?? null,
      note: typeof parsed.note === 'string' ? parsed.note : '',
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Ticket en cours d'une caisse. Il survit à un rechargement de la page (stockage du navigateur,
 * propre à la session de caisse) : une coupure ne fait pas perdre la vente commencée.
 */
export function useTicket(sessionId: string) {
  const [ticket, dispatch] = useReducer(reducer, sessionId, readStored);

  useEffect(() => {
    dispatch({ type: 'load', ticket: readStored(sessionId) });
  }, [sessionId]);

  useEffect(() => {
    try {
      if (ticket === EMPTY) window.localStorage.removeItem(storageKey(sessionId));
      else window.localStorage.setItem(storageKey(sessionId), JSON.stringify(ticket));
    } catch {
      // stockage indisponible (navigation privée) : le ticket reste en mémoire
    }
  }, [ticket, sessionId]);

  const add = useCallback(
    (variant: PosVariantDto, serial?: string | null): AddResult => {
      const existing = ticket.lines.find((line) => line.variantId === variant.variantId);
      if (serial && existing?.serials.includes(serial)) return 'duplicate-serial';
      const inTicket = existing?.quantity ?? 0;
      if (variant.available !== null && inTicket + 1 > variant.available) return 'out-of-stock';
      dispatch({ type: 'add', variant, serial });
      return 'added';
    },
    [ticket.lines],
  );

  const itemsCount = ticket.lines.reduce((sum, line) => sum + line.quantity, 0) + ticket.customLines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal =
    ticket.lines.reduce((sum, line) => sum + line.priceAmount * line.quantity, 0) +
    ticket.customLines.reduce((sum, line) => sum + line.unitPriceAmount * line.quantity, 0);

  const quoteInput = useMemo<PosQuoteInput | null>(
    () =>
      itemsCount === 0
        ? null
        : {
            lines: ticket.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
            customLines: ticket.customLines.map((line) => ({
              title: line.title,
              variantTitle: '',
              unitPriceAmount: line.unitPriceAmount,
              quantity: line.quantity,
            })),
            ...(ticket.discount ? { discount: ticket.discount } : {}),
          },
    [ticket, itemsCount],
  );

  /** Vente prête à encaisser, sans les paiements. */
  const saleInput = useCallback(
    (sessionId: string): Omit<PosSaleInput, 'payments'> => ({
      sessionId,
      lines: ticket.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity, serials: line.serials })),
      customLines: ticket.customLines.map((line) => ({
        title: line.title,
        variantTitle: '',
        unitPriceAmount: line.unitPriceAmount,
        quantity: line.quantity,
      })),
      ...(ticket.discount ? { discount: ticket.discount } : {}),
      ...(ticket.customer
        ? {
            customer: {
              ...(ticket.customer.phone ? { phone: ticket.customer.phone } : {}),
              ...(ticket.customer.email ? { email: ticket.customer.email } : {}),
              ...(ticket.customer.firstName ? { firstName: ticket.customer.firstName } : {}),
              ...(ticket.customer.lastName ? { lastName: ticket.customer.lastName } : {}),
              ...(ticket.customer.whatsappOptIn ? { whatsappOptIn: true } : {}),
            },
          }
        : {}),
      ...(ticket.note.trim() ? { note: ticket.note.trim() } : {}),
    }),
    [ticket],
  );

  return { ticket, dispatch, add, itemsCount, subtotal, quoteInput, saleInput };
}

export type TicketApi = ReturnType<typeof useTicket>;
