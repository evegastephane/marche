# Revue 1 sur 3 : sécurité et isolation entre boutiques (API)

Relu par : sonnet. Date : 2026-09-30. Branche claude/catalogue-dynamique comparée à main.

**Verdict** : (en cours)

## Bloquants

Aucun trouvé (brouillon en cours de rédaction).

## Majeurs

## Mineurs

## Détails

## À vérifier

## Ce qui a été lu

## Points forts

_Brouillon de travail : notes intermédiaires_

- Clés : hachage SHA-256, recherche par empreinte (pas de comparaison de secret en clair), refus par défaut des routes sans @ApiScope, clé publique refusée sur /api/v1 et clé secrète refusée sur /storefront/v1.
- SQL brut : les 52 lignes ont été passées en revue, toutes filtrent par boutique sauf l'opt-out WhatsApp (voulu, voir plus bas).
