import { Injectable } from '@nestjs/common';
import {
  allocatePayments,
  type CashMovementInput,
  type ClosePosSessionInput,
  enabledPaymentMethods,
  type OpenPosSessionInput,
  type OrderDiscount,
  type Paginated,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type PosCreditDto,
  posDiscountAmount,
  type PosLookupDto,
  type PosQuoteDto,
  type PosQuoteInput,
  type PosReturnInput,
  type PosReturnResultDto,
  type PosSaleDto,
  type PosSaleInput,
  type PosSaleListQuery,
  type PosSaleSummaryDto,
  type PosSessionDetailDto,
  type PosSessionDto,
  type PosSessionListQuery,
  type PosSettings,
  type PosVariantDto,
  type PosVariantSearchQuery,
  serialSchema,
  type UpdatePosSettingsInput,
} from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { ConcurrentModificationError, ForbiddenError, NotFoundError, ValidationError } from '../../../shared/domain/domain-error.js';
import { newId } from '../../../shared/domain/id.js';
import { CatalogFacade, type SellableVariant } from '../../catalog/catalog.facade.js';
import { InventoryFacade } from '../../inventory/inventory.facade.js';
import { MediaFacade } from '../../media/media.facade.js';
import { StoresFacade } from '../../stores/stores.facade.js';
import { lineTotal, Order } from '../domain/order.aggregate.js';
import { CustomerRepository, OrderRepository } from '../domain/order.repositories.js';
import { planReturn, SerialsRequiredError } from '../domain/order-return.policy.js';
import { PosSession, PosSessionAlreadyOpenError } from '../domain/pos-session.aggregate.js';
import {
  CreditUnavailableError,
  DiscountNotAllowedError,
  PaymentExceedsTotalError,
  PaymentInsufficientError,
  PaymentMethodDisabledError,
} from '../domain/pos.errors.js';
import { InStoreHandover } from '../domain/shipping-strategy.js';
import { OrderDtoLoader } from './order.use-cases.js';
import { OrderPlacementService } from './order-placement.service.js';
import { PosLedger, PosReadModel, PosSessionRepository, PosSettingsStore } from './pos.ports.js';

/** Les administrateurs (et le propriétaire) ferment la caisse d'un autre, remboursent en argent, règlent la caisse. */
function isAdmin(role: string | null): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

/** Un moyen de paiement doit être accepté par la caisse ; l'opérateur Mobile Money, connu des réglages. */
function assertAccepted(settings: PosSettings, method: PaymentMethod, provider: string | undefined): void {
  if (method === 'EXCHANGE') return;
  if (!enabledPaymentMethods(settings).includes(method)) throw new PaymentMethodDisabledError(PAYMENT_METHOD_LABELS[method]);
  if (method === 'MOBILE_MONEY' && provider && !settings.mobileMoneyProviders.includes(provider)) {
    throw new PaymentMethodDisabledError(provider);
  }
}

@Injectable()
export class PosSettingsUseCases {
  constructor(private readonly store: PosSettingsStore) {}

  get(): Promise<PosSettings> {
    return this.store.get();
  }

  async update(input: UpdatePosSettingsInput): Promise<PosSettings> {
    const current = await this.store.get();
    return this.store.save({ ...current, ...input });
  }
}

