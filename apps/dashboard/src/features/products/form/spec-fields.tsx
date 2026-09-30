import type { CategoryAttributeDto } from '@marche/contracts';
import type { ReactNode } from 'react';
import { Field, Input, InputWithSuffix, Select } from '@/shared/ui/field';
import { Switch } from '@/shared/ui/switch';
import { type Attributes, type DraftErrors, type SpecDraft, specAttributesOf } from '../model/product-draft';
import { ValueChip } from './value-chip';

function Label({ attribute }: { attribute: CategoryAttributeDto }) {
  return (
    <>
      {attribute.name}
      {attribute.required && <span className="legend ml-2">obligatoire</span>}
    </>
  );
}

/** Fiche technique : un champ par attribut de la catégorie, selon son type. */
export function SpecFields({
  attributes,
  values,
  errors,
  onChange,
}: {
  attributes: Attributes;
  values: Record<string, SpecDraft>;
  errors: DraftErrors;
  onChange: (slug: string, value: SpecDraft) => void;
}) {
  const specs = specAttributesOf(attributes);
  return (
    <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
      {specs.map((attribute) => (
        <SpecField
          key={attribute.id}
          attribute={attribute}
          value={values[attribute.slug]}
          error={errors[`specs.${attribute.slug}`]}
          onChange={(value) => onChange(attribute.slug, value)}
        />
      ))}
    </div>
  );
}

function SpecField({
  attribute,
  value,
  error,
  onChange,
}: {
  attribute: CategoryAttributeDto;
  value: SpecDraft | undefined;
  error?: string;
  onChange: (value: SpecDraft) => void;
}): ReactNode {
  const text = typeof value === 'string' ? value : '';
  switch (attribute.type) {
    case 'NUMBER':
      return (
        <Field label={<Label attribute={attribute} />} error={error}>
          {(props) => (
            <InputWithSuffix
              {...props}
              suffix={attribute.unit ?? ''}
              inputMode="decimal"
              value={text}
              onChange={(event) => onChange(event.target.value)}
            />
          )}
        </Field>
      );
    case 'SELECT':
      return (
        <Field label={<Label attribute={attribute} />} error={error}>
          {(props) => (
            <Select {...props} value={text} onChange={(event) => onChange(event.target.value)}>
              <option value="">—</option>
              {attribute.values.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value}
                </option>
              ))}
            </Select>
          )}
        </Field>
      );
    case 'BOOLEAN':
      return (
        <div className="flex flex-col gap-1.5">
          <label className="well flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl px-4 py-2 sm:mt-[1.4rem]">
            <span className="text-[0.9375rem] font-[560]">
              <Label attribute={attribute} />
            </span>
            <Switch checked={value === true} onChange={onChange} />
          </label>
          {error && (
            <span data-field-error className="text-[0.8125rem] font-[560] text-danger-ink">
              {error}
            </span>
          )}
        </div>
      );
    case 'MULTI_SELECT': {
      const picked = Array.isArray(value) ? value : [];
      return (
        <fieldset className="flex flex-col gap-2 sm:col-span-2">
          <legend className="mb-1.5 text-[0.8125rem] font-[600] text-ink">
            <Label attribute={attribute} />
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {attribute.values.map((option) => (
              <ValueChip
                key={option.value}
                pressed={picked.includes(option.value)}
                swatch={option.swatch ?? undefined}
                onToggle={(on) =>
                  onChange(on ? [...picked, option.value] : picked.filter((item) => item !== option.value))
                }
              >
                {option.value}
              </ValueChip>
            ))}
          </div>
          {error && (
            <span data-field-error className="text-[0.8125rem] font-[560] text-danger-ink">
              {error}
            </span>
          )}
        </fieldset>
      );
    }
    case 'TEXT':
      return (
        <Field label={<Label attribute={attribute} />} error={error}>
          {(props) => <Input {...props} value={text} onChange={(event) => onChange(event.target.value)} />}
        </Field>
      );
  }
}
