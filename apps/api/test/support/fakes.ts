import { randomBytes } from 'node:crypto';
import { OrganizationDirectory } from '../../src/modules/stores/application/organization-directory.port.js';
import { UserDirectory } from '../../src/modules/identity/application/identity.ports.js';
import type { UserProfile } from '../../src/modules/identity/domain/user.repository.js';
import { ObjectStorage, type PresignedUpload } from '../../src/modules/media/application/media.ports.js';
import { EmailSender, type OutgoingEmail } from '../../src/modules/notifications/application/email.port.js';
import { StorefrontRevalidator } from '../../src/modules/sites/application/sites.ports.js';

/** Annuaire Clerk simulé : les organisations sont créées en mémoire. */
export class FakeOrganizationDirectory extends OrganizationDirectory {
  readonly orgIdsBySlug = new Map<string, string>();
  readonly deleted: string[] = [];

  async createOrganization(input: { name: string; slug: string }): Promise<{ clerkOrgId: string }> {
    const clerkOrgId = `org_${randomBytes(8).toString('hex')}`;
    this.orgIdsBySlug.set(input.slug, clerkOrgId);
    return { clerkOrgId };
  }

  async deleteOrganization(clerkOrgId: string): Promise<void> {
    this.deleted.push(clerkOrgId);
  }

  orgIdFor(slug: string): string {
    const id = this.orgIdsBySlug.get(slug);
    if (!id) throw new Error(`Organisation inconnue pour ${slug}`);
    return id;
  }
}

export class FakeUserDirectory extends UserDirectory {
  async getProfile(clerkUserId: string): Promise<UserProfile> {
    return {
      clerkUserId,
      email: `${clerkUserId}@example.test`,
      firstName: 'Test',
      lastName: clerkUserId,
      imageUrl: null,
    };
  }
}

/** Stockage objet en mémoire : l'upload pré-signé est simulé par `simulateUpload`. */
export class InMemoryObjectStorage extends ObjectStorage {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();

  async presignPut(input: { key: string; contentType: string; expiresInSeconds: number }): Promise<PresignedUpload> {
    return {
      url: `http://storage.test/${input.key}?signature=test`,
      headers: { 'Content-Type': input.contentType },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async head(key: string): Promise<{ contentLength: number; contentType?: string } | null> {
    const object = this.objects.get(key);
    return object ? { contentLength: object.body.length, contentType: object.contentType } : null;
  }

  async get(key: string): Promise<Buffer> {
    const object = this.objects.get(key);
    if (!object) throw new Error(`Objet absent : ${key}`);
    return object.body;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, { body, contentType });
  }

  publicUrl(key: string): string {
    return `http://media.test/${key}`;
  }

  simulateUpload(key: string, body: Buffer, contentType: string): void {
    this.objects.set(key, { body, contentType });
  }
}

/** Boîte d'envoi en mémoire. */
export class InMemoryEmailSender extends EmailSender {
  readonly sent: OutgoingEmail[] = [];

  async send(email: OutgoingEmail): Promise<void> {
    this.sent.push(email);
  }
}

/** Revalidations demandées au storefront (enregistrées au lieu d'un appel HTTP). */
export class RecordingRevalidator extends StorefrontRevalidator {
  readonly calls: { tags: string[]; immediate: boolean }[] = [];

  async revalidate(tags: readonly string[], options: { immediate: boolean }): Promise<void> {
    this.calls.push({ tags: [...tags], immediate: options.immediate });
  }

  tags(): string[] {
    return this.calls.flatMap((call) => call.tags);
  }
}
