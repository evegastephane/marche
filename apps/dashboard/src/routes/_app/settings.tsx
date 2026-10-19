import {
  type MediaDto,
  type ShippingSettings,
  type SizeGuide,
  sizeGuideSchema,
  type StoreDto,
  type StoreType,
  type UpdateStoreInput,
  type VerticalSettings,
  verticalSettingsSchema,
} from '@marche/contracts';
import { createFileRoute } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { SingleImage } from '@/features/media/media-gallery';
import { COUNTRIES, CURRENCY_NAMES } from '@/features/onboarding/countries';
import { useMediaById, useUpdateStore } from '@/features/settings/api';
import { useCurrentStore } from '@/features/shell/use-current-store';
import { SizeGuidesCard } from '@/features/verticals/size-guides-card';
import { StoreTypePicker } from '@/features/verticals/store-type-picker';
import {
  FashionServices,
  TechServices,
  type VerticalDraft,
  verticalDraftOf,
} from '@/features/verticals/vertical-settings';
import { ApiError, errorMessage } from '@/shared/api/client';
import { amountToInput, currencyLabel, parseAmount } from '@/shared/lib/format';
import { Led } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { LoadError, PageHeader, Skeleton } from '@/shared/ui/feedback';
import { Field, Input, InputWithSuffix, Select } from '@/shared/ui/field';
import { EASE_OUT, glide } from '@/shared/ui/motion';
import { SiteAddress, siteHost } from '@/shared/ui/site-address';
import { Tabs } from '@/shared/ui/tabs';
import { ThemeSwitch } from '@/shared/ui/theme';

export const Route = createFileRoute('/_app/settings')({
  component: Parametres,
});

function Parametres() {
  const store = useCurrentStore();
  const logo = useMediaById(store.data?.logoMediaId ?? null);
  if (store.error)
    return (
      <LoadError
        message={errorMessage(store.error)}
        onRetry={() => void store.refetch()}
      />
    );
  if (!store.data || (store.data.logoMediaId && logo.isPending)) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-60" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  return (
    <SettingsForm
      key={store.data.id}
      store={store.data}
      logo={logo.data ?? null}
    />
  );
}

const TIMEZONES = [...new Set(COUNTRIES.map((c) => c.timezone))];

/** Messages des réglages de service, par champ. */
const SERVICE_ERRORS: Record<string, string> = {
  days: 'Entre 1 et 90 jours.',
  leadTimeDays: 'Entre 1 et 120 jours.',
  depositPercent: 'Entre 0 et 100 %.',
  measurements: 'Gardez au moins une mesure.',
  defaultMonths: 'Entre 0 et 60 mois.',
};

type Guides = Record<string, SizeGuide>;

/** Guides propres à la boutique, par catégorie (les autres viennent d'Upsell). */
function guidesOf(store: StoreDto): Guides {
  return { ...store.verticalSettings.sizeGuides };
}

/**
 * Paramètres de la boutique. Rien ne part avant « Enregistrer », qui ne s'allume
 * que s'il y a des changements ; seuls les champs modifiés sont envoyés.
 */
