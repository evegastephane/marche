import type { Metadata } from 'next';
import Link from 'next/link';
import { KeysConsole } from '@/components/developers/keys-console';

export const metadata: Metadata = { title: 'Mes clés' };

export default function KeysPage() {
  return (
    <main className="mx-auto flex w-full max-w-[76rem] flex-col gap-8 px-4 pt-10 pb-24 sm:px-6 lg:px-10 lg:pt-14">
      <header className="flex max-w-[62ch] flex-col gap-3">
        <h1 className="up-display-title up-rise text-[2.25rem] sm:text-[2.75rem]">Mes clés</h1>
        <p className="up-rise text-[1.0625rem] leading-[1.6] text-[var(--up-ink-2)] [--up-delay:60ms]">
          Créez une clé publique pour votre site, ou une clé secrète pour vos serveurs. Comment s’en servir : voir le{' '}
          <Link href="/developers" className="up-link">
            démarrage
          </Link>
          .
        </p>
      </header>
      <KeysConsole />
    </main>
  );
}
