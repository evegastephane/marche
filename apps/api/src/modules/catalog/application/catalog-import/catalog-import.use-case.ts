import { Injectable } from '@nestjs/common';
import {
  type CatalogImportReportDto,
  type CatalogImportSummaryDto,
  categoryTracksUnits,
  createAttributeSchema,
  type CreateAttributeInput,
  createProductSchema,
  type CreateProductInput,
  type Currency,
  IMPORT_COLUMNS,
  IMPORT_REQUIRED_COLUMNS,
  type ImportIssueDto,
  type ImportSheet,
  type ProductDto,
  type ProductSpecs,
  publishProblems,
  resolveCategoryAttributes,
  serialSchema,
  slugify,
  type TaxonomyAttribute,
  type TaxonomyLink,
  type UnitInput,
  updateProductSchema,
  type UpdateProductInput,
  validateSpecs,
  validateVariantOptions,
  attributeValueInputSchema,
  type AttributeValueInput,
  canonicalValue,
  valueCode,
  valueKey,
  type VariantInput,
} from '@marche/contracts';
import { ActorContext } from '../../../../shared/application/actor-context.port.js';
import { UnitOfWork } from '../../../../shared/application/unit-of-work.port.js';
import { DomainError, ValidationError } from '../../../../shared/domain/domain-error.js';
import { InventoryFacade } from '../../../inventory/inventory.facade.js';
import { StoresFacade } from '../../../stores/stores.facade.js';
import { ProductRepository } from '../../domain/catalog.repositories.js';
import { BrandUseCases } from '../brand-collection.use-cases.js';
import { CatalogReadModel } from '../catalog.read-model.js';
import { ChangeProductStatusUseCase, CreateProductUseCase, UpdateProductUseCase } from '../product.use-cases.js';
import { AttributeUseCases, CategoryUseCases, TaxonomyContextService } from '../taxonomy.use-cases.js';
import { CatalogWorkbook, type WorkbookRow, type WorkbookSheet } from './catalog-workbook.port.js';
import {
  amount,
  attributeForColumn,
  attributeType,
  integer,
  isBlank,
  list,
  publishFlag,
  specCell,
  text,
  yesNo,
} from './import-cells.js';

const IMPORT_TIMEOUT_MS = 120_000;
const IMPORT_REASON = 'Import Excel';

interface Located {
  sheet: ImportSheet;
  row: number;
}

interface PlannedAttribute extends Located {
  input: CreateAttributeInput;
  /** Catégories auxquelles le rattacher (en plus de la première, passée à la création). */
  links: { categoryId: string; required: boolean }[];
}

interface PlannedValue extends Located {
  attributeSlug: string;
  input: AttributeValueInput;
}

interface PlannedProduct extends Located {
  reference: string;
  existing: ProductDto | null;
  input: CreateProductInput | UpdateProductInput;
  /** Statut voulu ; null = inchangé. */
  publish: boolean | null;
  /** Variantes existantes à ramener à un stock cible (hors suivi à l'unité). */
  adjustments: { variantId: string; delta: number; located: Located }[];
  /** IMEI reçus sur des variantes existantes suivies à l'unité. */
  receptions: { variantId: string; units: UnitInput[]; located: Located }[];
  /** Ligne VARIANTS de chaque variante envoyée (pour situer une erreur de schéma). */
  variantRows: Located[];
  newVariants: number;
  updatedVariants: number;
}

interface Plan {
  attributes: PlannedAttribute[];
  values: PlannedValue[];
  brands: Map<string, string>;
  products: PlannedProduct[];
}

const EMPTY_SUMMARY: CatalogImportSummaryDto = {
  attributesCreated: 0,
  valuesCreated: 0,
  productsCreated: 0,
  productsUpdated: 0,
  variantsCreated: 0,
  variantsUpdated: 0,
  stockAdjusted: 0,
  unitsReceived: 0,
};

