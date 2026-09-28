import { Injectable } from '@nestjs/common';
import type {
  Address,
  CheckoutResultDto,
  OrderLineInput,
  PublicOrderDto,
  SpecialRequestDto,
  SpecialRequestInput,
  SpecialRequestReceiptDto,
} from '@marche/contracts';
import { OrderPlacementService } from './application/order-placement.service.js';
import { PlaceStorefrontOrderUseCase } from './application/order.use-cases.js';
import { type OrderSummary, OrdersReadModel, SpecialRequestsReadModel } from './application/orders.ports.js';
import { SpecialRequestUseCases } from './application/special-request.use-cases.js';
import { CustomerRepository, type WhatsAppRecipient } from './domain/order.repositories.js';

export type { OrderSummary, WhatsAppRecipient };

/** API publique du module orders (checkout, storefront, notifications). */
@Injectable()
export class OrdersFacade {
  constructor(
    private readonly placeStorefrontOrder: PlaceStorefrontOrderUseCase,
    private readonly readModel: OrdersReadModel,
    private readonly placement: OrderPlacementService,
    private readonly customers: CustomerRepository,
    private readonly specialRequests: SpecialRequestUseCases,
    private readonly specialRequestsReadModel: SpecialRequestsReadModel,
  ) {}

  /** Frais de livraison de la boutique courante pour un sous-total donné (panier). */
  async shippingAmountFor(subtotalAmount: number): Promise<number> {
    return (await this.placement.shippingStrategy()).compute(subtotalAmount);
  }

  /** UC-45 : lève INSUFFICIENT_STOCK ou ITEM_UNAVAILABLE (409) si le panier n'est plus valable. */
  placeFromStorefront(input: {
    lines: readonly OrderLineInput[];
    email: string;
    phone?: string;
    shippingAddress: Address;
    note?: string;
    whatsappOptIn?: boolean;
  }): Promise<CheckoutResultDto> {
    return this.placeStorefrontOrder.execute(input);
  }

  /** Commande sur demande envoyée depuis la fiche d'un produit du site. */
  submitSpecialRequest(input: SpecialRequestInput): Promise<SpecialRequestReceiptDto> {
    return this.specialRequests.submit(input);
  }

  /** Demande de la boutique courante (e-mails). */
  getSpecialRequest(requestId: string): Promise<SpecialRequestDto | null> {
    return this.specialRequestsReadModel.get(requestId);
  }

  getPublicOrder(publicToken: string): Promise<PublicOrderDto | null> {
    return this.readModel.getPublicOrder(publicToken);
  }

  getSummary(orderId: string): Promise<OrderSummary | null> {
    return this.readModel.getSummary(orderId);
  }

  /** Clients de la boutique courante joignables par une campagne WhatsApp (consentement, pas de « STOP »). */
  listWhatsAppRecipients(): Promise<WhatsAppRecipient[]> {
    return this.customers.listWhatsAppRecipients();
  }

  /** « STOP » reçu : désinscrit ce numéro dans toutes les boutiques (contexte système). */
  optOutWhatsApp(phoneSuffix: string, at: Date): Promise<number> {
    return this.customers.optOutWhatsApp(phoneSuffix, at);
  }
}
