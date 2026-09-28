import type {
  Address,
  Currency,
  CustomerDetailDto,
  CustomerDto,
  CustomerListQuery,
  OrderDiscount,
  OrderDto,
  OrderListItemDto,
  OrderListQuery,
  Paginated,
  PublicOrderDto,
  SpecialRequestDto,
  SpecialRequestListQuery,
} from '@marche/contracts';

/** Résumé d'une commande pour les e-mails transactionnels. */
export interface OrderSummary {
  id: string;
  number: number | null;
  status: OrderDto['status'];
  email: string | null;
  customerName: string | null;
  currency: Currency;
  lines: { productTitle: string; variantTitle: string; quantity: number; unitPriceAmount: number; lineTotalAmount: number }[];
  subtotalAmount: number;
  discounts: OrderDiscount[];
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  shippingAddress: Address | null;
  publicToken: string;
  placedAt: string | null;
}

export abstract class OrdersReadModel {
  abstract listOrders(query: OrderListQuery): Promise<Paginated<OrderListItemDto>>;
  abstract getOrder(id: string): Promise<OrderDto | null>;
  abstract listCustomers(query: CustomerListQuery): Promise<Paginated<CustomerDto>>;
  abstract getCustomer(id: string): Promise<CustomerDetailDto | null>;
  abstract getPublicOrder(publicToken: string): Promise<PublicOrderDto | null>;
  abstract getSummary(orderId: string): Promise<OrderSummary | null>;
}

/** Lectures des commandes sur demande (back-office et e-mails). */
export abstract class SpecialRequestsReadModel {
  abstract list(query: SpecialRequestListQuery): Promise<Paginated<SpecialRequestDto>>;
  abstract get(id: string): Promise<SpecialRequestDto | null>;
  /** Demandes à traiter (nouvelles), pour le témoin du menu. */
  abstract countNew(): Promise<number>;
}
