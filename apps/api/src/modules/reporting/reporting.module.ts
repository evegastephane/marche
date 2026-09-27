import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransactionHost } from '@nestjs-cls/transactional';
import {
  type ReportingOverviewDto,
  type ReportingOverviewQuery,
  reportingOverviewQuerySchema,
  type ReportingPeriod,
} from '@marche/contracts';
import { ActorContext } from '../../shared/application/actor-context.port.js';
import { ADMIN_API } from '../../shared/infrastructure/http/access.decorators.js';
import { ZodQuery } from '../../shared/infrastructure/http/zod-validation.js';
import type { PrismaAdapter } from '../../shared/infrastructure/prisma/transaction.js';
import { StoresFacade } from '../stores/stores.facade.js';
import { StoresModule } from '../stores/stores.module.js';

const PERIOD_DAYS: Record<ReportingPeriod, number> = { '7d': 7, '30d': 30, '90d': 90 };

const toNumber = (value: bigint | number | null | undefined): number => Number(value ?? 0);

/**
 * UC-50 : indicateurs du tableau de bord. Module de lecture seule : il agrège en SQL
 * les tables des autres modules (exception documentée, docs/PLAN-CODE.md §2.2).
 * Le chiffre d'affaires compte les commandes passées ou expédiées (hors brouillons et annulations).
 */
@Injectable()
export class ReportingQueries {
  constructor(
    private readonly txHost: TransactionHost<PrismaAdapter>,
    private readonly stores: StoresFacade,
    private readonly actor: ActorContext,
  ) {}

  async overview(period: ReportingPeriod): Promise<ReportingOverviewDto> {
    const storeId = this.actor.storeId;
    const settings = await this.stores.getSettings(storeId);
    const tz = settings.timezone;
    const days = PERIOD_DAYS[period];
    const tx = this.txHost.tx;
    // Début de période : minuit (heure de la boutique) il y a `days - 1` jours, exprimé en UTC.
    const [{ since }] = await tx.$queryRaw<{ since: Date }[]>`
      SELECT (date_trunc('day', now() AT TIME ZONE ${tz}) - make_interval(days => ${days - 1})) AT TIME ZONE ${tz} AT TIME ZONE 'UTC' AS since`;

    const [totals, toFulfill, stock, top, daily] = await Promise.all([
      tx.$queryRaw<{ revenue: bigint; orders: number }[]>`
        SELECT COALESCE(SUM(total_amount), 0)::bigint AS revenue, COUNT(*)::int AS orders
        FROM orders
        WHERE store_id = ${storeId}::uuid AND status IN ('PLACED', 'FULFILLED') AND placed_at >= ${since}`,
      tx.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM orders WHERE store_id = ${storeId}::uuid AND status = 'PLACED'`,
      tx.$queryRaw<{ low: number; out: number }[]>`
        SELECT
          COUNT(*) FILTER (WHERE il.on_hand - il.reserved <= COALESCE(il.low_stock_threshold, ${settings.lowStockDefault}))::int AS low,
          COUNT(*) FILTER (WHERE il.on_hand - il.reserved <= 0)::int AS out
        FROM inventory_levels il
        JOIN product_variants v ON v.id = il.variant_id
        JOIN products p ON p.id = v.product_id
        WHERE il.store_id = ${storeId}::uuid AND v.track_inventory AND v.archived_at IS NULL AND p.status <> 'ARCHIVED'`,
      tx.$queryRaw<{ product_id: string | null; title: string; quantity: number; revenue: bigint }[]>`
        SELECT v.product_id, MAX(ol.product_title) AS title, SUM(ol.quantity)::int AS quantity,
               SUM(ol.line_total_amount)::bigint AS revenue
        FROM order_lines ol
        JOIN orders o ON o.id = ol.order_id
        LEFT JOIN product_variants v ON v.id = ol.variant_id
        WHERE o.store_id = ${storeId}::uuid AND o.status IN ('PLACED', 'FULFILLED') AND o.placed_at >= ${since}
        GROUP BY v.product_id
        ORDER BY revenue DESC, quantity DESC
        LIMIT 5`,
      tx.$queryRaw<{ day: string; revenue: bigint; orders: number }[]>`
        SELECT to_char(d, 'YYYY-MM-DD') AS day,
               COALESCE(SUM(o.total_amount), 0)::bigint AS revenue,
               COUNT(o.id)::int AS orders
        FROM generate_series(
          (${since}::timestamp AT TIME ZONE 'UTC' AT TIME ZONE ${tz})::date,
          (now() AT TIME ZONE ${tz})::date,
          interval '1 day'
        ) AS d
        LEFT JOIN orders o
          ON o.store_id = ${storeId}::uuid
         AND o.status IN ('PLACED', 'FULFILLED')
         AND (o.placed_at AT TIME ZONE 'UTC' AT TIME ZONE ${tz})::date = d::date
        GROUP BY d
        ORDER BY d`,
    ]);

    const revenueAmount = toNumber(totals[0]?.revenue);
    const ordersCount = totals[0]?.orders ?? 0;
    return {
      period,
      currency: settings.currency,
      revenueAmount,
      ordersCount,
      averageOrderAmount: ordersCount > 0 ? Math.round(revenueAmount / ordersCount) : 0,
      ordersToFulfill: toFulfill[0]?.count ?? 0,
      lowStockCount: stock[0]?.low ?? 0,
      outOfStockCount: stock[0]?.out ?? 0,
      topProducts: top.map((row) => ({
        productId: row.product_id,
        title: row.title,
        quantity: row.quantity,
        revenueAmount: toNumber(row.revenue),
      })),
      daily: daily.map((row) => ({ date: row.day, revenueAmount: toNumber(row.revenue), ordersCount: row.orders })),
    };
  }
}

@ApiTags('reporting')
@ApiBearerAuth()
@Controller(`${ADMIN_API}/reporting`)
export class ReportingController {
  constructor(private readonly reporting: ReportingQueries) {}

  /** UC-50 : chiffre d'affaires, commandes, panier moyen, stock bas, top produits, série journalière. */
  @Get('overview')
  overview(@ZodQuery(reportingOverviewQuerySchema) query: ReportingOverviewQuery): Promise<ReportingOverviewDto> {
    return this.reporting.overview(query.period);
  }
}

@Module({
  imports: [StoresModule],
  controllers: [ReportingController],
  providers: [ReportingQueries],
})
export class ReportingModule {}
