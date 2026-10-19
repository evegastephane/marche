/**
 * Règles WhatsApp pures : format des numéros (partagé avec le site, dans les contrats),
 * progression des statuts, désinscription.
 */

export { toWhatsAppNumber } from '@marche/contracts';

/** Suffixe de comparaison d'un numéro (les 9 derniers chiffres) : insensible à l'indicatif et aux espaces. */
export function phoneSuffix(number: string): string {
  return number.replace(/\D/g, '').slice(-9);
}

export type MessageStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

const RANK: Record<MessageStatus, number> = { QUEUED: 0, SENT: 1, DELIVERED: 2, READ: 3, FAILED: 1 };

/**
 * Les notifications de Meta peuvent arriver dans le désordre : un statut ne recule jamais
 * (« lu » ne redevient pas « délivré »). Un échec n'écrase qu'un message pas encore délivré.
 */
export function nextStatus(current: MessageStatus, incoming: MessageStatus): MessageStatus {
  if (incoming === 'FAILED') return RANK[current] < RANK.DELIVERED ? 'FAILED' : current;
  if (current === 'FAILED' && incoming !== 'SENT') return incoming;
  return RANK[incoming] > RANK[current] ? incoming : current;
}

const STOP_WORDS = new Set(['stop', 'arret', 'arreter', 'desabonner', 'desinscrire', 'unsubscribe']);

/** « STOP », « Arrêt », « stop. » : le client ne veut plus recevoir de campagnes. */
export function isOptOutMessage(text: string): boolean {
  const word = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return STOP_WORDS.has(word);
}
