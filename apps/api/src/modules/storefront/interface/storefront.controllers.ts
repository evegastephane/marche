import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type AddCartLineInput,
  addCartLineSchema,
  type AddCartLinesInput,
  addCartLinesSchema,
  type AvailabilityDto,
  type AvailabilityQuery,
  availabilityQuerySchema,
  type CartDto,
  type CheckoutInput,
  type CheckoutResultDto,
  checkoutSchema,
  type Paginated,
  type PublicOrderDto,
  type SpecialRequestInput,
  specialRequestInputSchema,
  type SpecialRequestReceiptDto,
  STOREFRONT_HEADERS,
  type StorefrontBrandDto,
  type StorefrontCollectionDto,
  type StorefrontFacetsDto,
  type StorefrontFacetsQuery,
  storefrontFacetsQuerySchema,
  type StorefrontProductCardDto,
  type StorefrontProductDto,
  type StorefrontProductListQuery,
  type StorefrontStoreDto,
  storefrontProductListQuerySchema,
  type UpdateCartLineInput,
  updateCartLineSchema,
} from '@marche/contracts';
import { Public, STOREFRONT_API } from '../../../shared/infrastructure/http/access.decorators.js';
import { Idempotent } from '../../../shared/infrastructure/http/idempotency.interceptor.js';
import { ApiZodBody, ZodBody, ZodQuery } from '../../../shared/infrastructure/http/zod-validation.js';
import { CheckoutFacade } from '../../checkout/checkout.facade.js';
import { OrdersFacade } from '../../orders/orders.facade.js';
import { StorefrontQueries } from '../application/storefront.queries.js';
import { Storefront, StorefrontGuard, type StorefrontRequestContext } from './storefront.guard.js';

/** En-têtes communs de l'API storefront (documentation Swagger). */
function StorefrontApi(): ClassDecorator {
  return (target) => {
    ApiTags('storefront')(target);
    ApiHeader({ name: STOREFRONT_HEADERS.token, required: true, description: 'Secret partagé avec le storefront' })(target);
    ApiHeader({ name: STOREFRONT_HEADERS.storeHost, required: true, description: 'Sous-domaine de la boutique' })(target);
    ApiHeader({ name: STOREFRONT_HEADERS.previewToken, required: false, description: 'Jeton d’aperçu du thème' })(target);
  };
}

@StorefrontApi()
@Public()
@UseGuards(StorefrontGuard)
@Controller(STOREFRONT_API)
export class StorefrontCatalogController {
  constructor(private readonly queries: StorefrontQueries) {}

  /** Boutique, thème et navigation (UC-43). */
  @Get('store')
  store(@Storefront() storefront: StorefrontRequestContext): Promise<StorefrontStoreDto> {
    return this.queries.store(storefront.preview);
  }

  @Get('products')
  products(
    @ZodQuery(storefrontProductListQuerySchema) query: StorefrontProductListQuery,
  ): Promise<Paginated<StorefrontProductCardDto>> {
    return this.queries.products(query);
  }

  /** Filtres du catalogue : tailles, couleurs, stockage, rayons… avec le nombre d'articles. */
  @Get('facets')
  facets(@ZodQuery(storefrontFacetsQuerySchema) query: StorefrontFacetsQuery): Promise<StorefrontFacetsDto> {
    return this.queries.facets(query);
  }

  @Get('products/:slug')
  product(@Param('slug') slug: string): Promise<StorefrontProductDto> {
    return this.queries.product(slug);
  }

  @Get('collections')
  collections(): Promise<StorefrontCollectionDto[]> {
    return this.queries.collections();
  }

  @Get('collections/:slug')
  collection(@Param('slug') slug: string): Promise<StorefrontCollectionDto> {
    return this.queries.collection(slug);
  }

  @Get('brands')
  brands(): Promise<StorefrontBrandDto[]> {
    return this.queries.brands();
  }

  /** Disponibilité lue au moment d'ajouter au panier (jamais mise en cache sur la fiche). */
  @Get('availability')
  availability(@ZodQuery(availabilityQuerySchema) query: AvailabilityQuery): Promise<AvailabilityDto> {
    return this.queries.availability(query.variantIds);
  }

  /** Confirmation visible par l'acheteur via le lien de suivi. */
  @Get('orders/:publicToken')
  order(@Param('publicToken') publicToken: string): Promise<PublicOrderDto> {
    return this.queries.order(publicToken);
  }
}

@StorefrontApi()
@Public()
@UseGuards(StorefrontGuard)
@Controller(`${STOREFRONT_API}/carts`)
export class StorefrontCartController {
  constructor(private readonly carts: CheckoutFacade) {}

  /** UC-44 */
  @Post()
  create(): Promise<CartDto> {
    return this.carts.create();
  }

  @Get(':cartId')
  get(@Param('cartId', ParseUUIDPipe) cartId: string): Promise<CartDto> {
    return this.carts.get(cartId);
  }

  @Post(':cartId/lines')
  @ApiZodBody(addCartLineSchema)
  addLine(
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @ZodBody(addCartLineSchema) input: AddCartLineInput,
  ): Promise<CartDto> {
    return this.carts.addLine(cartId, input);
  }

  /** Plusieurs articles d'un geste (appareil et accessoires, pack) : tout ou rien. */
  @Post(':cartId/lines/batch')
  @ApiZodBody(addCartLinesSchema)
  addLines(
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @ZodBody(addCartLinesSchema) input: AddCartLinesInput,
  ): Promise<CartDto> {
    return this.carts.addLines(cartId, input);
  }

  @Patch(':cartId/lines/:variantId')
  @ApiZodBody(updateCartLineSchema)
  updateLine(
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @ZodBody(updateCartLineSchema) input: UpdateCartLineInput,
  ): Promise<CartDto> {
    return this.carts.setQuantity(cartId, variantId, input.quantity);
  }

  @Delete(':cartId/lines/:variantId')
  removeLine(
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ): Promise<CartDto> {
    return this.carts.removeLine(cartId, variantId);
  }
}

@StorefrontApi()
@Public()
@UseGuards(StorefrontGuard)
@Controller(`${STOREFRONT_API}/checkout`)
export class StorefrontCheckoutController {
  constructor(private readonly carts: CheckoutFacade) {}

  /** UC-45 : checkout invité. Idempotent, limité à 10 tentatives par minute et par acheteur. */
  @Post()
  @Idempotent()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodBody(checkoutSchema)
  checkout(
    @Storefront() storefront: StorefrontRequestContext,
    @ZodBody(checkoutSchema) input: CheckoutInput,
  ): Promise<CheckoutResultDto> {
    return this.carts.checkout(input, { storeOpen: storefront.acceptsOrders });
  }
}

@StorefrontApi()
@Public()
@UseGuards(StorefrontGuard)
@Controller(`${STOREFRONT_API}/special-requests`)
export class StorefrontSpecialRequestsController {
  constructor(private readonly orders: OrdersFacade) {}

  /** Commande sur demande : une configuration absente du stock ou du catalogue. 5 envois par minute au plus. */
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiZodBody(specialRequestInputSchema)
  submit(@ZodBody(specialRequestInputSchema) input: SpecialRequestInput): Promise<SpecialRequestReceiptDto> {
    return this.orders.submitSpecialRequest(input);
  }
}
