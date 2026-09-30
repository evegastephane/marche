/**
 * Origines acceptées en plus de CORS_ORIGINS sur /storefront/v1 : celles que les boutiques déclarent
 * pour leurs clés publiques pk_ (fronts tiers). Implémenté par le module developers.
 */
export abstract class DynamicCorsOrigins {
  abstract isAllowedOrigin(origin: string): Promise<boolean>;
}