/** Ouverture, mouvements d'espèces et fermeture de la caisse d'un vendeur. */
@Injectable()
export class PosSessionUseCases {
  constructor(
    private readonly sessions: PosSessionRepository,
    private readonly ledger: PosLedger,
    private readonly readModel: PosReadModel,
    private readonly uow: UnitOfWork,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  /** Caisse ouverte du vendeur connecté (null : il doit en ouvrir une). */
  async current(): Promise<PosSessionDto | null> {
    const userId = this.requireUser();
    const open = await this.sessions.findOpenByUser(userId);
    return open ? this.readModel.getSession(open.id) : null;
  }

  async open(input: OpenPosSessionInput): Promise<PosSessionDto> {
    const userId = this.requireUser();
    const session = PosSession.open(
      { storeId: this.actor.storeId, userId, openingFloat: input.openingFloat, label: input.label ?? null },
      this.clock.now(),
    );
    await this.uow.run(async () => {
      const open = await this.sessions.findOpenByUser(userId);
      if (open) throw new PosSessionAlreadyOpenError(open.id);
      await this.sessions.insert(session);
    });
    return this.load(session.id);
  }

  async close(sessionId: string, input: ClosePosSessionInput): Promise<PosSessionDetailDto> {
    const userId = this.requireUser();
    await this.uow.run(async () => {
      const session = await this.findSession(sessionId);
      if (session.version !== input.version) throw new ConcurrentModificationError('La caisse');
      const expectedCash = await this.ledger.expectedCash(sessionId);
      session.close(
        { userId, canCloseOthers: isAdmin(this.actor.role), countedCash: input.countedCash, expectedCash, note: input.note ?? null },
        this.clock.now(),
      );
      await this.sessions.update(session);
    });
    return this.detail(sessionId);
  }

  /** Entrée ou sortie d'espèces hors vente ; on ne sort pas plus que ce que contient le tiroir. */
  async addMovement(sessionId: string, input: CashMovementInput): Promise<PosSessionDetailDto> {
    const userId = this.requireUser();
    await this.uow.run(async () => {
      const session = await this.findSession(sessionId);
      session.assertUsableBy(userId);
      if (input.type === 'OUT') {
        const inDrawer = await this.ledger.expectedCash(sessionId);
        if (input.amount > inDrawer) {
          throw new ValidationError('VALIDATION_FAILED', 'La caisse ne contient pas assez d’espèces pour cette sortie', { inDrawer });
        }
      }
      await this.ledger.addMovement({ sessionId, type: input.type, amount: input.amount, reason: input.reason, userId });
    });
    return this.detail(sessionId);
  }

  /** Un vendeur ne voit que ses caisses ; un administrateur voit toutes celles de la boutique. */
  list(query: PosSessionListQuery): Promise<Paginated<PosSessionDto>> {
    const userId = this.requireUser();
    return this.readModel.listSessions(query, isAdmin(this.actor.role) ? null : userId);
  }

  async detail(sessionId: string): Promise<PosSessionDetailDto> {
    const userId = this.requireUser();
    const detail = await this.readModel.getSessionDetail(sessionId);
    if (!detail) throw new NotFoundError('Caisse', sessionId);
    if (!isAdmin(this.actor.role) && detail.openedBy.id !== userId) throw new NotFoundError('Caisse', sessionId);
    return detail;
  }

  credits(sessionId: string): Promise<PosCreditDto[]> {
    return this.readModel.openCredits(sessionId);
  }

  private async load(sessionId: string): Promise<PosSessionDto> {
    const dto = await this.readModel.getSession(sessionId);
    if (!dto) throw new NotFoundError('Caisse', sessionId);
    return dto;
  }

  private async findSession(sessionId: string): Promise<PosSession> {
    const session = await this.sessions.findById(sessionId);
    if (!session) throw new NotFoundError('Caisse', sessionId);
    return session;
  }

  private requireUser(): string {
    const userId = this.actor.userId;
    if (!userId) throw new ForbiddenError('FORBIDDEN', 'La caisse se tient avec un compte de la boutique');
    return userId;
  }
}

/** Recherche d'articles et lecture au scanner (code-barres, SKU ou IMEI). */
@Injectable()
export class PosCatalogQueries {
  constructor(
    private readonly catalog: CatalogFacade,
    private readonly inventory: InventoryFacade,
    private readonly media: MediaFacade,
  ) {}

  async search(query: PosVariantSearchQuery): Promise<Paginated<PosVariantDto>> {
    const page = await this.catalog.searchSellableVariants({ q: query.q, cursor: query.cursor, limit: query.limit });
    return { items: await this.toDtos(page.items), nextCursor: page.nextCursor };
  }

