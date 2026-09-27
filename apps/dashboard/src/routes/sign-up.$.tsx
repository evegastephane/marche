import { SignUp } from '@clerk/react';
import { createFileRoute } from '@tanstack/react-router';
import { AuthLayout } from '@/features/auth/auth-layout';

export const Route = createFileRoute('/sign-up/$')({
  component: () => (
    <AuthLayout>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </AuthLayout>
  ),
});