function SettingsForm({
  store,
  logo,
}: {
  store: StoreDto;
  logo: MediaDto | null;
}) {
  const update = useUpdateStore();
  const unit = currencyLabel(store.currency);
  const [name, setName] = useState(store.name);
  const [contactEmail, setContactEmail] = useState(store.contactEmail ?? '');
  const [phone, setPhone] = useState(store.phone ?? '');
  const [image, setImage] = useState<MediaDto | null>(logo);
  const [timezone, setTimezone] = useState(store.timezone);
  const [lowStock, setLowStock] = useState(String(store.lowStockDefault));
  const [strategy, setStrategy] = useState<ShippingSettings['strategy']>(
    store.shippingSettings.strategy,
  );
  const [flatRate, setFlatRate] = useState(
    amountToInput(store.shippingSettings.flatRateAmount, store.currency),
  );
  const [threshold, setThreshold] = useState(
    store.shippingSettings.strategy === 'FREE_OVER_THRESHOLD'
      ? amountToInput(store.shippingSettings.thresholdAmount, store.currency)
      : '',
  );
  const [type, setType] = useState<StoreType>(store.type);
  const [guides, setGuides] = useState<Guides>(() => guidesOf(store));
  const [services, setServices] = useState<VerticalDraft>(() =>
    verticalDraftOf(store),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const build = (): {
    input: UpdateStoreInput;
    errors: Record<string, string>;
  } => {
    const errs: Record<string, string> = {};
    const input: UpdateStoreInput = {};
    if (name.trim() !== store.name) {
      if (name.trim().length < 2) errs.name = 'Deux caractères au moins.';
      input.name = name.trim();
    }
    if ((contactEmail.trim() || null) !== store.contactEmail) {
      if (contactEmail.trim() && !/^\S+@\S+\.\S+$/.test(contactEmail.trim()))
        errs.contactEmail = 'Adresse e-mail invalide.';
      input.contactEmail = contactEmail.trim() || null;
    }
    if ((phone.trim() || null) !== store.phone)
      input.phone = phone.trim() || null;
    if ((image?.id ?? null) !== store.logoMediaId)
      input.logoMediaId = image?.id ?? null;
    if (timezone !== store.timezone) input.timezone = timezone;
    const low = Number(lowStock);
    if (low !== store.lowStockDefault) {
      if (!Number.isInteger(low) || low < 0)
        errs.lowStock = 'Nombre entier, 0 ou plus.';
      input.lowStockDefault = low;
    }
    const flat = parseAmount(flatRate || '0', store.currency);
    const over =
      strategy === 'FREE_OVER_THRESHOLD'
        ? parseAmount(threshold, store.currency)
        : null;
    if (flat === null) errs.flatRate = 'Montant invalide.';
    if (strategy === 'FREE_OVER_THRESHOLD' && over === null)
      errs.threshold = 'Indiquez le montant à partir duquel c’est offert.';
    const shipping: ShippingSettings | null =
      flat === null
        ? null
        : strategy === 'FLAT_RATE'
          ? { strategy, flatRateAmount: flat }
          : over === null
            ? null
            : { strategy, flatRateAmount: flat, thresholdAmount: over };
    if (
      shipping &&
      JSON.stringify(shipping) !== JSON.stringify(store.shippingSettings)
    )
      input.shippingSettings = shipping;
    if (type !== store.type) input.type = type;
    let vertical: VerticalSettings | null = null;
    if (JSON.stringify(guides) !== JSON.stringify(guidesOf(store))) {
      const clean = (guide: SizeGuide): SizeGuide => ({
        title: guide.title.trim(),
        columns: guide.columns.map((c) => c.trim()),
        rows: guide.rows.map((cells) => cells.map((c) => c.trim())),
        ...(guide.note?.trim() ? { note: guide.note.trim() } : {}),
      });
      const next = Object.fromEntries(
        Object.entries(guides).map(([slug, guide]) => [slug, clean(guide)]),
      );
      for (const [slug, guide] of Object.entries(next)) {
        if (!sizeGuideSchema.safeParse(guide).success) {
          errs[`sizeGuides.${slug}`] =
            'Donnez un titre et un nom à chaque colonne (2 colonnes au moins).';
        }
      }
      vertical = { ...store.verticalSettings, sizeGuides: next };
    }
    if (JSON.stringify(services) !== JSON.stringify(verticalDraftOf(store))) {
      vertical = { ...(vertical ?? store.verticalSettings), ...services };
      const parsed = verticalSettingsSchema.safeParse(vertical);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const [head, field] = issue.path.map(String);
          if (head === 'conditions')
            errs.conditions =
              'Chaque état porte un nom ; gardez-en un au moins.';
          else if (head && field)
            errs[`${head}.${field}`] =
              SERVICE_ERRORS[field] ?? 'Valeur invalide.';
        }
      }
    }
    if (vertical) input.verticalSettings = vertical;
    return { input, errors: errs };
  };

  const { input: pending } = build();
  const dirty = Object.keys(pending).length > 0;

  const submit = () => {
    const { input, errors: errs } = build();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    update.mutate(input, {
      onSuccess: () => toast('Paramètres enregistrés'),
      onError: (error) => {
        if (error instanceof ApiError && error.code === 'VALIDATION_FAILED')
          setErrors(error.fieldErrors);
        toast.error(errorMessage(error));
      },
    });
  };

  const country =
    COUNTRIES.find((c) => c.code === store.country)?.name ?? store.country;

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <PageHeader
        title="Paramètres"
        subtitle={
          type === 'FASHION'
            ? 'L’identité de votre boutique, la livraison, vos tailles et vos services : échange, sur mesure, rayons.'
            : 'L’identité de votre boutique, la livraison, et vos services : garantie, reprise, IMEI, retours.'
        }
        actions={
          <Button
            type="submit"
            variant="secondary"
            disabled={!dirty}
            loading={update.isPending}
          >
            Enregistrer
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Boutique" />
            <div className="flex flex-col gap-5 px-5 pb-6">
              <Field label="Nom" error={errors.name}>
                {(props) => (
                  <Input
                    {...props}
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
              </Field>
              <SingleImage
                label="Logo"
                hint="Affiché en haut de votre site. Carré ou horizontal."
                media={image}
                onChange={setImage}
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.8125rem] font-[600] text-ink">
                  Adresse du site
                </span>
                <SiteAddress
                  host={siteHost(store.slug)}
                  className="self-start"
                />
                <span className="text-[0.8125rem] text-ink-2">
                  Fixée à la création de la boutique.
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Type de boutique" />
            <div className="flex flex-col gap-3 px-5 pb-6">
              <StoreTypePicker
                label="Type de boutique"
                value={type}
                onChange={setType}
              />
              <AnimatePresence initial={false}>
                {type !== store.type && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: EASE_OUT }}
                    className="overflow-hidden text-[0.875rem] text-ink-2"
                  >
                    Vos articles gardent leur sorte et leur fiche. Les nouveaux
                    articles et votre site suivront le type choisi.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </Card>

          <Card>
            <CardHeader title="Contact" />
            <div className="flex flex-col gap-5 px-5 pb-6">
              <Field
                label="E-mail de contact"
                hint="Affiché sur votre site ; les notifications de commande y sont envoyées."
                error={errors.contactEmail}
              >
                {(props) => (
                  <Input
                    {...props}
                    type="email"
                    autoComplete="email"
                    value={contactEmail}
                    placeholder="contact@maboutique.com"
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                )}
              </Field>
              <Field
                label="Téléphone"
                hint="Affiché sur votre site (WhatsApp de préférence)."
              >
                {(props) => (
                  <Input
                    {...props}
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    maxLength={30}
                    placeholder="+221 77 000 00 00"
                    onChange={(e) => setPhone(e.target.value)}
                  />
                )}
              </Field>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Livraison" />
            <div className="flex flex-col gap-5 px-5 pb-6">
              <Tabs
                label="Frais de livraison"
                items={[
                  { value: 'FLAT_RATE' as const, label: 'Forfait' },
                  {
                    value: 'FREE_OVER_THRESHOLD' as const,
                    label: 'Offerte dès un montant',
                  },
                ]}
                value={strategy}
                onChange={setStrategy}
              />
              <Field
                label="Frais de livraison"
                hint="0 pour une livraison toujours offerte."
                error={errors.flatRate}
              >
                {(props) => (
                  <InputWithSuffix
                    {...props}
                    suffix={unit}
                    inputMode="decimal"
                    value={flatRate}
                    placeholder="0"
                    onChange={(e) => setFlatRate(e.target.value)}
                  />
                )}
              </Field>
              <AnimatePresence initial={false}>
                {strategy === 'FREE_OVER_THRESHOLD' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <Field label="Offerte à partir de" error={errors.threshold}>
                      {(props) => (
                        <InputWithSuffix
                          {...props}
                          suffix={unit}
                          inputMode="decimal"
                          value={threshold}
                          placeholder="50000"
                          onChange={(e) => setThreshold(e.target.value)}
                        />
                      )}
                    </Field>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>

          <Card>
            <CardHeader title="Stock et région" />
            <div className="flex flex-col gap-5 px-5 pb-6">
              <Field
                label="Seuil de stock bas par défaut"
                hint="Un article passe en « stock bas » sous ce nombre, sauf seuil propre fixé dans Stock."
                error={errors.lowStock}
              >
                {(props) => (
                  <Input
                    {...props}
                    inputMode="numeric"
                    className="tabular"
                    value={lowStock}
                    onChange={(e) =>
                      setLowStock(e.target.value.replace(/\D/g, ''))
                    }
                  />
                )}
              </Field>
              <Field
                label="Fuseau horaire"
                hint="Sert aux dates des commandes et aux chiffres du jour."
              >
                {(props) => (
                  <Select
                    {...props}
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    {(TIMEZONES.includes(timezone)
                      ? TIMEZONES
                      : [timezone, ...TIMEZONES]
                    ).map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace('_', ' ')}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <dl className="grid grid-cols-2 gap-4 text-[0.875rem]">
                <div className="flex flex-col gap-0.5">
                  <dt className="font-[600] text-ink">Pays</dt>
                  <dd className="text-ink-2">{country}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="font-[600] text-ink">Devise</dt>
                  <dd className="text-ink-2">
                    {CURRENCY_NAMES[store.currency]}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card>
            <CardHeader title="Apparence" />
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-6">
              <span className="text-ink-2">
                Clair, sombre, ou comme votre appareil.
              </span>
              <ThemeSwitch />
            </div>
          </Card>
        </div>
      </div>

      <section aria-labelledby="services" className="flex flex-col gap-4 pt-2">
        <div className="flex flex-col gap-1">
          <h2 id="services" className="heading text-[1.25rem]">
            {type === 'FASHION'
              ? 'Services de votre boutique de mode'
              : 'Services de votre boutique tech'}
          </h2>
          <p className="max-w-[62ch] text-[0.875rem] text-ink-2">
            {type === 'FASHION'
              ? 'Ce que vous proposez à vos clients en plus des articles. Chaque service allumé s’affiche sur votre site.'
              : 'Ce qui rassure l’acheteur d’un appareil. Chaque service allumé s’affiche sur votre site ou sur vos commandes.'}
          </p>
        </div>
        {type === 'FASHION' ? (
          <FashionServices
            draft={services}
            onChange={setServices}
            errors={errors}
          />
        ) : (
          <TechServices
            draft={services}
            onChange={setServices}
            errors={errors}
          />
        )}
      </section>

      {type === 'FASHION' && (
        <SizeGuidesCard guides={guides} onChange={setGuides} errors={errors} />
      )}

      {/* La touche orange suit le marchand : en bas de l'écran dès qu'il y a des changements. */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={glide}
            className="panel sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center justify-between gap-3 p-4 shadow-float lg:bottom-6"
          >
            <span className="flex items-center gap-2 text-[0.875rem] text-ink-2">
              <Led tone="attention" />
              Modifications non enregistrées
            </span>
            <Button type="submit" variant="primary" loading={update.isPending}>
              Enregistrer
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
