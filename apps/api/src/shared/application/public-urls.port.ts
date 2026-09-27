/** URL publiques de la plateforme (liens des e-mails, URL des sites générés). */
export abstract class PublicUrls {
  /** Site d'une boutique, ex. https://chez-awa.marche.app */
  abstract site(subdomain: string): string;
  /** Page du dashboard, ex. https://app.marche.app/orders/123 */
  abstract dashboard(path: string): string;
}
