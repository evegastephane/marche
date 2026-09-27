import { z } from 'zod';
import type { Currency } from './common.js';

export const REPORTING_PERIODS = ['7d', '30d', '90d'] as const;
export type ReportingPeriod = (typeof REPORTING_PERIODS)[number];

export const reportingOverviewQuerySchema = z.object({
  period: z.enum(REPORTING_PERIODS).default('30d'),
});
export type ReportingOverviewQuery = z.infer<typeof reportingOverviewQuerySchema>;

export interface ReportingOverviewDto {
  period: ReportingPeriod;
  currency: Currency;
  /** Somme des commandes passées ou expédiées (hors annulées) sur la période. */
  revenueAmount: number;
  ordersCount: number;
  averageOrderAmount: number;
  ordersToFulfill: number;
  lowStockCount: number;
  outOfStockCount: number;
  topProducts: { productId: string | null; title: string; quantity: number; revenueAmount: number }[];
  daily: { date: string; revenueAmount: number; ordersCount: number }[];
}