/** Erreur survenue pendant l'écriture, rattachée à la ligne qui l'a causée. */
class ImportStepError extends Error {
  constructor(
    readonly located: Located,
    readonly cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : 'Écriture refusée');
  }
}

/**
 * Import du catalogue (étape 6) : tout le classeur est lu et vérifié ligne par ligne, toutes les erreurs
 * sont rassemblées ; sans erreur, tout est écrit dans une seule transaction (attributs, valeurs, marques,
 * produits, variantes, stock cible, IMEI). Réimporter le même fichier ne crée rien de plus.
 */
@Injectable()
export class CatalogImportUseCase {
  constructor(
    private readonly workbook: CatalogWorkbook,
    private readonly taxonomy: TaxonomyContextService,
    private readonly attributeUseCases: AttributeUseCases,
    private readonly categoryUseCases: CategoryUseCases,
    private readonly brandUseCases: BrandUseCases,
    private readonly readModel: CatalogReadModel,
    private readonly products: ProductRepository,
    private readonly createProduct: CreateProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
    private readonly changeStatus: ChangeProductStatusUseCase,
    private readonly inventory: InventoryFacade,
    private readonly stores: StoresFacade,
    private readonly actor: ActorContext,
    private readonly uow: UnitOfWork,
  ) {}

  /** Modèle vierge : feuilles, colonnes des attributs de la boutique, catégories en référence. */
  async template(): Promise<Buffer> {
    const [snapshot, store] = await Promise.all([this.taxonomy.snapshot(), this.stores.getSettings(this.actor.storeId)]);
    return this.workbook.template({ storeName: store.name, currency: store.currency, ...snapshot });
  }

  async run(buffer: Buffer, dryRun: boolean): Promise<CatalogImportReportDto> {
    const parsed = await this.workbook.read(buffer);
    const issues: ImportIssueDto[] = [...parsed.issues];
    if (issues.length > 0) return this.reject({ dryRun, issues, summary: EMPTY_SUMMARY });

    const store = await this.stores.getSettings(this.actor.storeId);
    const plan = await this.plan(parsed.sheets, store.currency, issues);
    const summary = summarize(plan);
    if (issues.length > 0) return this.reject({ dryRun, issues, summary });
    if (dryRun) return { dryRun, ok: true, issues: [], summary };

    try {
      await this.uow.run(() => this.apply(plan), { timeoutMs: IMPORT_TIMEOUT_MS });
    } catch (error) {
      if (!(error instanceof ImportStepError)) throw error;
      const cause = error.cause;
      const message = cause instanceof DomainError || cause instanceof Error ? cause.message : 'Écriture refusée';
      return this.reject({
        dryRun,
        issues: [{ sheet: error.located.sheet, row: error.located.row, column: null, message }],
        summary,
      });
    }
    return { dryRun, ok: true, issues: [], summary };
  }

  /** Rapport d'échec : rendu tel quel à la vérification, en 422 à l'import (rien n'est écrit). */
  private reject(report: Omit<CatalogImportReportDto, 'ok'>): CatalogImportReportDto {
    const full = { ...report, ok: false, issues: report.issues.slice(0, 500) };
    if (report.dryRun) return full;
    throw new ValidationError('IMPORT_REJECTED', `Import refusé : ${plural(report.issues.length, 'défaut')} à corriger`, full);
  }

  // ───────────── Plan : lecture et vérification, sans écriture ─────────────

