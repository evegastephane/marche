/** Fragment HTML déjà sûr (ne sera pas ré-échappé). */
export class SafeHtml {
  constructor(readonly value: string) {}

  toString(): string {
    return this.value;
  }
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

function renderValue(value: unknown): string {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  if (value === null || value === undefined || value === false) return '';
  return escapeHtml(String(value));
}

/**
 * Gabarit HTML : toute valeur interpolée est échappée (noms de produits, adresses…),
 * sauf les fragments SafeHtml produits par ce même gabarit.
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let output = strings[0] ?? '';
  values.forEach((value, index) => {
    output += renderValue(value) + (strings[index + 1] ?? '');
  });
  return new SafeHtml(output);
}
