import './styles.css';
import { frFR } from '@clerk/localizations';
import { ClerkProvider } from '@clerk/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { clerkAppearance } from './app/clerk-appearance';
import { queryClient, router } from './app/router';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
if (!publishableKey) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY manquant : voir apps/dashboard/.env.example');
}

const root = document.getElementById('root');
if (!root) throw new Error('Élément #root introuvable');

createRoot(root).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={publishableKey}
      localization={frFR}
      appearance={clerkAppearance}
      routerPush={(to) => router.navigate({ to })}
      routerReplace={(to) => router.navigate({ to, replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/sign-in"
      // Sans boutique active, Clerk demande de choisir une organisation : c'est notre création de boutique.
      taskUrls={{ 'choose-organization': '/onboarding' }}
    >
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <RouterProvider router={router} />
          <Toaster
            position="bottom-center"
            offset={{ bottom: 88 }}
            toastOptions={{
              classNames: {
                toast:
                  '!rounded-lg !bg-encre !text-white !border-0 !shadow-flottant !font-sans !text-[0.9375rem] !gap-3',
                description: '!text-white/75',
                actionButton: '!bg-jaune !text-encre !font-bold',
              },
            }}
          />
        </MotionConfig>
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
);
