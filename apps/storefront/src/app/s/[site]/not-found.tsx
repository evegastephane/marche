import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-6xl flex-col items-start justify-center gap-5 px-4 sm:px-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Page introuvable</h1>
      <p className="text-lg text-muted">Cette page n’existe pas, ou l’article n’est plus en vente.</p>
      <Link href="/" className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary no-underline">
        Retour à l’accueil
      </Link>
    </div>
  );
}
