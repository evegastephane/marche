import { useAuth, useClerk, UserButton } from '@clerk/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStoreSchema, type CreateStoreInput, CURRENCIES, type Currency, type StoreDto } from '@marche/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { type ChangeEvent, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import emblemeTrait from '@/assets/brand/baobab-embleme-trait.png';
import logo from '@/assets/brand/baobab-logo.png';
import { COUNTRIES, CURRENCY_NAMES } from '@/features/onboarding/countries';
import { ApiError } from '@/shared/api/client';
import { useApi } from '@/shared/api/use-api';
import { currencyLabel, slugify } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { NomPeint, PLATFORM_ROOT_DOMAIN, PlaqueAdresse, siteHost } from '@/shared/ui/enseigne';
import { Field, Input, Select } from '@/shared/ui/field';

export const Route = createFileRoute('/onboarding')({ component: Onboarding });

function Onboarding() {
  const { isLoaded, isSignedIn, orgId } = useAuth({ treatPendingAsSignedOut: false });
  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/sign-in/$" params={{ _splat: '' }} />;

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <img src={logo} alt="Baobab" className="h-7 w-auto" />
        <div className="flex items-center gap-3">
          {orgId && (
            <Link to="/" className="inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-encre-2 hover:text-encre">
              <ArrowLeft className="size-4" /> Retour au tableau de bord
            </Link>
          )}
          <UserButton />
        </div>
      </header>
      <StoreForm />
    </div>
  );
}

function StoreForm() {
  const api = useApi();
  const { setActive } = useClerk();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: { name: '', slug: '', country: 'SN', currency: 'XOF' },
  });
  const { register, handleSubmit, setValue, setError, control, formState } = form;
  const [name, slug, currency, country] = useWatch({ control, name: ['name', 'slug', 'currency', 'country'] });
  const countryName = COUNTRIES.find((c) => c.code === country)?.name;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const timezone = COUNTRIES.find((c) => c.code === values.country)?.timezone;
      const store = await api<StoreDto>('POST', '/api/v1/stores', { body: { ...values, timezone } });
      await setActive({ organization: store.clerkOrgId });
      queryClient.clear();
      await navigate({ to: '/' });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'STORE_SLUG_TAKEN') {
        setError('slug', { message: error.message });
      } else if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') {
        for (const [path, message] of Object.entries(error.fieldErrors)) {
          setError(path as keyof CreateStoreInput, { message });
        }
      } else {
        setFormError(error instanceof ApiError ? error.message : 'La boutique n’a pas pu être créée. Réessayez.');
      }
    }
  });

  return (
    <div className="mx-auto grid max-w-[76rem] gap-8 px-4 pt-4 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12 lg:pt-10">
      <div className="flex flex-col gap-8 lg:order-2">
        <div className="sur-vert enseigne flex min-h-[15rem] flex-col justify-between gap-8 p-7 sm:min-h-[19rem] sm:p-10 lg:sticky lg:top-10">
          <div className="flex items-start justify-between gap-6">
            <NomPeint name={name} placeholder="Votre boutique" className="text-[3.25rem] sm:text-[4.75rem]" />
            <img src={emblemeTrait} alt="" className="size-14 shrink-0 opacity-90 sm:size-20" />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <PlaqueAdresse host={siteHost(slug)} />
            <span className="rounded-md bg-jaune px-2.5 py-1.5 text-[0.8125rem] font-[760] text-encre">
              {currencyLabel(currency as Currency)}
            </span>
            {countryName && <span className="text-[0.875rem] font-semibold text-white/80">{countryName}</span>}
          </div>
        </div>
        <p className="hidden max-w-[52ch] text-encre-2 lg:block">
          L’adresse devient celle de votre site. Vous pourrez changer le nom plus tard, mais pas la devise : elle fixe
          les prix de tous vos produits.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8 lg:order-1">
        <div className="flex flex-col gap-3">
          <h1 className="lettrage text-[3rem] text-baobab sm:text-[3.75rem]">Peignons votre enseigne</h1>
          <p className="max-w-[48ch] text-[1.0625rem] text-encre-2">
            Quelques informations suffisent pour ouvrir votre boutique. Le reste se règle ensuite.
          </p>
        </div>

        <div className="planche flex flex-col gap-5 p-6 sm:p-7">
          <Field label="Nom de la boutique" error={formState.errors.name?.message}>
            {(props) => (
              <Input
                {...props}
                autoFocus
                autoComplete="organization"
                placeholder="Chez Awa"
                {...register('name', {
                  onChange: (event: ChangeEvent<HTMLInputElement>) => {
                    if (!slugTouched) setValue('slug', slugify(event.target.value), { shouldValidate: formState.isSubmitted });
                  },
                })}
              />
            )}
          </Field>

          <Field
            label="Adresse du site"
            hint={`Votre site sera à ${siteHost(slug)}`}
            error={formState.errors.slug?.message}
          >
            {(props) => (
              <div className="flex items-stretch">
                <Input
                  {...props}
                  className="rounded-r-none"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="chez-awa"
                  {...register('slug', { onChange: () => setSlugTouched(true) })}
                />
                <span className="chiffres inline-flex items-center rounded-r-lg bg-chaux-2 px-3 text-[0.875rem] font-semibold whitespace-nowrap text-encre-2 shadow-[inset_0_0_0_1.5px_var(--color-filet-fort)]">
                  .{PLATFORM_ROOT_DOMAIN}
                </span>
              </div>
            )}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Pays" error={formState.errors.country?.message}>
              {(props) => (
                <Select
                  {...props}
                  {...register('country', {
                    onChange: (event: ChangeEvent<HTMLSelectElement>) => {
                      const choice = COUNTRIES.find((c) => c.code === event.target.value);
                      if (choice) setValue('currency', choice.currency);
                    },
                  })}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Devise" hint="Définitive : elle fixe tous vos prix." error={formState.errors.currency?.message}>
              {(props) => (
                <Select {...props} {...register('currency')}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {CURRENCY_NAMES[c]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          {formError && (
            <p role="alert" className="rounded-lg bg-rouge-50 px-4 py-3 text-[0.875rem] font-medium text-[#7d1f16]">
              {formError}
            </p>
          )}

          <Button type="submit" size="lg" loading={formState.isSubmitting} className="self-start">
            Ouvrir ma boutique <ArrowRight />
          </Button>
        </div>
      </form>
    </div>
  );
}
