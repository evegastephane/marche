import { type CatalogImportReportDto, type CatalogImportSummaryDto, MAX_IMPORT_BYTES } from '@marche/contracts';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Download, FileSpreadsheet } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type DragEvent, useId, useState } from 'react';
import { toast } from 'sonner';
import { useCatalogTemplate, useImportCatalog } from '@/features/products/api';
import { ApiError, errorMessage } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { plural } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/ui/animated-number';
import { Led } from '@/shared/ui/badge';
import { Button, buttonClasses } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import { PageHeader } from '@/shared/ui/feedback';
import { glide, riseIn } from '@/shared/ui/motion';

export const Route = createFileRoute('/_app/products/import')({
  component: ImportCatalogue,
});

const SHEET_LABELS: Record<string, string> = {
  PRODUCTS: 'Produits',
  VARIANTS: 'Variantes',
  ATTRIBUTES: 'Attributs',
  ATTRIBUTE_VALUES: 'Valeurs',
  UNITS: 'IMEI',
};

const COUNTERS: { key: keyof CatalogImportSummaryDto; label: string }[] = [
  { key: 'productsCreated', label: 'Produits créés' },
  { key: 'productsUpdated', label: 'Produits mis à jour' },
  { key: 'variantsCreated', label: 'Variantes créées' },
  { key: 'variantsUpdated', label: 'Variantes mises à jour' },
  { key: 'stockAdjusted', label: 'Stocks ajustés' },
  { key: 'unitsReceived', label: 'IMEI reçus' },
  { key: 'attributesCreated', label: 'Attributs créés' },
  { key: 'valuesCreated', label: 'Valeurs ajoutées' },
];

function size(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}

/** Rapport d'un refus : dans la réponse (vérification) ou dans l'erreur 422 (import). */
function reportOf(error: unknown): CatalogImportReportDto | null {
  if (!(error instanceof ApiError) || error.code !== 'IMPORT_REJECTED') return null;
  return (error.problem?.details as CatalogImportReportDto | undefined) ?? null;
}

