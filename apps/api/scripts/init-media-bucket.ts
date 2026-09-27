/**
 * Prépare le bucket d'images en local (RustFS) : création, lecture publique, CORS pour les PUT
 * pré-signés envoyés depuis le dashboard. En production, le bucket R2 se configure une fois dans Cloudflare.
 */
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { createS3Client } from '../src/modules/media/infrastructure/s3-object-storage.js';
import { loadConfig, loadDotEnv } from '../src/shared/infrastructure/config/app-config.js';

loadDotEnv();
const config = loadConfig();
const client = createS3Client(config);
const Bucket = config.s3.bucket;

try {
  await client.send(new HeadBucketCommand({ Bucket }));
  console.log(`• Bucket « ${Bucket} » déjà présent`);
} catch {
  await client.send(new CreateBucketCommand({ Bucket }));
  console.log(`✓ Bucket « ${Bucket} » créé`);
}

await client.send(
  new PutBucketPolicyCommand({
    Bucket,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'LecturePublique',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${Bucket}/*`],
        },
      ],
    }),
  }),
);
console.log('✓ Lecture publique des images activée');

const origins = config.cors.origins.length > 0 ? config.cors.origins : ['http://localhost:5173'];
try {
  await client.send(
    new PutBucketCorsCommand({
      Bucket,
      CORSConfiguration: {
        CORSRules: [
          { AllowedMethods: ['PUT'], AllowedOrigins: origins, AllowedHeaders: ['*'], MaxAgeSeconds: 3600 },
          { AllowedMethods: ['GET', 'HEAD'], AllowedOrigins: ['*'], AllowedHeaders: ['*'], MaxAgeSeconds: 3600 },
        ],
      },
    }),
  );
  console.log(`✓ CORS : PUT autorisé depuis ${origins.join(', ')}`);
} catch (error) {
  console.warn(`! CORS non configuré (${error instanceof Error ? error.message : String(error)})`);
}
