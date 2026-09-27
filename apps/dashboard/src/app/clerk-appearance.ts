/**
 * Habillage des composants Clerk aux couleurs Upsell. Les variables pointent vers nos
 * jetons CSS : les écrans Clerk suivent le thème clair ou sombre sans rechargement.
 */
export const clerkAppearance = {
  cssLayerName: 'clerk',
  variables: {
    colorPrimary: 'var(--brand)',
    colorPrimaryForeground: 'var(--on-brand)',
    colorDanger: 'var(--danger)',
    colorSuccess: 'var(--success)',
    colorWarning: 'var(--sun)',
    colorForeground: 'var(--ink)',
    colorMutedForeground: 'var(--ink-2)',
    colorMuted: 'var(--surface-2)',
    colorBackground: 'var(--surface)',
    colorInput: 'var(--surface)',
    colorInputForeground: 'var(--ink)',
    colorBorder: 'var(--line-strong)',
    colorRing: 'var(--brand)',
    colorNeutral: 'var(--ink)',
    colorShadow: 'rgb(12 26 60 / 0.35)',
    colorModalBackdrop: 'var(--overlay)',
    fontFamily: "'Plus Jakarta Sans Variable', ui-sans-serif, system-ui, sans-serif",
    borderRadius: '0.75rem',
  },
  elements: {
    cardBox: 'shadow-float rounded-3xl border-0',
    card: 'shadow-none',
    headerTitle: 'heading text-[1.5rem]',
    formButtonPrimary:
      'h-11 rounded-full bg-brand bg-none text-[0.9375rem] font-[650] normal-case shadow-none hover:bg-brand-strong after:hidden',
    socialButtonsBlockButton: 'h-11 rounded-full shadow-[inset_0_0_0_1px_var(--color-line-strong)]',
    footer: 'bg-none',
  },
} as const;

/** Sélecteur de boutique et menu du compte dans la barre latérale. */
export const shellAppearance = {
  elements: {
    organizationSwitcherTrigger:
      'w-full justify-between rounded-xl px-2.5 py-2 text-ink hover:bg-surface-2 focus-visible:bg-surface-2',
    organizationPreviewMainIdentifier: 'font-[680] text-ink',
    organizationSwitcherTriggerIcon: 'text-ink-3',
    userButtonTrigger: 'focus:shadow-none',
    userButtonBox: 'text-ink',
    userButtonOuterIdentifier: 'text-ink font-[620]',
  },
} as const;
