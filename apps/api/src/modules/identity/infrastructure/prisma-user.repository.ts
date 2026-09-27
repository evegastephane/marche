import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { isUniqueViolation } from '../../../shared/infrastructure/prisma/prisma-errors.js';
import type { PrismaAdapter } from '../../../shared/infrastructure/prisma/transaction.js';
import { type UserProfile, UserRepository } from '../domain/user.repository.js';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly txHost: TransactionHost<PrismaAdapter>) {
    super();
  }

  async findIdByClerkId(clerkUserId: string): Promise<string | null> {
    const row = await this.txHost.tx.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async upsert(profile: UserProfile): Promise<string> {
    const data = {
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      imageUrl: profile.imageUrl,
      deletedAt: null,
    };
    try {
      const row = await this.txHost.tx.user.upsert({
        where: { clerkUserId: profile.clerkUserId },
        create: { clerkUserId: profile.clerkUserId, ...data },
        update: data,
        select: { id: true },
      });
      return row.id;
    } catch (error) {
      // Deux premières requêtes simultanées : l'autre a créé l'utilisateur.
      if (isUniqueViolation(error)) {
        const id = await this.findIdByClerkId(profile.clerkUserId);
        if (id) return id;
      }
      throw error;
    }
  }

  async markDeleted(clerkUserId: string): Promise<void> {
    await this.txHost.tx.user.updateMany({
      where: { clerkUserId },
      data: { deletedAt: new Date() },
    });
  }
}
