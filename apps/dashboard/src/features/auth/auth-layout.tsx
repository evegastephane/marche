import type { ReactNode } from 'react';
import emblemeTrait from '@/assets/brand/baobab-embleme-trait.png';
import logo from '@/assets/brand/baobab-logo.png';

/** Connexion et inscription : l'enseigne verte à gauche, le formulaire sur le mur chaulé. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="sur-vert enseigne sticky top-3 m-3 hidden h-[calc(100dvh-1.5rem)] min-h-[36rem] flex-col justify-between overflow-hidden p-12 lg:flex">
        <img src={emblemeTrait} alt="" className="w-[min(26rem,70%)] self-center opacity-95" />
        <div className="flex flex-col gap-4">
          <p className="lettrage text-[4.5rem] xl:text-[5.5rem]">
            Votre boutique,
            <br />
            en grand.
          </p>
          <p className="max-w-[40ch] text-[1.0625rem] text-white/85">
            Produits, stock et commandes au même endroit. Votre site se met en ligne en un clic, avec votre stock à
            jour.
          </p>
        </div>
      </section>
      <section className="flex flex-col items-center justify-center gap-8 px-4 py-10">
        <img src={logo} alt="Baobab" className="h-8 w-auto lg:hidden" />
        {children}
      </section>
    </div>
  );
}
