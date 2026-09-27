const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:5173';

/** Domaine racine de la plateforme : les boutiques vivent sur leurs sous-domaines. */
export default function PlatformHome() {
  return (
    <main className="flex min-h-dvh flex-col items-start justify-center gap-6 bg-[#034f32] px-6 text-white sm:px-16">
      <p className="text-5xl font-extrabold tracking-tight uppercase sm:text-7xl">Baobab</p>
      <p className="max-w-[46ch] text-lg text-white/85">
        Chaque boutique Baobab a son site à sa propre adresse, par exemple chez-awa.
        {process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3001'}.
      </p>
      <a href={DASHBOARD_URL} className="rounded-lg bg-white px-5 py-3 font-semibold text-[#034f32] no-underline">
        Ouvrir le tableau de bord marchand
      </a>
    </main>
  );
}
