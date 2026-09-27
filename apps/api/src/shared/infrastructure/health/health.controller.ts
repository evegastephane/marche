import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { Redis } from 'ioredis';
import { Public } from '../http/access.decorators.js';
import { type AppPrismaClient, PRISMA } from '../prisma/prisma.client.js';
import { REDIS } from '../redis/redis.module.js';

type CheckResult = { status: 'up' } | { status: 'down'; error: string };

async function check(probe: () => Promise<unknown>, timeoutMs = 2_000): Promise<CheckResult> {
  try {
    await Promise.race([
      probe(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('délai dépassé')), timeoutMs)),
    ]);
    return { status: 'up' };
  } catch (error) {
    return { status: 'down', error: error instanceof Error ? error.message : String(error) };
  }
}

@ApiTags('santé')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(PRISMA) private readonly prisma: AppPrismaClient,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Le processus répond (sonde de vivacité). */
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  /** Les dépendances répondent (sonde de disponibilité) : 503 sinon. */
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const [database, redis] = await Promise.all([
      check(() => this.prisma.$queryRaw`SELECT 1`),
      check(() => this.redis.ping()),
    ]);
    const ok = database.status === 'up' && redis.status === 'up';
    res.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return { status: ok ? 'ok' : 'error', checks: { database, redis } };
  }
}
