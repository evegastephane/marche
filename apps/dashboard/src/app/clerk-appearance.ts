/** Habillage des composants Clerk dans le monde « Enseigne peinte ». */
export const clerkAppearance = {
  cssLayerName: 'clerk',
  variables: {
    colorPrimary: '#034f32',
    colorPrimaryForeground: '#ffffff',
    colorDanger: '#c8372a',
    colorSuccess: '#034f32',
    colorWarning: '#f2b31b',
    colorForeground: '#14201a',
    colorMutedForeground: '#45554b',
    colorBackground: '#fbfcf8',
    colorInput: '#ffffff',
    colorInputForeground: '#14201a',
    colorBorder: '#aebbb0',
    colorRing: '#034f32',
    colorModalBackdrop: 'rgb(20 32 26 / 0.45)',
    fontFamily: "'Archivo Variable', ui-sans-serif, system-ui, sans-serif",
    borderRadius: '0.5rem',
  },
  elements: {
    cardBox: 'shadow-none rounded-xl',
    card: 'shadow-none',
    headerTitle: 'titre text-[1.6rem]',
    formButtonPrimary:
      'h-11 bg-baobab bg-none text-[0.9375rem] font-[650] normal-case shadow-none hover:bg-baobab-900 after:hidden',
    socialButtonsBlockButton: 'h-11 shadow-[inset_0_0_0_1.5px_var(--color-filet-fort)]',
    footer: 'bg-none',
  },
} as const;

/** Sélecteur de boutique et menu du compte posés sur la planche verte. */
export const onGreen = {
  elements: {
    organizationSwitcherTrigger:
      'w-full justify-between rounded-lg px-2.5 py-2 text-white hover:bg-white/10 focus-visible:bg-white/10 [&_*]:text-white',
    organizationPreviewMainIdentifier: 'font-[680] text-white',
    organizationSwitcherTriggerIcon: 'text-white/80',
    userButtonTrigger: 'focus:shadow-none',
    userButtonBox: 'text-white',
    userButtonOuterIdentifier: 'text-white font-[620]',
  },
} as const;
