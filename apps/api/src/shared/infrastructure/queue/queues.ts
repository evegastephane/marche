import type { DefaultJobOptions } from 'bullmq';

/** Files BullMQ (docs/PLAN-CODE.md §6.5). */
export const QUEUE_NAMES = [
  'outbox-relay',
  'notifications',
  'site-publishing',
  'media',
  'inventory-alerts',
  'analytics',
] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

/** Files alimentées par les événements de domaine (toutes sauf le relais). */
export type EventQueueName = Exclude<QueueName, 'outbox-relay'>;
export const EVENT_QUEUE_NAMES = QUEUE_NAMES.filter(
  (name): name is EventQueueName => name !== 'outbox-relay',
);

export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2_000 },
  // La déduplication par jobId couvre 24 h ; les échecs restent visibles (dead-letter).
  removeOnComplete: { age: 86_400, count: 10_000 },
  removeOnFail: false,
};