function ImportCatalogue() {
  const template = useCatalogTemplate();
  const importer = useImportCatalog();
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [report, setReport] = useState<CatalogImportReportDto | null>(null);
  const [done, setDone] = useState<CatalogImportReportDto | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const pick = (next: File | undefined) => {
    setReport(null);
    setDone(null);
    setFileError(null);
    if (!next) return;
    if (!next.name.toLowerCase().endsWith('.xlsx')) return setFileError('Un classeur Excel (.xlsx) est attendu.');
    if (next.size > MAX_IMPORT_BYTES) return setFileError(`Fichier de ${size(next.size)} : 5 Mo au plus.`);
    setFile(next);
  };

  const run = (dryRun: boolean) => {
    if (!file) return;
    importer.mutate(
      { file, dryRun },
      {
        onSuccess: (result) => {
          if (dryRun) return setReport(result);
          setDone(result);
          setReport(null);
          setFile(null);
          toast('Catalogue importé', {
            description: `${plural(result.summary.productsCreated, 'produit créé', 'produits créés')}, ${plural(result.summary.productsUpdated, 'mis à jour', 'mis à jour')}.`,
          });
        },
        onError: (error) => {
          const rejected = reportOf(error);
          if (rejected) setReport(rejected);
          else toast.error(errorMessage(error));
        },
      },
    );
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files[0]);
  };

  const ready = report?.ok === true;

  return (
    <div className="flex flex-col gap-6">
      <motion.div variants={riseIn} className="self-start">
        <Link to="/products" className="group inline-flex items-center gap-1.5 text-[0.875rem] font-[560] text-ink-2 no-underline hover:text-ink">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.8} /> Produits
        </Link>
      </motion.div>
      <PageHeader
        title="Importer un catalogue"
        subtitle="Des centaines de produits d’un coup, depuis Excel. Rien n’est écrit tant que le fichier a un défaut."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader
              title="1 · Le modèle"
              actions={
                <Button size="sm" variant="secondary" icon={<Download />} loading={template.isPending} onClick={() => template.mutate(undefined, { onError: (error) => toast.error(errorMessage(error)) })}>
                  Télécharger
                </Button>
              }
            />
            <div className="flex flex-col gap-2 px-5 pb-5 text-[0.9375rem] text-ink-2">
              <p>
                Il reprend vos catégories et vos attributs : une colonne par champ de fiche technique, une par axe de variante.
              </p>
              <p>
                <span className="font-[600] text-ink">Produits</span> une ligne par modèle ·{' '}
                <span className="font-[600] text-ink">Variantes</span> prix, stock et axes ·{' '}
                <span className="font-[600] text-ink">IMEI</span> pour les articles suivis à l’unité.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="2 · Votre fichier" />
            <div className="flex flex-col gap-3 px-5 pb-5">
              <label
                htmlFor={inputId}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  'well flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-6 py-9 text-center transition-shadow duration-200',
                  dragging && 'shadow-[var(--shadow-well),inset_0_0_0_1.5px_var(--color-ink)]',
                )}
              >
                <FileSpreadsheet className="size-7 text-ink-2" strokeWidth={1.6} aria-hidden />
                {file ? (
                  <>
                    <span className="font-[600] break-all text-ink">{file.name}</span>
                    <span className="text-[0.8125rem] text-ink-2">{size(file.size)} · cliquez pour en choisir un autre</span>
                  </>
                ) : (
                  <>
                    <span className="font-[600] text-ink">Déposez le classeur ici, ou choisissez-le</span>
                    <span className="text-[0.8125rem] text-ink-2">Excel (.xlsx) · 5 Mo au plus</span>
                  </>
                )}
                <input
                  id={inputId}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  onChange={(event) => {
                    pick(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
              {fileError && (
                <p role="alert" className="text-[0.8125rem] font-[560] text-danger-ink">
                  {fileError}
                </p>
              )}
            </div>
          </Card>

          <AnimatePresence mode="wait" initial={false}>
            {(report ?? done) && (
              <motion.div key={done ? 'fait' : report?.ok ? 'pret' : 'defauts'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={glide}>
                <Report report={(done ?? report) as CatalogImportReportDto} applied={Boolean(done)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-10">
          <Card className="flex flex-col gap-4 p-5">
            <p className="heading text-[1rem]">3 · Vérifier puis importer</p>
            <ol className="flex flex-col gap-2.5 text-[0.875rem]">
              {[
                { label: 'Fichier choisi', on: Boolean(file) || Boolean(done) },
                { label: 'Vérifié sans défaut', on: ready || Boolean(done) },
                { label: 'Importé', on: Boolean(done) },
              ].map((step) => (
                <li key={step.label} className={cn('flex items-center gap-2.5', step.on ? 'text-ink' : 'text-ink-3')}>
                  <Led tone={step.on ? 'on' : 'off'} />
                  {step.label}
                </li>
              ))}
            </ol>
            {ready ? (
              <Button variant="primary" size="lg" className="w-full" loading={importer.isPending} onClick={() => run(false)}>
                Importer
              </Button>
            ) : (
              <Button
                variant={file ? 'primary' : 'secondary'}
                size="lg"
                className="w-full"
                disabled={!file}
                loading={importer.isPending}
                onClick={() => run(true)}
              >
                Vérifier le fichier
              </Button>
            )}
            {done && (
              <Link to="/products" search={{ status: 'all' }} className={buttonClasses('secondary', 'md', 'w-full')}>
                Voir les produits
              </Link>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Report({ report, applied }: { report: CatalogImportReportDto; applied: boolean }) {
  if (!report.ok) {
    return (
      <Card>
        <CardHeader
          title={`${plural(report.issues.length, 'défaut', 'défauts')} à corriger`}
          actions={
            <span className="flex items-center gap-2 text-[0.8125rem] text-ink-2">
              <Led tone="attention" /> Rien n’a été écrit
            </span>
          }
        />
        <div className="overflow-x-auto px-2 pb-3">
          <table className="w-full border-collapse text-left text-[0.875rem]">
            <thead>
              <tr className="legend">
                <th className="px-3 pb-2 font-[600]">Feuille</th>
                <th className="px-3 pb-2 text-right font-[600]">Ligne</th>
                <th className="px-3 pb-2 font-[600]">Colonne</th>
                <th className="px-3 pb-2 font-[600]">À corriger</th>
              </tr>
            </thead>
            <tbody>
              {report.issues.map((issue, index) => (
                <tr key={index} className="border-t border-line align-top">
                  <td className="px-3 py-2.5 whitespace-nowrap">{issue.sheet ? (SHEET_LABELS[issue.sheet] ?? issue.sheet) : 'Fichier'}</td>
                  <td className="tabular px-3 py-2.5 text-right">{issue.row ?? '—'}</td>
                  <td className="tabular px-3 py-2.5 whitespace-nowrap text-ink-2">{issue.column ?? '—'}</td>
                  <td className="min-w-[16rem] px-3 py-2.5 font-[560]">{issue.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }
  const shown = COUNTERS.filter((counter) => report.summary[counter.key] > 0);
  return (
    <section aria-label={applied ? 'Import terminé' : 'Vérification réussie'} className="display-window flex flex-col overflow-hidden rounded-[1.25rem]">
      <div className="flex items-center gap-2.5 border-b border-display-line px-5 py-3.5">
        <Led tone="on" />
        <span className="legend">{applied ? 'Importé' : 'Prêt à importer · aucun défaut'}</span>
      </div>
      <dl className="grid grid-cols-2 gap-px sm:grid-cols-4">
        {(shown.length > 0 ? shown : COUNTERS.slice(0, 2)).map((counter) => (
          <div key={counter.key} className="flex flex-col gap-1.5 px-5 py-4">
            <dt className="legend">{counter.label}</dt>
            <dd className="readout text-[1.75rem]">
              <AnimatedNumber value={report.summary[counter.key]} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
