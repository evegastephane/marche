import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { StoresFacade } from '../../stores/stores.facade.js';
import { roleFromClerk, UserRepository } from '../domain/user.repository.js';

const clerkUserSchema = z.object({
  id: z.string(),
  email_addresses: z
    .array(z.object({ id: z.string(), email_address: z.string() }))
    .default([]),
  primary_email_address_id: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  image_url: z.string().nullish(),
});

const clerkMembershipSchema = z.object({
  role: z.string(),
  organization: z.object({ id: z.string() }),
  public_user_data: z.object({
    user_id: z.string(),
    identifier: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    image_url: z.string().nullish(),
  }),
});

const deletedSchema = z.object({ id: z.string() });

export interface ClerkWebhookEvent {
  type: string;
  data: unknown;
}

/** Synchronise utilisateurs, adhésions et organisations depuis les webhooks Clerk (idempotent). */
@Injectable()
export class ClerkWebhookHandler {
  private readonly logger = new Logger(ClerkWebhookHandler.name);

  constructor(
    private readonly users: UserRepository,
    private readonly stores: StoresFacade,
  ) {}

  async handle(event: ClerkWebhookEvent): Promise<void> {
    switch (event.type) {
      case 'user.created':
      case 'user.updated': {
        const user = clerkUserSchema.parse(event.data);
        const primary =
          user.email_addresses.find((e) => e.id === user.primary_email_address_id) ??
          user.email_addresses[0];
        await this.users.upsert({
          clerkUserId: user.id,
          email: primary?.email_address.toLowerCase() ?? '',
          firstName: user.first_name ?? null,
          lastName: user.last_name ?? null,
          imageUrl: user.image_url ?? null,
        });
        return;
      }
      case 'user.deleted':
        await this.users.markDeleted(deletedSchema.parse(event.data).id);
        return;
      case 'organizationMembership.created':
      case 'organizationMembership.updated': {
        const membership = clerkMembershipSchema.parse(event.data);
        const store = await this.stores.resolveByClerkOrg(membership.organization.id);
        if (!store) return; // organisation sans boutique (création en cours) : le guard rattrapera
        const userId = await this.localUserFromMembership(membership);
        await this.stores.setMembershipRole(store.storeId, userId, roleFromClerk(membership.role));
        return;
      }
      case 'organizationMembership.deleted': {
        const membership = clerkMembershipSchema.parse(event.data);
        const store = await this.stores.resolveByClerkOrg(membership.organization.id);
        const userId = await this.users.findIdByClerkId(membership.public_user_data.user_id);
        if (store && userId) await this.stores.removeMembership(store.storeId, userId);
        return;
      }
      case 'organization.deleted':
        await this.stores.archiveByClerkOrg(deletedSchema.parse(event.data).id);
        return;
      default:
        this.logger.debug(`Webhook Clerk ignoré : ${event.type}`);
    }
  }

  private async localUserFromMembership(
    membership: z.infer<typeof clerkMembershipSchema>,
  ): Promise<string> {
    const data = membership.public_user_data;
    const existing = await this.users.findIdByClerkId(data.user_id);
    if (existing) return existing;
    return this.users.upsert({
      clerkUserId: data.user_id,
      email: data.identifier?.toLowerCase() ?? '',
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      imageUrl: data.image_url ?? null,
    });
  }
}