  private async plan(sheets: Partial<Record<ImportSheet, WorkbookSheet>>, currency: Currency, issues: ImportIssueDto[]): Promise<Plan> {
    const snapshot = await this.taxonomy.snapshot();
    const categories = snapshot.categories;
    const attributes: TaxonomyAttribute[] = snapshot.attributes.map((attribute) => ({ ...attribute, values: [...attribute.values] }));
    const links: TaxonomyLink[] = [...snapshot.links];
    const issue = (sheet: ImportSheet, row: number | null, column: string | null, message: string) =>
      issues.push({ sheet, row, column, message });

    for (const sheet of Object.keys(sheets) as ImportSheet[]) {
      const present = new Set(sheets[sheet]?.headers.map((header) => header.key));
      for (const column of IMPORT_REQUIRED_COLUMNS[sheet]) {
        if (!present.has(column)) issue(sheet, 1, column, `Colonne « ${column} » manquante`);
      }
    }
    if (issues.length > 0) return { attributes: [], values: [], brands: new Map(), products: [] };

    const categoryOf = (raw: string) => {
      const key = valueKey(raw);
      return categories.find((category) => category.slug === slugify(raw) || valueKey(category.name) === key);
    };

    // 1. Attributs à créer (ceux qui existent déjà sont laissés tels quels).
    const plannedAttributes: PlannedAttribute[] = [];
    for (const { row, cells } of sheets.ATTRIBUTES?.rows ?? []) {
      const at = (column: string, message: string) => issue('ATTRIBUTES', row, column, message);
      const name = text(cells.nom);
      const slug = text(cells.slug) ? slugify(text(cells.slug)) : slugify(name);
      if (!name) {
        at('nom', 'Nom obligatoire');
        continue;
      }
      if (attributes.some((attribute) => attribute.slug === slug)) continue;
      const type = attributeType(cells.type);
      if (!type) {
        at('type', 'Type inconnu : texte, nombre, liste, liste multiple ou oui/non');
        continue;
      }
      const axis = isBlank(cells.axe) ? false : yesNo(cells.axe);
      const filterable = isBlank(cells.filtre) ? true : yesNo(cells.filtre);
      const required = isBlank(cells.obligatoire) ? false : yesNo(cells.obligatoire);
      if (axis === null) at('axe', 'Oui ou non attendu');
      if (filterable === null) at('filtre', 'Oui ou non attendu');
      if (required === null) at('obligatoire', 'Oui ou non attendu');
      const categoryIds: string[] = [];
      for (const raw of list(cells.categories)) {
        const category = categoryOf(raw);
        if (category) categoryIds.push(category.id);
        else at('categories', `Catégorie inconnue : ${raw}`);
      }
      const parsedInput = createAttributeSchema.safeParse({
        name,
        slug,
        type,
        unit: text(cells.unite) || null,
        isVariantAxis: axis ?? false,
        filterable: filterable ?? true,
        values: [],
        ...(categoryIds[0] ? { categoryId: categoryIds[0], required: required ?? false } : {}),
      });
      if (!parsedInput.success) {
        for (const problem of parsedInput.error.issues) at(String(problem.path[0] ?? 'nom'), problem.message);
        continue;
      }
      const id = `nouveau:${slug}`;
      attributes.push({ id, slug, name, type, unit: parsedInput.data.unit ?? null, isVariantAxis: parsedInput.data.isVariantAxis, filterable: parsedInput.data.filterable ?? true, values: [] });
      categoryIds.forEach((categoryId, position) => links.push({ categoryId, attributeId: id, required: required ?? false, position: 1000 + position }));
      plannedAttributes.push({
        sheet: 'ATTRIBUTES',
        row,
        input: parsedInput.data,
        links: categoryIds.slice(1).map((categoryId) => ({ categoryId, required: required ?? false })),
      });
    }

    // 2. Valeurs de listes à ajouter.
    const plannedValues: PlannedValue[] = [];
    for (const { row, cells } of sheets.ATTRIBUTE_VALUES?.rows ?? []) {
      const at = (column: string, message: string) => issue('ATTRIBUTE_VALUES', row, column, message);
      const attribute = attributeForColumn(slugify(text(cells.attribut)).replace(/-/g, '_'), attributes);
      if (!attribute) {
        at('attribut', `Attribut inconnu : ${text(cells.attribut) || '(vide)'}`);
        continue;
      }
      if (attribute.type !== 'SELECT' && attribute.type !== 'MULTI_SELECT') {
        at('attribut', `${attribute.name} n’est pas une liste : il n’a pas de valeurs`);
        continue;
      }
      const value = text(cells.valeur);
      if (!value || canonicalValue(attribute, value)) continue;
      const parsedValue = attributeValueInputSchema.safeParse({
        value,
        code: text(cells.code) || null,
        swatch: text(cells.pastille) || null,
      });
      if (!parsedValue.success) {
        for (const problem of parsedValue.error.issues) at(problem.path[0] === 'swatch' ? 'pastille' : String(problem.path[0] ?? 'valeur'), problem.message);
        continue;
      }
      attribute.values.push({ value, code: parsedValue.data.code ?? valueCode(value), swatch: parsedValue.data.swatch ?? null });
      plannedValues.push({ sheet: 'ATTRIBUTE_VALUES', row, attributeSlug: attribute.slug, input: parsedValue.data });
    }

    // 3. Produits et variantes, regroupés par référence.
    const productRows = new Map<string, WorkbookRow>();
    for (const entry of sheets.PRODUCTS?.rows ?? []) {
      const reference = text(entry.cells.reference).toUpperCase();
      if (!reference) issue('PRODUCTS', entry.row, 'reference', 'Référence obligatoire');
      else if (productRows.has(reference)) issue('PRODUCTS', entry.row, 'reference', `Référence ${reference} déjà présente plus haut`);
      else productRows.set(reference, entry);
    }
    const variantRows = new Map<string, WorkbookRow[]>();
    const skuSeen = new Map<string, number>();
    for (const entry of sheets.VARIANTS?.rows ?? []) {
      const reference = text(entry.cells.reference).toUpperCase();
      const sku = text(entry.cells.sku).toUpperCase();
      if (!reference) issue('VARIANTS', entry.row, 'reference', 'Référence obligatoire');
      if (!sku) issue('VARIANTS', entry.row, 'sku', 'SKU obligatoire');
      if (!reference || !sku) continue;
      const previous = skuSeen.get(sku);
      if (previous !== undefined) {
        issue('VARIANTS', entry.row, 'sku', `SKU ${sku} déjà utilisé ligne ${previous}`);
        continue;
      }
      skuSeen.set(sku, entry.row);
      variantRows.set(reference, [...(variantRows.get(reference) ?? []), entry]);
    }
    const unitsBySku = new Map<string, { units: UnitInput[]; rows: number[] }>();
    const serialSeen = new Map<string, number>();
    for (const { row, cells } of sheets.UNITS?.rows ?? []) {
      const sku = text(cells.sku).toUpperCase();
      const serial = serialSchema.safeParse(text(cells.imei));
      if (!sku) issue('UNITS', row, 'sku', 'SKU obligatoire');
      if (!serial.success) issue('UNITS', row, 'imei', serial.error.issues[0]?.message ?? 'IMEI invalide');
      const battery = isBlank(cells.batterie) ? null : integer(cells.batterie);
      if (battery !== null && (battery < 0 || battery > 100)) issue('UNITS', row, 'batterie', 'Pourcentage de 0 à 100');
      if (!isBlank(cells.batterie) && battery === null) issue('UNITS', row, 'batterie', 'Nombre entier attendu');
      if (!sku || !serial.success) continue;
      const previous = serialSeen.get(serial.data);
      if (previous !== undefined) {
        issue('UNITS', row, 'imei', `${serial.data} déjà saisi ligne ${previous}`);
        continue;
      }
      serialSeen.set(serial.data, row);
      const bucket = unitsBySku.get(sku) ?? { units: [], rows: [] };
      bucket.units.push({ serial: serial.data, batteryHealth: battery });
      bucket.rows.push(row);
      unitsBySku.set(sku, bucket);
    }
    for (const [sku, bucket] of unitsBySku) {
      if (!skuSeen.has(sku)) issue('UNITS', bucket.rows[0] ?? null, 'sku', `SKU ${sku} absent de la feuille VARIANTS`);
    }

    // IMEI déjà en base : ignorés s'ils sont déjà sur la bonne variante (réimport), refusés sinon.
    const known = await this.inventory.knownSerials([...serialSeen.keys()]);

    const references = [...new Set([...productRows.keys(), ...variantRows.keys()])];
    const existingIds = await this.readModel.productIdsByReference(references);
    const existing = new Map<string, ProductDto>();
    for (const [reference, id] of existingIds) {
      const dto = await this.readModel.getProduct(id);
      if (dto) existing.set(reference, dto);
    }
    const brands = await this.brandIndex();
    const newBrands = new Map<string, string>();

    const specColumns = (sheets.PRODUCTS?.headers ?? []).filter((header) => !(IMPORT_COLUMNS.PRODUCTS as readonly string[]).includes(header.key));
    const axisColumns = (sheets.VARIANTS?.headers ?? []).filter((header) => !(IMPORT_COLUMNS.VARIANTS as readonly string[]).includes(header.key));
    for (const column of [...specColumns, ...axisColumns]) {
      if (!attributeForColumn(column.key, attributes)) {
        issue(specColumns.includes(column) ? 'PRODUCTS' : 'VARIANTS', 1, column.label, `Colonne inconnue : ni une colonne du modèle, ni un attribut`);
      }
    }

    const plannedProducts: PlannedProduct[] = [];
    for (const reference of references) {
      const productRow = productRows.get(reference);
      const current = existing.get(reference) ?? null;
      const rows = variantRows.get(reference) ?? [];
      const sheet: ImportSheet = productRow ? 'PRODUCTS' : 'VARIANTS';
      const line = productRow?.row ?? rows[0]?.row ?? 0;
      const at = (column: string | null, message: string) => issue(sheet, line, column, message);
      if (!productRow && !current) {
        at('reference', `Référence ${reference} inconnue : ajoutez le produit à la feuille PRODUCTS`);
        continue;
      }
      const cells = productRow?.cells ?? {};

      const title = text(cells.titre) || current?.title || '';
      if (!title) at('titre', 'Titre obligatoire');
      const category = isBlank(cells.categorie) ? undefined : categoryOf(text(cells.categorie));
      if (!isBlank(cells.categorie) && !category) at('categorie', `Catégorie inconnue : ${text(cells.categorie)}`);
      const categoryId = category?.id ?? current?.category?.id;
      if (!categoryId) {
        if (isBlank(cells.categorie)) at('categorie', 'Catégorie obligatoire');
        continue;
      }
      const effective = resolveCategoryAttributes(categoryId, categories, attributes, links);
      const tracksUnits = categoryTracksUnits(categoryId, categories);
      const axes = effective.filter((attribute) => attribute.isVariantAxis);

      let brandId = current?.brand?.id ?? null;
      if (!isBlank(cells.marque)) {
        const name = text(cells.marque);
        brandId = brands.get(valueKey(name)) ?? null;
        if (!brandId) {
          brandId = `nouvelle:${valueKey(name)}`;
          newBrands.set(valueKey(name), name);
        }
      }
      const warranty = isBlank(cells.garantie_mois) ? (current?.warrantyMonths ?? null) : integer(cells.garantie_mois);
      if (!isBlank(cells.garantie_mois) && (warranty === null || warranty < 0 || warranty > 120)) at('garantie_mois', 'Nombre de mois entier, de 0 à 120');
      const publish = publishFlag(cells.statut);
      if (publish === 'invalid') at('statut', 'Statut : « en vente » ou « brouillon »');

      // Fiche technique : colonnes d'attributs de la catégorie, cellules non vides (le reste est gardé).
      const specInput: Record<string, unknown> = { ...(current && current.category?.id === categoryId ? current.specs : {}) };
      for (const column of specColumns) {
        const value = cells[column.key];
        if (isBlank(value)) continue;
        const attribute = attributeForColumn(column.key, effective);
        if (!attribute) {
          if (attributeForColumn(column.key, attributes)) at(column.label, `« ${column.label} » ne fait pas partie de la catégorie ${category?.name ?? ''}`.trim());
          continue;
        }
        if (attribute.isVariantAxis) {
          at(column.label, `${attribute.name} varie par variante : renseignez-le dans la feuille VARIANTS`);
          continue;
        }
        const read = specCell(attribute, value ?? null);
        if (typeof read === 'object' && read !== null && 'error' in read) at(column.label, String(read.error));
        else specInput[attribute.slug] = read;
      }
      const { specs, errors: specErrors } = validateSpecs(effective, specInput);
      for (const [slug, message] of Object.entries(specErrors)) {
        const attribute = effective.find((candidate) => candidate.slug === slug);
        at(attribute?.slug ?? slug, `${attribute?.name ?? slug} : ${message}`);
      }

      // Variantes : celles du fichier (par SKU) remplacent ou s'ajoutent ; les autres restent telles quelles.
      const bySku = new Map((current?.variants ?? []).filter((variant) => !variant.archived).map((variant) => [variant.sku, variant]));
      const planned: PlannedProduct = {
        sheet,
        row: line,
        reference,
        existing: current,
        input: {} as CreateProductInput,
        publish: publish === 'invalid' ? null : publish,
        adjustments: [],
        receptions: [],
        variantRows: [],
        newVariants: 0,
        updatedVariants: 0,
      };
      const variants: VariantInput[] = [];
      const touched = new Set<string>();
      for (const { row, cells: vcells } of rows) {
        const vat = (column: string, message: string) => issue('VARIANTS', row, column, message);
        const sku = text(vcells.sku).toUpperCase();
        const price = amount(vcells.prix, currency);
        if (price === null) vat('prix', 'Prix invalide');
        const compareAt = isBlank(vcells.prix_barre) ? null : amount(vcells.prix_barre, currency);
        if (!isBlank(vcells.prix_barre) && compareAt === null) vat('prix_barre', 'Prix invalide');
        const cost = isBlank(vcells.prix_achat) ? null : amount(vcells.prix_achat, currency);
        if (!isBlank(vcells.prix_achat) && cost === null) vat('prix_achat', 'Prix invalide');
        const stock = isBlank(vcells.stock) ? null : integer(vcells.stock);
        if (!isBlank(vcells.stock) && (stock === null || stock < 0)) vat('stock', 'Quantité entière, 0 ou plus');

        const optionInput: Record<string, unknown> = {};
        for (const column of axisColumns) {
          const value = vcells[column.key];
          if (isBlank(value)) continue;
          const axis = attributeForColumn(column.key, axes);
          if (!axis) {
            if (attributeForColumn(column.key, attributes)) vat(column.label, `« ${column.label} » n’est pas un axe de la catégorie ${category?.name ?? ''}`.trim());
            continue;
          }
          optionInput[axis.slug] = text(value);
        }
        const options = validateVariantOptions(axes, optionInput);
        if ('error' in options) vat('options', options.error);

        const previous = bySku.get(sku);
        const bucket = unitsBySku.get(sku);
        const units = bucket?.units.filter((unit, index) => {
          const owner = known.get(unit.serial);
          if (owner && owner !== previous?.id) {
            issue('UNITS', bucket.rows[index] ?? null, 'imei', `${unit.serial} est déjà enregistré sur une autre variante`);
          }
          return !owner;
        });
        if (bucket && !tracksUnits) vat('sku', `${category?.name ?? 'Cette catégorie'} n’est pas suivie à l’unité : retirez ses IMEI de la feuille UNITS`);
        if (tracksUnits && stock !== null && stock !== (bucket?.units.length ?? 0) && !bySku.has(sku)) {
          vat('stock', 'Suivi à l’unité : le stock est le nombre d’IMEI de la feuille UNITS (laissez la colonne vide)');
        }

        touched.add(sku);
        planned.variantRows.push({ sheet: 'VARIANTS', row });
        variants.push({
          ...(previous ? { id: previous.id } : {}),
          sku,
          options: 'options' in options ? options.options : {},
          priceAmount: price ?? 0,
          compareAtAmount: compareAt,
          costAmount: cost ?? previous?.costAmount ?? null,
          barcode: text(vcells.code_barres) || previous?.barcode || null,
          imageMediaId: previous?.image?.id ?? null,
          trackInventory: true,
          ...(!previous && tracksUnits ? { units: units ?? [] } : {}),
          ...(!previous && !tracksUnits ? { initialQuantity: stock ?? 0 } : {}),
        });
        if (previous) {
          planned.updatedVariants += 1;
          if (tracksUnits && units && units.length > 0) planned.receptions.push({ variantId: previous.id, units, located: { sheet: 'VARIANTS', row } });
          const onHand = previous.inventory?.onHand ?? 0;
          if (!tracksUnits && stock !== null && stock !== onHand) {
            planned.adjustments.push({ variantId: previous.id, delta: stock - onHand, located: { sheet: 'VARIANTS', row } });
          }
        } else {
          planned.newVariants += 1;
        }
      }
      for (const variant of current?.variants ?? []) {
        if (variant.archived || touched.has(variant.sku)) continue;
        planned.variantRows.push({ sheet, row: line });
        variants.push({
          id: variant.id,
          sku: variant.sku,
          options: variant.options,
          priceAmount: variant.priceAmount,
          compareAtAmount: variant.compareAtAmount,
          costAmount: variant.costAmount,
          barcode: variant.barcode,
          imageMediaId: variant.image?.id ?? null,
          trackInventory: variant.trackInventory,
        });
      }
      if (variants.length === 0) {
        at('reference', `Aucune variante pour ${reference} : ajoutez au moins une ligne dans VARIANTS`);
        continue;
      }
      const taken = await this.products.takenSkus(
        variants.map((variant) => variant.sku),
        current?.id,
      );
      for (const sku of taken) issue('VARIANTS', skuSeen.get(sku) ?? line, 'sku', `SKU ${sku} déjà utilisé par un autre produit`);

      const base = {
        title,
        description: isBlank(cells.description) ? (current?.description ?? null) : text(cells.description),
        brandId: brandId?.startsWith('nouvelle:') ? null : brandId,
        categoryId,
        reference,
        warrantyMonths: warranty,
        specs: specs as ProductSpecs,
        variants,
        mediaIds: current?.media.map((media) => media.id) ?? [],
        mediaOptionValues: current?.mediaOptionValues ?? {},
        accessoryIds: current?.accessories.map((accessory) => accessory.id) ?? [],
        seoTitle: current?.seoTitle ?? null,
        seoDescription: current?.seoDescription ?? null,
      };
      const parsedProduct = current
        ? updateProductSchema.safeParse({ ...base, slug: current.slug, version: current.version })
        : createProductSchema.safeParse(base);
      if (!parsedProduct.success) {
        for (const problem of parsedProduct.error.issues) {
          const [head, index, field] = problem.path.map(String);
          const located = head === 'variants' && index !== undefined ? planned.variantRows[Number(index)] : undefined;
          issue(located?.sheet ?? sheet, located?.row ?? line, field ?? head ?? null, problem.message);
        }
        continue;
      }
      const willPublish = planned.publish ?? current?.status === 'ACTIVE';
      if (willPublish) {
        for (const problem of publishProblems(effective, { specs, variants })) at(problem.slug, `Mise en vente impossible : ${problem.message}`);
      }
      planned.input = parsedProduct.data;
      if (brandId?.startsWith('nouvelle:')) (planned.input as { brandId: string | null }).brandId = brandId;
      plannedProducts.push(planned);
    }

    return { attributes: plannedAttributes, values: plannedValues, brands: newBrands, products: plannedProducts };
  }

