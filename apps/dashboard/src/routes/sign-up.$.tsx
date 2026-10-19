import { SignUp } from '@clerk/react';
import { createFileRoute } from '@tanstack/react-router';
import { AuthLayout } from '@/features/auth/auth-layout';
import { rememberStoreName } from '@/features/onboarding/pending-store-name';

// Nom tapé sur l'accueil du site vitrine (`?boutique=` sur l'adresse d'arrivée, inscription ou ouverture de
// boutique) : lu une fois au chargement de l'app, repris dans le formulaire d'ouverture de boutique.
if (typeof window !== 'undefined') rememberStoreName(window.location.search);

export const Route = createFileRoute('/sign-up/$')({
  component: () => (
    <AuthLayout>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </AuthLayout>
  ),
});
