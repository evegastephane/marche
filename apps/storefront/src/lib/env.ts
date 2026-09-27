import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name} (voir apps/storefront/.env.example)`);
  return value;
}

export const env = {
  apiUrl: (process.env.API_INTERNAL_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
  get storefrontToken() {
    return required('STOREFRONT_API_TOKEN');
  },
  get revalidateSecret() {
    return required('REVALIDATE_SECRET');
  },
};
