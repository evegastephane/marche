import { Inject, Injectable } from '@nestjs/common';
import { isClerkAPIResponseError } from '@clerk/backend/errors';
import {
  CLERK_CLIENT,
  ClerkNotConfiguredError,
  type MaybeClerkClient,
} from '../../../shared/infrastructure/clerk/clerk.module.js';
import {
  OrganizationDirectory,
  OrganizationSlugTakenError,
} from '../application/organization-directory.port.js';

/** Adapter Clerk : une organisation Clerk par boutique. */
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
    const clerk = this.client();
    try {
      const organization = await clerk.organizations.createOrganization({
        name: input.name,
        slug: input.slug,
        createdBy: input.createdByClerkUserId,
      });
      return { clerkOrgId: organization.id };
    } catch (error) {
      if (
        isClerkAPIResponseError(error) &&
        error.errors.some(
          (e) => e.code === 'form_identifier_exists' || e.meta?.paramName === 'slug',
        )
      ) {
        throw new OrganizationSlugTakenError(input.slug);
      }
      throw error;
    }
  }

  async deleteOrganization(clerkOrgId: string): Promise<void> {
    await this.client().organizations.deleteOrganization(clerkOrgId);
  }

  private client() {
    if (!this.clerk) throw new ClerkNotConfiguredError();
    return this.clerk;
  }
}