  /** Code-barres ou SKU d'abord, puis IMEI : l'appareil doit être en stock. */
  async lookup(code: string): Promise<PosLookupDto> {
    const variant = await this.catalog.findSellableVariantByCode(code);
    if (variant) {
      const [dto] = await this.toDtos([variant]);
      return { variant: dto!, serial: null };
    }
    const serial = serialSchema.safeParse(code);
    if (serial.success) {
      const unit = await this.inventory.findUnitBySerial(serial.data);
      if (unit) {
        if (unit.status === 'SOLD') throw new ValidationError('VALIDATION_FAILED', `L’appareil ${unit.serial} est déjà vendu`);
        if (unit.status === 'REMOVED') throw new ValidationError('VALIDATION_FAILED', `L’appareil ${unit.serial} est sorti du stock`);
        const found = (await this.catalog.findSellableVariants([unit.variantId])).get(unit.variantId);
        if (found) {
          const [dto] = await this.toDtos([found]);
          return { variant: dto!, serial: unit.serial };
        }
      }
    }
    throw new NotFoundError('Article', code);
  }

  private async toDtos(variants: readonly SellableVariant[]): Promise<PosVariantDto[]> {
    const ids = variants.map((variant) => variant.variantId);
    const [available, tracked, images] = await Promise.all([
      this.inventory.availability(ids),
      this.inventory.trackedVariants(ids),
      this.media.getMany(variants.flatMap((variant) => (variant.imageMediaId ? [variant.imageMediaId] : []))),
    ]);
    return variants.map((variant) => {
      const image = variant.imageMediaId ? images.get(variant.imageMediaId) : undefined;
      return {
        variantId: variant.variantId,
        productId: variant.productId,
        productTitle: variant.productTitle,
        variantTitle: variant.variantTitle,
        sku: variant.sku,
        barcode: variant.barcode,
        priceAmount: variant.priceAmount,
        available: variant.trackInventory ? (available.get(variant.variantId) ?? 0) : null,
        tracksUnits: tracked.has(variant.variantId),
        imageUrl: image ? (image.renditions['400'] ?? image.url) : null,
        productActive: variant.productActive,
      };
    });
  }
}

/**
 * Vente au comptoir (UC caisse) : en une seule transaction, la commande est passée (stock réservé),
 * payée (encaissements enregistrés, monnaie calculée) puis remise au client (stock sorti, IMEI notés).
 */
@Injectable()
export class PosSaleUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly customers: CustomerRepository,
    private readonly sessions: PosSessionRepository,
    private readonly ledger: PosLedger,
    private readonly settings: PosSettingsStore,
    private readonly readModel: PosReadModel,
    private readonly placement: OrderPlacementService,
    private readonly inventory: InventoryFacade,
    private readonly stores: StoresFacade,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
    private readonly dtos: OrderDtoLoader,
  ) {}

  async execute(input: PosSaleInput): Promise<PosSaleDto> {
    const userId = this.actor.userId;
    const settings = await this.settings.get();
    for (const payment of input.payments) assertAccepted(settings, payment.method, payment.provider);
    const storeId = this.actor.storeId;
    const { currency } = await this.stores.getSettings(storeId);

    const orderId = await this.uow.run(async () => {
      const session = await this.sessions.findById(input.sessionId);
      if (!session) throw new NotFoundError('Caisse', input.sessionId);
      session.assertUsableBy(userId);

      const priced = await this.placement.priceLines(
        { lines: input.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })), customLines: input.customLines },
        false,
      );
      // Un appareil suivi à l'unité ne sort qu'avec son IMEI.
      const tracked = await this.inventory.trackedVariants(input.lines.map((line) => line.variantId));
      for (const line of input.lines) {
        const title = priced.lines.find((candidate) => candidate.variantId === line.variantId)?.productTitle ?? 'Article';
        if (tracked.has(line.variantId) && new Set(line.serials).size !== line.quantity) throw new SerialsRequiredError(title, line.quantity);
        if (!tracked.has(line.variantId) && line.serials.length > 0) {
          throw new ValidationError('VALIDATION_FAILED', `« ${title} » n’est pas suivi à l’IMEI`);
        }
      }

      const discounts = this.withCounterDiscount(priced.lines, priced.discounts, input, settings);
      const customerId = input.customer
        ? await this.customers.upsertForCounter({
            email: input.customer.email ?? null,
            phone: input.customer.phone ?? null,
            firstName: input.customer.firstName ?? null,
            lastName: input.customer.lastName ?? null,
            whatsappOptIn: input.customer.whatsappOptIn,
          })
        : null;

      const now = this.clock.now();
      const order = Order.createDraft(
        {
          storeId,
          currency,
          source: 'POS',
          email: input.customer?.email ?? null,
          note: input.note ?? null,
          posSessionId: session.id,
        },
        now,
      );
      const number = await this.stores.nextOrderNumber(storeId);
      order.place({ number, priced: { lines: priced.lines, discounts }, shipping: new InStoreHandover(), customerId }, now);

      const allocation = allocatePayments(order.snapshot().totalAmount, input.payments);
      if (!allocation.ok) {
        throw allocation.reason === 'INSUFFICIENT' ? new PaymentInsufficientError(allocation.missingAmount) : new PaymentExceedsTotalError();
      }
      for (const payment of allocation.payments) {
        if (payment.method === 'EXCHANGE' && !(payment.returnId && (await this.ledger.consumeCredit(payment.returnId, payment.amount)))) {
          throw new CreditUnavailableError();
        }
      }

      await this.inventory.reserve(order.reservedLines());
      order.markPaid(now);
      const serials = input.lines.flatMap((line) => {
        const orderLine = order.lines.find((candidate) => candidate.variantId === line.variantId && !candidate.custom);
        return orderLine && line.serials.length > 0 ? [{ lineId: orderLine.id, values: line.serials }] : [];
      });
      order.fulfill(now, serials);
      await this.orders.insert(order);
      await this.inventory.commit(order.shippedLines(), order.id);
      await this.ledger.addPayments({
        orderId: order.id,
        sessionId: session.id,
        userId,
        payments: allocation.payments.map((payment) => ({ ...payment, kind: 'PAYMENT' as const })),
      });
      await this.outbox.addAll(order.pullEvents());
      return order.id;
    });
    return this.receipt(orderId);
  }

  /** Devis du ticket : prix du moment, remises des packs et remise de caisse (permission du vendeur comprise). */
  async quote(input: PosQuoteInput): Promise<PosQuoteDto> {
    const settings = await this.settings.get();
    const priced = await this.placement.priceLines({ lines: input.lines, customLines: input.customLines }, false);
    const discounts = this.withCounterDiscount(priced.lines, priced.discounts, input, settings);
    const subtotalAmount = priced.lines.reduce((sum, line) => sum + lineTotal(line), 0);
    const discountAmount = Math.min(discounts.reduce((sum, discount) => sum + discount.amount, 0), subtotalAmount);
    return { subtotalAmount, discounts, discountAmount, totalAmount: subtotalAmount - discountAmount };
  }

  /** Ticket d'une vente (réimpression) : la commande, la monnaie rendue, la caisse et le vendeur. */
  async receipt(orderId: string): Promise<PosSaleDto> {
    const order = await this.dtos.load(orderId);
    const session = order.posSessionId ? await this.readModel.getSession(order.posSessionId) : null;
    return {
      order,
      changeAmount: order.payments.filter((payment) => payment.kind === 'PAYMENT').reduce((sum, payment) => sum + payment.changeAmount, 0),
      sessionLabel: session?.label ?? null,
      sellerName: session?.openedBy.name ?? null,
    };
  }

  /**
   * Remise de caisse, après les remises des packs. Un vendeur reste sous le plafond des réglages ;
   * un administrateur accorde ce qu'il veut.
   */
  private withCounterDiscount(
    lines: readonly { unitPriceAmount: number; quantity: number }[],
    discounts: readonly OrderDiscount[],
    input: Pick<PosSaleInput, 'discount'>,
    settings: PosSettings,
  ): OrderDiscount[] {
    const subtotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);
    const base = Math.max(subtotal - discounts.reduce((sum, discount) => sum + discount.amount, 0), 0);
    const amount = posDiscountAmount(base, input.discount);
    if (amount === 0) return [...discounts];
    if (!isAdmin(this.actor.role) && amount > Math.floor((base * settings.staffDiscountMaxPercent) / 100)) {
      throw new DiscountNotAllowedError(settings.staffDiscountMaxPercent);
    }
    const reason = input.discount?.reason?.trim();
    return [...discounts, { bundleId: null, title: reason ? `Remise : ${reason}` : 'Remise en caisse', amount }];
  }
}

