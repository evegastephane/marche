'use client';

import { MotionConfig } from 'motion/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ARRIVALS,
  type DemoOrder,
  PRODUCTS,
  productById,
  SEED_ORDERS,
  type TemplateId,
} from './data';

/**
 * Une seule boutique d'exemple pour toute la page : le dashboard, le site, la caisse et WhatsApp lisent et
 * écrivent le même stock et les mêmes commandes, comme dans Upsell.
 */
interface Home {
  storeName: string;
  setStoreName: (name: string) => void;
  stock: Record<string, number>;
  adjustStock: (productId: string, delta: number) => void;
  orders: DemoOrder[];
  /** Fait tomber la prochaine commande d'exemple ; faux quand il n'y en a plus. */
  receiveOrder: () => boolean;
  shipOrder: (number: number) => void;
  markPaid: (number: number) => void;
  /** Vente au comptoir : sort du stock, entre dans les commandes, payée et remise. */
  sellAtCounter: (lines: { productId: string; quantity: number }[]) => number;
  /** Chiffre d'affaires ajouté pendant la visite (commandes reçues, ventes en caisse). */
  extraRevenue: number;
  siteLive: boolean;
  setSiteLive: (live: boolean) => void;
  template: TemplateId;
  setTemplate: (template: TemplateId) => void;
}

const HomeContext = createContext<Home | null>(null);

/** Les roues du décor tournent d'un cran à chaque événement de la boutique d'exemple. */
export const TICK_EVENT = 'upsell:tick';
export function emitTick(strength = 1) {
  window.dispatchEvent(new CustomEvent(TICK_EVENT, { detail: strength }));
}

function orderTotal(order: Pick<DemoOrder, 'productId' | 'quantity'>): number {
  return productById(order.productId).price * order.quantity;
}

export function HomeProvider({ children }: { children: ReactNode }) {
  const [storeName, setStoreName] = useState('');
  const [stock, setStock] = useState<Record<string, number>>(() =>
    Object.fromEntries(PRODUCTS.map((product) => [product.id, product.stock])),
  );
  const [orders, setOrders] = useState<DemoOrder[]>(SEED_ORDERS);
  const [extraRevenue, setExtraRevenue] = useState(0);
  const [siteLive, setSiteLive] = useState(false);
  const [template, setTemplate] = useState<TemplateId>('default');
  const nextArrival = useRef(0);
  const nextNumber = useRef(1044);
  // Lu par les rappels sans les recréer à chaque vente.
  const stockRef = useRef(stock);
  stockRef.current = stock;

  const adjustStock = useCallback((productId: string, delta: number) => {
    setStock((current) => ({
      ...current,
      [productId]: Math.max(0, (current[productId] ?? 0) + delta),
    }));
    emitTick(0.5);
  }, []);

  const receiveOrder = useCallback(() => {
    const arrival = ARRIVALS[nextArrival.current];
    if (!arrival) return false;
    // Le stock tranche : une commande n'arrive que si l'article est encore disponible.
    if ((stockRef.current[arrival.productId] ?? 0) < arrival.quantity) {
      nextArrival.current += 1;
      return true;
    }
    nextArrival.current += 1;
    const order: DemoOrder = {
      ...arrival,
      number: nextNumber.current++,
      minutesAgo: 0,
    };
    setOrders((current) => [order, ...current]);
    setStock((current) => ({
      ...current,
      [order.productId]: (current[order.productId] ?? 0) - order.quantity,
    }));
    setExtraRevenue((value) => value + orderTotal(order));
    emitTick(1);
    return true;
  }, []);

  const shipOrder = useCallback((number: number) => {
    setOrders((current) =>
      current.map((order) =>
        order.number === number ? { ...order, status: 'FULFILLED' } : order,
      ),
    );
    emitTick(0.6);
  }, []);

  const markPaid = useCallback((number: number) => {
    setOrders((current) =>
      current.map((order) =>
        order.number === number ? { ...order, payment: 'PAID' } : order,
      ),
    );
  }, []);

  const sellAtCounter = useCallback(
    (lines: { productId: string; quantity: number }[]) => {
      const number = nextNumber.current++;
      const first = lines[0];
      const total = lines.reduce((sum, line) => sum + orderTotal(line), 0);
      if (first) {
        const order: DemoOrder = {
          number,
          customer: 'Comptoir',
          productId: first.productId,
          quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
          payment: 'PAID',
          status: 'FULFILLED',
          source: 'Caisse',
          minutesAgo: 0,
          total,
        };
        setOrders((current) => [order, ...current]);
      }
      setStock((current) => {
        const next = { ...current };
        for (const line of lines)
          next[line.productId] = Math.max(
            0,
            (next[line.productId] ?? 0) - line.quantity,
          );
        return next;
      });
      setExtraRevenue((value) => value + total);
      emitTick(1);
      return number;
    },
    [],
  );

  const value = useMemo<Home>(
    () => ({
      storeName,
      setStoreName,
      stock,
      adjustStock,
      orders,
      receiveOrder,
      shipOrder,
      markPaid,
      sellAtCounter,
      extraRevenue,
      siteLive,
      setSiteLive,
      template,
      setTemplate,
    }),
    [
      storeName,
      stock,
      adjustStock,
      orders,
      receiveOrder,
      shipOrder,
      markPaid,
      sellAtCounter,
      extraRevenue,
      siteLive,
      template,
    ],
  );

  return (
    <MotionConfig reducedMotion="user">
      <HomeContext.Provider value={value}>{children}</HomeContext.Provider>
    </MotionConfig>
  );
}

export function useHome(): Home {
  const context = useContext(HomeContext);
  if (!context) throw new Error('useHome hors de HomeProvider');
  return context;
}

/** Nom affiché par la boutique d'exemple : celui que le visiteur a tapé, sinon « Chez Awa ». */
export function useShownName(): string {
  const { storeName } = useHome();
  return storeName.trim() || 'Chez Awa';
}
