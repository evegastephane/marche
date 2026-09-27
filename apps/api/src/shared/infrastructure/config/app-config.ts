import { z } from 'zod';

const optionalString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().optional(),
);

const csv = z
  .string()
  .default('')
  .transform((raw) =>
    raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const secret = z.string().min(16, { error: 'Secret trop court (16 caractères minimum)' });

/** Schéma des variables d'environnement (docs/PLAN-CODE.md §4.3). */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),

    CLERK_SECRET_KEY: optionalString,
    CLERK_JWT_KEY: optionalString,
    CLERK_AUTHORIZED_PARTIES: csv,
    CLERK_WEBHOOK_SIGNING_SECRET: optionalString,

    CORS_ORIGINS: csv,

    S3_ENDPOINT: optionalString,
    S3_REGION: z.string().default('auto'),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    MEDIA_PUBLIC_BASE_URL: z.url(),

    EMAIL_PROVIDER: z.enum(['smtp', 'resend', 'log']).default('smtp'),
    SMTP_URL: optionalString,
    RESEND_API_KEY: optionalString,
    EMAIL_FROM: z.string().min(3).default('Marché <no-reply@marche.localhost>'),

    POSTHOG_API_KEY: optionalString,
    POSTHOG_HOST: z.url().default('https://eu.i.posthog.com'),

    STOREFRONT_API_TOKEN: secret,
    STOREFRONT_INTERNAL_URL: z.url(),
    REVALIDATE_SECRET: secret,
    PREVIEW_TOKEN_SECRET: secret,
    PLATFORM_ROOT_DOMAIN: z.string().min(1),
    DASHBOARD_URL: z.url().default('http://localhost:5173'),
    SITE_URL_SCHEME: z.enum(['http', 'https']).default('https'),

    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),

    BULL_BOARD_USER: optionalString,
    BULL_BOARD_PASSWORD: optionalString,

    OBSERVE_APP_KEY: optionalString,
    OBSERVE_APP_SECRET: optionalString,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (!env.CLERK_SECRET_KEY) {
        ctx.addIssue({ code: 'custom', path: ['CLERK_SECRET_KEY'], message: 'Obligatoire en production' });
      }
      if (!env.CLERK_WEBHOOK_SIGNING_SECRET) {
        ctx.addIssue({
          code: 'custom',
          path: ['CLERK_WEBHOOK_SIGNING_SECRET'],
          message: 'Obligatoire en production',
        });
      }
      if (env.EMAIL_PROVIDER !== 'resend') {
        ctx.addIssue({ code: 'custom', path: ['EMAIL_PROVIDER'], message: '« resend » attendu en production' });
      }
    }
    if (env.EMAIL_PROVIDER === 'smtp' && !env.SMTP_URL) {
      ctx.addIssue({ code: 'custom', path: ['SMTP_URL'], message: 'Obligatoire avec EMAIL_PROVIDER=smtp' });
    }
    if (env.EMAIL_PROVIDER === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'Obligatoire avec EMAIL_PROVIDER=resend' });
    }
    if (Boolean(env.BULL_BOARD_USER) !== Boolean(env.BULL_BOARD_PASSWORD)) {
      ctx.addIssue({
        code: 'custom',
        path: ['BULL_BOARD_PASSWORD'],
        message: 'BULL_BOARD_USER et BULL_BOARD_PASSWORD vont ensemble',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Configuration typée, construite une fois au démarrage. */
export interface AppConfig {
  env: Env['NODE_ENV'];
  isProduction: boolean;
  port: number;
  logLevel: Env['LOG_LEVEL'];
  databaseUrl: string;
  redisUrl: string;
  clerk: {
    secretKey?: string;
    jwtKey?: string;
    authorizedParties: string[];
    webhookSigningSecret?: string;
  };
  cors: { origins: string[] };
  s3: {
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  media: { publicBaseUrl: string };
  email: {
    provider: Env['EMAIL_PROVIDER'];
    smtpUrl?: string;
    resendApiKey?: string;
    from: string;
  };
  posthog: { apiKey?: string; host: string };
  storefront: {
    apiToken: string;
    internalUrl: string;
    revalidateSecret: string;
    previewTokenSecret: string;
    rootDomain: string;
    urlScheme: 'http' | 'https';
  };
  rateLimit: { perMinute: number };
  dashboard: { url: string };
  bullBoard: { user: string; password: string } | null;
  observe: { appKey: string; appSecret: string } | null;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

export class InvalidConfigError extends Error {
  constructor(readonly issues: { path: string; message: string }[]) {
    super(
      `Configuration invalide :\n${issues.map((i) => `  - ${i.path} : ${i.message}`).join('\n')}`,
    );
    this.name = 'InvalidConfigError';
  }
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new InvalidConfigError(
      parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  const env = parsed.data;
  return {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    clerk: {
      secretKey: env.CLERK_SECRET_KEY,
      // Les clés PEM sont souvent écrites sur une ligne avec des « \n » échappés.
      jwtKey: env.CLERK_JWT_KEY?.replace(/\\n/g, '\n'),
      authorizedParties: env.CLERK_AUTHORIZED_PARTIES,
      webhookSigningSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
    },
    cors: { origins: env.CORS_ORIGINS },
    s3: {
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    media: { publicBaseUrl: env.MEDIA_PUBLIC_BASE_URL.replace(/\/+$/, '') },
    email: {
      provider: env.EMAIL_PROVIDER,
      smtpUrl: env.SMTP_URL,
      resendApiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
    },
    posthog: { apiKey: env.POSTHOG_API_KEY, host: env.POSTHOG_HOST },
    storefront: {
      apiToken: env.STOREFRONT_API_TOKEN,
      internalUrl: env.STOREFRONT_INTERNAL_URL.replace(/\/+$/, ''),
      revalidateSecret: env.REVALIDATE_SECRET,
      previewTokenSecret: env.PREVIEW_TOKEN_SECRET,
      rootDomain: env.PLATFORM_ROOT_DOMAIN,
      urlScheme: env.SITE_URL_SCHEME,
    },
    rateLimit: { perMinute: env.RATE_LIMIT_PER_MINUTE },
    dashboard: { url: env.DASHBOARD_URL.replace(/\/+$/, '') },
    bullBoard:
      env.BULL_BOARD_USER && env.BULL_BOARD_PASSWORD
        ? { user: env.BULL_BOARD_USER, password: env.BULL_BOARD_PASSWORD }
        : null,
    observe:
      env.OBSERVE_APP_KEY && env.OBSERVE_APP_SECRET
        ? { appKey: env.OBSERVE_APP_KEY, appSecret: env.OBSERVE_APP_SECRET }
        : null,
  };
}

/** Charge le fichier .env s'il existe (développement) sans écraser l'environnement réel. */
export function loadDotEnv(path = '.env'): void {
  try {
    process.loadEnvFile(path);
  } catch {
    // Pas de .env : les variables viennent de l'environnement (CI, production).
  }
}
