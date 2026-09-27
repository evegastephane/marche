import { Inject, Injectable } from '@nestjs/common';
import {
  CLERK_CLIENT,
  ClerkNotConfiguredError,
  type MaybeClerkClient,
} from '../../../shared/infrastructure/clerk/clerk.module.js';
import { OrganizationDirectory } from '../application/organization-directory.port.js';

/**
 * Adapter Clerk : une organisation Clerk par boutique.
 * Le slug de la boutique reste chez nous (unique en base) : on ne l'envoie pas comme slug Clerk,
 * que l'instance peut désactiver. Il est seulement recopié dans les métadonnées publiques.
 */
@Injectable()
export class ClerkOrganizationDirectory extends OrganizationDirectory {
  constructor(@Inject(CLERK_CLIENT) private readonly clerk: MaybeClerkClient) {
    super();
  }

  async createOrganization(input: {
    name: string;
    slug: string;
    createdByClerkUserId: string;
  }): Promise<{ clerkOrgId: string }> {
    const organization = await this.client().organizations.createOrganization({
      name: input.name,
      createdBy: input.createdByClerkUserId,
      publicMetadata: { storeSlug: input.slug },
    });
    return { clerkOrgId: organization.id };
  }

  async deleteOrganization(clerkOrgId: string): Promise<void> {
    await this.client().organizations.deleteOrganization(clerkOrgId);
  }

  private client() {
    if (!this.clerk) throw new ClerkNotConfiguredError();
    return this.clerk;
  }
}
