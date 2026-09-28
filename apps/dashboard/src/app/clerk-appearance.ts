/**
 * Habillage des écrans Clerk dans le monde « L'instrument » : connexion et inscription,
 * fenêtres « Gérer mon compte » (profil, e-mails, sécurité) et « Gérer la boutique » (réglages, membres).
 * Les variables pointent vers nos jetons CSS par des alias --up-* (voir styles.css) : tout suit le thème
 * clair ou sombre sans rechargement.
 * Les menus du compte et des boutiques sont les nôtres (features/shell) ; ici, seulement ce que Clerk dessine.
 */

const key = 'bg-key text-ink shadow-[0_0_0_1px_var(--color-line-strong),var(--shadow-key)]';
const well = 'bg-surface-2 shadow-[var(--shadow-well),inset_0_0_0_1px_var(--color-line)]';

export const clerkAppearance = {
  cssLayerName: 'clerk',
  options: {
    socialButtonsVariant: 'blockButton',
    // Le bandeau « Development mode » n'existe que sur l'instance de développement : on le masque ici.
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    colorPrimary: 'var(--up-accent)',
    colorPrimaryForeground: 'var(--up-on-accent)',
    colorDanger: 'var(--up-danger)',
    colorSuccess: 'var(--up-ink)',
    colorWarning: 'var(--up-accent)',
    colorForeground: 'var(--up-ink)',
    colorMutedForeground: 'var(--up-ink-2)',
    colorMuted: 'var(--up-surface-2)',
    colorBackground: 'var(--up-surface)',
    colorInput: 'var(--up-surface-2)',
    colorInputForeground: 'var(--up-ink)',
    colorBorder: 'var(--up-line-strong)',
    colorRing: 'var(--up-ink)',
    colorNeutral: 'var(--up-ink)',
    colorShadow: 'rgb(16 17 21 / 0.3)',
    colorModalBackdrop: 'var(--up-overlay)',
    fontFamily: "'Hanken Grotesk Variable', ui-sans-serif, system-ui, sans-serif",
    fontWeight: { normal: 400, medium: 560, semibold: 600, bold: 650 },
    borderRadius: '0.7rem',
  },
  elements: {
    // Cartes et en-têtes
    cardBox: 'rounded-2xl shadow-none ring-1 ring-line',
    card: 'shadow-none',
    headerTitle: 'heading text-[1.375rem]',
    headerSubtitle: 'text-ink-2',
    footer: 'bg-none',
    footerActionLink: 'font-[600] text-ink underline underline-offset-4 hover:text-accent-ink',
    dividerLine: 'bg-line',

    // Touches et champs
    formButtonPrimary:
      'h-11 rounded-[0.7rem] bg-accent bg-none text-on-accent text-[0.9375rem] font-[600] normal-case shadow-key hover:bg-accent-strong after:hidden',
    formButtonReset: 'rounded-[0.7rem] font-[560] text-ink-2 hover:bg-surface-2 hover:text-ink',
    socialButtonsBlockButton: `h-11 rounded-[0.7rem] ${key} hover:bg-surface-2`,
    formFieldInput: 'shadow-[var(--shadow-well),inset_0_0_0_1px_var(--color-line)]',
    formFieldLabel: 'font-[600] text-ink',
    selectButton: `rounded-[0.7rem] ${well}`,
    selectOptionsContainer: 'rounded-[14px] bg-surface shadow-float ring-1 ring-line',
    selectOption: 'rounded-[0.6rem]',
    otpCodeFieldInput: 'rounded-[0.6rem]',
    identityPreviewEditButton: 'text-ink underline underline-offset-4',
    alert: 'rounded-xl',

    // Fenêtres « Gérer mon compte » et « Gérer la boutique » : une seule feuille blanche,
    // la colonne de navigation séparée par un filet, sans carte dans la carte.
    modalContent: 'overflow-hidden rounded-2xl shadow-float ring-1 ring-line',
    modalCloseButton: 'rounded-[0.7rem] text-ink-2 hover:bg-surface-2 hover:text-ink',
    navbar: 'bg-surface bg-none shadow-none border-0 border-r border-line',
    navbarButton: 'h-10 rounded-[0.7rem] px-3 font-[560] text-ink-2 hover:bg-surface-2 hover:text-ink',
    navbarButton__active: `${key} hover:bg-key`,
    navbarButtonIcon: 'text-ink-3',
    navbarMobileMenuButton: 'rounded-[0.7rem] font-[560]',
    scrollBox: 'rounded-none border-0 bg-surface shadow-none',
    pageScrollBox: 'rounded-none bg-surface',
    profileSectionTitleText: 'heading text-[0.9375rem]',
    profileSectionPrimaryButton: 'rounded-[0.7rem] font-[560] text-ink hover:bg-surface-2',
    badge: 'rounded-md bg-surface-2 font-[560] text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line)]',
    menuButton: 'rounded-[0.7rem] hover:bg-surface-2',
    menuList: 'rounded-[14px] bg-surface p-1.5 shadow-float ring-1 ring-line',
    menuItem: 'rounded-[0.6rem] font-[560] text-ink hover:bg-surface-2',
    tableHead: 'legend',
    tabButton: 'font-[560]',
    organizationPreviewAvatarBox: 'rounded-[0.55rem]',
    avatarImageActionsUpload: `rounded-[0.7rem] ${key}`,
    membersPageInviteButton: 'rounded-[0.7rem]',
  },
} as const;
