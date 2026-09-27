import { Injectable } from '@nestjs/common';
import { UserRepository } from '../domain/user.repository.js';
import { UserDirectory } from './identity.ports.js';

/**
 * Création des utilisateurs locaux « à la volée » (docs/PLAN-CODE.md §6.4) :
 * l'API ne dépend pas de l'arrivée des webhooks Clerk (utile en développement).
 */
@Injectable()
export class LocalUserService {
  constructor(
    private readonly users: UserRepository,
    private readonly directory: UserDirectory,
  ) {}

  async resolve(clerkUserId: string): Promise<string> {
    const existing = await this.users.findIdByClerkId(clerkUserId);
    if (existing) return existing;
    const profile = await this.directory.getProfile(clerkUserId);
    return this.users.upsert(profile);
  }
}