/**
 * Retour au comptoir : les articles rapportés reviennent en stock (sauf défectueux), le client est
 * remboursé, ou reçoit un avoir qui paie la vente de l'échange. Rembourser en argent est réservé
 * aux administrateurs ; un vendeur propose un avoir.
 */
@Injectable()
export class PosReturnUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly sessions: PosSessionRepository,
    private readonly ledger: PosLedger,
    private readonly settings: PosSettingsStore,
    private readonly readModel: PosReadModel,
    private readonly inventory: InventoryFacade,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
    private readonly dtos: OrderDtoLoader,
  ) {}

  async execute(orderId: string, input: PosReturnInput): Promise<PosReturnResultDto> {
    const userId = this.actor.userId;
    const { method, provider, reference } = input.refund;
    if (method !== 'EXCHANGE' && !isAdmin(this.actor.role)) {
      throw new ForbiddenError('FORBIDDEN', 'Rembourser en argent est réservé aux administrateurs : proposez un avoir (échange)');
    }
    assertAccepted(await this.settings.get(), method, provider);

    const returnId = await this.uow.run(async () => {
      const session = await this.sessions.findById(input.sessionId);
      if (!session) throw new NotFoundError('Caisse', input.sessionId);
      session.assertUsableBy(userId);
      const order = await this.orders.findById(orderId);
      if (!order) throw new NotFoundError('Commande', orderId);

      const plan = planReturn(order.snapshot(), input.lines, await this.ledger.returnedSoFar(orderId));
      if (method === 'CASH' && plan.refundAmount > (await this.ledger.expectedCash(session.id))) {
        throw new ValidationError('VALIDATION_FAILED', 'La caisse ne contient pas assez d’espèces pour ce remboursement');
      }
      const now = this.clock.now();
      order.recordRefund(plan.refundAmount, now);
      await this.orders.update(order);

      if (input.restock) {
        for (const planned of plan.lines) {
          const variantId = planned.line.variantId;
          if (!variantId || !planned.line.tracksInventory) continue;
          if (planned.serials.length > 0) await this.inventory.returnSoldUnits(variantId, planned.serials, `Retour : ${input.reason}`);
          else await this.inventory.returnToStock(variantId, planned.quantity, `Retour : ${input.reason}`);
        }
      }

      const id = newId();
      await this.ledger.addReturn({
        id,
        orderId,
        sessionId: session.id,
        reason: input.reason,
        restocked: input.restock,
        refundAmount: plan.refundAmount,
        refundMethod: method,
        creditRemaining: method === 'EXCHANGE' ? plan.refundAmount : 0,
        lines: plan.lines.map((planned) => ({
          orderLineId: planned.line.id,
          quantity: planned.quantity,
          amount: planned.amount,
          serials: planned.serials,
        })),
        userId,
      });
      if (plan.refundAmount > 0) {
        await this.ledger.addPayments({
          orderId,
          sessionId: session.id,
          userId,
          payments: [
            {
              kind: 'REFUND',
              method,
              amount: plan.refundAmount,
              tenderedAmount: null,
              ...(provider ? { provider } : {}),
              ...(reference ? { reference } : {}),
              returnId: id,
            },
          ],
        });
      }
      await this.outbox.addAll(order.pullEvents());
      return id;
    });

    const [order, orderReturn] = await Promise.all([this.dtos.load(orderId), this.readModel.getReturn(returnId)]);
    if (!orderReturn) throw new NotFoundError('Retour', returnId);
    return { order, orderReturn };
  }
}

/** Ventes de la caisse (liste, recherche par numéro de ticket). */
@Injectable()
export class PosSalesQueries {
  constructor(private readonly readModel: PosReadModel) {}

  list(query: PosSaleListQuery): Promise<Paginated<PosSaleSummaryDto>> {
    return this.readModel.listSales(query);
  }
}
