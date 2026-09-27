import { describe, expect, it } from 'vitest';
import { escapeHtml, formatMoney, html } from './index.js';
import { renderLowStockAlert, renderMerchantNewOrder, renderOrderConfirmation } from './templates.js';

const normalize = (value: string) => value.replace(/[  ]/g, ' ');

describe('html', () => {
  it('échappe les valeurs interpolées mais pas les fragments sûrs', () => {
    const name = '<script>alert("x")</script>';
    const fragment = html`<b>${name}</b>`;
    expect(html`<p>${fragment}</p>`.value).toBe(
      '<p><b>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</b></p>',
    );
    expect(escapeHtml(`O'Neil & fils`)).toBe('O&#39;Neil &amp; fils');
  });
});

describe('formatMoney', () => {
  it('respecte le nombre de décimales de la devise', () => {
    expect(normalize(formatMoney(2_500_000, 'XOF'))).toBe('2 500 000 F CFA');
    expect(normalize(formatMoney(1990, 'EUR'))).toBe('19,90 €');
  });
});

describe('renderOrderConfirmation', () => {
  const email = renderOrderConfirmation({
    storeName: 'Chez <Awa>',
    orderNumber: 1001,
    customerName: 'Awa Diop',
    currency: 'XOF',
    lines: [{ productTitle: 'Boubou brodé', variantTitle: 'M / Bleu', quantity: 2, lineTotalAmount: 50_000 }],
    subtotalAmount: 50_000,
    shippingAmount: 0,
    totalAmount: 50_000,
    shippingAddress: {
      firstName: 'Awa',
      lastName: 'Diop',
      line1: '12 rue des Almadies',
      city: 'Dakar',
      country: 'SN',
    },
    orderUrl: 'https://chez-awa.marche.test/orders/token',
  });

  it('produit sujet, HTML échappé et version texte', () => {
    expect(email.subject).toBe('Chez <Awa> : commande #1001 confirmée');
    expect(email.html).toContain('Chez &lt;Awa&gt;');
    expect(email.html).not.toContain('<Awa>');
    expect(normalize(email.text)).toContain('- Boubou brodé (M / Bleu) × 2 : 50 000 F CFA');
    expect(email.text).toContain('Livraison : offerte');
    expect(email.text).toContain('https://chez-awa.marche.test/orders/token');
  });
});

describe('autres e-mails', () => {
  it('résume la nouvelle commande pour le marchand', () => {
    const email = renderMerchantNewOrder({
      storeName: 'Boutique',
      orderNumber: 1002,
      customerName: null,
      email: 'client@example.com',
      currency: 'EUR',
      itemsCount: 3,
      totalAmount: 4590,
      orderAdminUrl: 'https://app.marche.test/orders/1',
    });
    expect(normalize(email.subject)).toBe('Nouvelle commande #1002 : 45,90 €');
    expect(email.text).toContain('client@example.com');
  });

  it('distingue stock bas et rupture', () => {
    const base = {
      storeName: 'Boutique',
      productTitle: 'Tee-shirt',
      variantTitle: 'Par défaut',
      sku: 'TS-01',
      threshold: 5,
      inventoryUrl: 'https://app.marche.test/inventory',
    };
    expect(renderLowStockAlert({ ...base, available: 2 }).text).toContain('n’a plus que 2 unités');
    expect(renderLowStockAlert({ ...base, available: 0 }).text).toContain('est en rupture');
  });
});
