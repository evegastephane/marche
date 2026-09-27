import type {
  Address,
  Currency,
  CustomerDetailDto,
  CustomerDto,
  CustomerListQuery,
  OrderDto,
  OrderListItemDto,
  OrderListQuery,
  Paginated,
  PublicOrderDto,
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
