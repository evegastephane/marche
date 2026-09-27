import { html, type SafeHtml } from './html.js';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const COLORS = {
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  background: '#F3F4F6',
  primary: '#1F2937',
};

export function button(label: string, href: string): SafeHtml {
  return html`<a href="${href}" style="display:inline-block;background:${COLORS.primary};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">${label}</a>`;
}

export function paragraph(content: unknown): SafeHtml {
  return html`<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${COLORS.text}">${content}</p>`;
}

export function muted(content: unknown): SafeHtml {
  return html`<p style="margin:0 0 8px;font-size:13px;line-height:20px;color:${COLORS.muted}">${content}</p>`;
}

/** Mise en page commune (tableaux + styles en ligne : compatible avec la plupart des clients mail). */
export function layout(input: { storeName: string; preheader: string; title: string; body: SafeHtml }): string {
  return html`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${input.title}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <span style="display:none;max-height:0;overflow:hidden">${input.preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.background};padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${COLORS.border};border-radius:8px">
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid ${COLORS.border};font-size:18px;font-weight:700;color:${COLORS.text}">${input.storeName}</td>
            </tr>
            <tr>
              <td style="padding:28px">
                <h1 style="margin:0 0 20px;font-size:22px;line-height:30px;color:${COLORS.text}">${input.title}</h1>
                ${input.body}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid ${COLORS.border};font-size:12px;color:${COLORS.muted}">
                E-mail envoyé par ${input.storeName} via Marché.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.value;
}

export function linesTable(
  rows: { label: string; detail?: string; quantity: number; amount: string }[],
  totals: { label: string; amount: string; strong?: boolean }[],
): SafeHtml {
  return html`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;border-collapse:collapse;font-size:14px;color:${COLORS.text}">
    ${rows.map(
      (row) => html`<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border}">
          <strong>${row.label}</strong>${row.detail ? html`<br /><span style="color:${COLORS.muted}">${row.detail}</span>` : ''}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};text-align:center;white-space:nowrap">× ${row.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};text-align:right;white-space:nowrap">${row.amount}</td>
      </tr>`,
    )}
    ${totals.map(
      (total) => html`<tr>
        <td colspan="2" style="padding:8px 0;text-align:right;${total.strong ? 'font-weight:700' : `color:${COLORS.muted}`}">${total.label}</td>
        <td style="padding:8px 0;text-align:right;white-space:nowrap;${total.strong ? 'font-weight:700' : ''}">${total.amount}</td>
      </tr>`,
    )}
  </table>`;
}
