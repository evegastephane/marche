import { SignIn } from '@clerk/react';
import { createFileRoute } from '@tanstack/react-router';
import { AuthLayout } from '@/features/auth/auth-layout';

export const Route = createFileRoute('/sign-in/$')({
  component: () => (
    <AuthLayout>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </AuthLayout>
  ),
});