  /** Marques actives de la boutique, par nom comparable. */
  private async brandIndex(): Promise<Map<string, string>> {
    const index = new Map<string, string>();
    let cursor: string | undefined;
    do {
      const page = await this.readModel.listBrands({ limit: 100, cursor, includeArchived: false });
      for (const brand of page.items) index.set(valueKey(brand.name), brand.id);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    return index;
  }

  // ───────────── Application : une seule transaction ─────────────

  private async apply(plan: Plan): Promise<void> {
    const step = async <T>(located: Located, work: () => Promise<T>): Promise<T> => {
      try {
        return await work();
      } catch (error) {
        throw new ImportStepError(located, error);
      }
    };

    for (const attribute of plan.attributes) {
      const id = await step(attribute, () => this.attributeUseCases.create(attribute.input));
      for (const link of attribute.links) {
        await step(attribute, async () => {
          const detail = await this.taxonomy.snapshot();
          const own = detail.links
            .filter((candidate) => candidate.categoryId === link.categoryId)
            .sort((a, b) => a.position - b.position)
            .map((candidate) => ({ attributeId: candidate.attributeId, required: candidate.required }));
          await this.categoryUseCases.setAttributes(link.categoryId, { attributes: [...own, { attributeId: id, required: link.required }] });
        });
      }
    }

    if (plan.values.length > 0) {
      const snapshot = await this.taxonomy.snapshot();
      for (const value of plan.values) {
        const attribute = snapshot.attributes.find((candidate) => candidate.slug === value.attributeSlug);
        if (!attribute) throw new ImportStepError(value, new Error(`Attribut introuvable : ${value.attributeSlug}`));
        await step(value, () => this.attributeUseCases.addValue(attribute.id, value.input));
      }
    }

    const brandIds = new Map<string, string>();
    for (const [key, name] of plan.brands) {
      const first = plan.products.find((product) => (product.input as { brandId?: string | null }).brandId === `nouvelle:${key}`);
      const brand = await step(first ?? { sheet: 'PRODUCTS', row: 0 }, () => this.brandUseCases.create({ name }));
      brandIds.set(`nouvelle:${key}`, brand.id);
    }

    for (const product of plan.products) {
      const brandId = (product.input as { brandId?: string | null }).brandId;
      const input = brandId && brandIds.has(brandId) ? { ...product.input, brandId: brandIds.get(brandId) as string } : product.input;
      const saved = await step(product, () =>
        product.existing
          ? this.updateProduct.execute(product.existing.id, input as UpdateProductInput)
          : this.createProduct.execute(input as CreateProductInput),
      );
      for (const adjustment of product.adjustments) {
        await step(adjustment.located, () =>
          this.inventory.adjust(adjustment.variantId, { type: 'ADJUSTMENT', quantity: adjustment.delta, reason: IMPORT_REASON }),
        );
      }
      for (const reception of product.receptions) {
        await step(reception.located, () =>
          this.inventory.receiveUnits(reception.variantId, { units: reception.units, condition: 'NEW', reason: IMPORT_REASON }),
        );
      }
      if (product.publish === true && saved.status !== 'ACTIVE') await step(product, () => this.changeStatus.execute(saved.id, 'publish'));
      if (product.publish === false && saved.status === 'ACTIVE') await step(product, () => this.changeStatus.execute(saved.id, 'unpublish'));
    }
  }
}

function summarize(plan: Plan): CatalogImportSummaryDto {
  return {
    attributesCreated: plan.attributes.length,
    valuesCreated: plan.values.length,
    productsCreated: plan.products.filter((product) => !product.existing).length,
    productsUpdated: plan.products.filter((product) => product.existing).length,
    variantsCreated: plan.products.reduce((sum, product) => sum + product.newVariants, 0),
    variantsUpdated: plan.products.reduce((sum, product) => sum + product.updatedVariants, 0),
    stockAdjusted: plan.products.reduce((sum, product) => sum + product.adjustments.length, 0),
    unitsReceived: plan.products.reduce(
      (sum, product) =>
        sum +
        product.receptions.reduce((count, reception) => count + reception.units.length, 0) +
        product.input.variants.reduce((count, variant) => count + (variant.id ? 0 : (variant.units?.length ?? 0)), 0),
      0,
    ),
  };
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}
