/** Annuaire des organisations (Clerk) : une organisation par boutique. */
export abstract class OrganizationDirectory {
  abstract createOrganization(input: {
    name: string;
    slug: string;
    createdByClerkUserId: string;
  }): Promise<{ clerkOrgId: string }>;

  abstract deleteOrganization(clerkOrgId: string): Promise<void>;
}

/** Le slug est déjà pris côté annuaire. */
export class OrganizationSlugTakenError extends Error {
  constructor(slug: string) {
    super(`Slug d’organisation déjà utilisé : ${slug}`);
    this.name = 'OrganizationSlugTakenError';
  }
}
