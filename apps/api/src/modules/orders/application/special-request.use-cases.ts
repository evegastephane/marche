import { Injectable } from '@nestjs/common';
import type {
  DeclineSpecialRequestInput,
  Paginated,
  QuoteSpecialRequestInput,
  SpecialRequestDto,
  SpecialRequestInput,
  SpecialRequestListQuery,
  SpecialRequestReceiptDto,
} from '@marche/contracts';
import { ActorContext } from '../../../shared/application/actor-context.port.js';
import { Clock } from '../../../shared/application/clock.port.js';
import { OutboxPort } from '../../../shared/application/outbox.port.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.port.js';
import { NotFoundError } from '../../../shared/domain/domain-error.js';
import { CatalogFacade } from '../../catalog/catalog.facade.js';
import { StoresFacade } from '../../stores/stores.facade.js';
import { SpecialRequestRepository } from '../domain/order.repositories.js';
import { InvalidRequestTransitionError, SpecialRequest } from '../domain/special-request.aggregate.js';
import { CreateDraftOrderUseCase } from './order.use-cases.js';
import { SpecialRequestsReadModel } from './orders.ports.js';

/**
 * Commandes sur demande : l'acheteur demande une configuration absente du stock (ou non proposée),
 * la boutique la chiffre ou la refuse, puis la transforme en brouillon de commande.
 */
@Injectable()
export class SpecialRequestUseCases {
  constructor(
    private readonly requests: SpecialRequestRepository,
    private readonly readModel: SpecialRequestsReadModel,
    private readonly catalog: CatalogFacade,
    private readonly stores: StoresFacade,
    private readonly createDraft: CreateDraftOrderUseCase,
    private readonly uow: UnitOfWork,
    private readonly outbox: OutboxPort,
    private readonly actor: ActorContext,
    private readonly clock: Clock,
  ) {}

  /** Depuis la fiche d'un produit publié du site. */
  async submit(input: SpecialRequestInput): Promise<SpecialRequestReceiptDto> {
    const product = await this.catalog.getPublishedProduct(input.productSlug);
    if (!product) throw new NotFoundError('Produit', input.productSlug);
    const settings = await this.stores.getSettings(this.actor.storeId);
    // Une valeur par option du produit ; les valeurs peuvent être absentes du catalogue (c'est le but).
    const known = new Map(product.options.map((option) => [option.name.toLowerCase(), option.name]));
    const options = [
      ...new Map(
        input.options.flatMap((option) => {
          const name = known.get(option.name.toLowerCase());
          return name ? [[name, { name, value: option.value }] as const] : [];
        }),
      ).values(),
    ];
    const request = SpecialRequest.submit(
      {
        storeId: this.actor.storeId,
        productId: product.id,
        productTitle: product.title,
        productSlug: product.slug,
        options,
        quantity: input.quantity,
        firstName: input.firstName,
        lastName: input.lastName ?? null,
        email: input.email,
        phone: input.phone,
        note: input.note ?? null,
        currency: settings.currency,
      },
      this.clock.now(),
    );
    await this.uow.run(async () => {
      await this.requests.insert(request);
      await this.outbox.addAll(request.pullEvents());
    });
    return { id: request.id, productTitle: product.title };
  }

  list(query: SpecialRequestListQuery): Promise<Paginated<SpecialRequestDto>> {
    return this.readModel.list(query);
  }

  async summary(): Promise<{ newCount: number }> {
    return { newCount: await this.readModel.countNew() };
  }

  get(requestId: string): Promise<SpecialRequestDto> {
    return this.dto(requestId);
  }

  quote(requestId: string, input: QuoteSpecialRequestInput): Promise<SpecialRequestDto> {
    return this.mutate(requestId, (request) => request.quote(input, this.clock.now()));
  }

  decline(requestId: string, input: DeclineSpecialRequestInput): Promise<SpecialRequestDto> {
    return this.mutate(requestId, (request) => request.decline(input.reason, this.clock.now()));
  }

  /** Crée le brouillon de commande (ligne libre au prix du devis, client renseigné) et y relie la demande. */
  convert(requestId: string): Promise<SpecialRequestDto> {
    return this.mutate(requestId, async (request) => {
      const r = request.snapshot();
      if (r.status !== 'QUOTED' || r.quotedUnitPriceAmount === null) {
        throw new InvalidRequestTransitionError(r.status, 'convertir en commande');
      }
      const order = await this.createDraft.execute({
        customer: { email: r.email, firstName: r.firstName, lastName: r.lastName ?? undefined, phone: r.phone },
        lines: [],
        customLines: [
          {
            title: r.productTitle,
            variantTitle: request.configurationLabel,
            unitPriceAmount: r.quotedUnitPriceAmount,
            quantity: r.quantity,
          },
        ],
        shippingAddress: null,
        note: [`Commande sur demande${r.quotedDelay ? ` (délai annoncé : ${r.quotedDelay})` : ''}.`, r.note]
          .filter(Boolean)
          .join('\n'),
      });
      request.convert(order.id, this.clock.now());
    });
  }

  private async mutate(
    requestId: string,
    change: (request: SpecialRequest) => void | Promise<void>,
  ): Promise<SpecialRequestDto> {
    await this.uow.run(async () => {
      const request = await this.requests.findById(requestId);
      if (!request) throw new NotFoundError('Demande', requestId);
      await change(request);
      await this.requests.update(request);
      await this.outbox.addAll(request.pullEvents());
    });
    return this.dto(requestId);
  }

  private async dto(requestId: string): Promise<SpecialRequestDto> {
    const dto = await this.readModel.get(requestId);
    if (!dto) throw new NotFoundError('Demande', requestId);
    return dto;
  }
}
