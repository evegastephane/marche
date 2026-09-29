import { type AttributeField, KIND_ATTRIBUTES, type ProductKind } from '@marche/contracts';
import { Field, Input, InputWithSuffix, Select } from '@/shared/ui/field';
import { Switch } from '@/shared/ui/switch';
import type { AttributeDraft, DraftErrors } from '../product-draft';
import { TagInput } from './tag-input';

/**
 * Fiche d'une sorte d'article, générée depuis le registre des verticales :
 * texte, nombre avec unité, oui/non, choix d'une liste, liste de valeurs.
 */
export function AttributesEditor({
  kind,
  values,
  onChange,
  errors,
}: {
  kind: ProductKind;
  values: Record<string, AttributeDraft>;
  onChange: (key: string, value: AttributeDraft) => void;
  errors: DraftErrors;
}) {
  const fields = KIND_ATTRIBUTES[kind];
  const toggles = fields.filter((f) => f.type === 'boolean');
  const others = fields.filter((f) => f.type !== 'boolean');

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {others.map((field) => (
          <AttributeInput
            key={field.key}
            field={field}
            value={values[field.key]}
            error={errors[`attributes.${field.key}`]}
            onChange={(value) => onChange(field.key, value)}
          />
        ))}
      </div>
      {toggles.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {toggles.map((field) => (
            <label key={field.key} className="well flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3">
              <Switch checked={values[field.key] === true} onChange={(checked) => onChange(field.key, checked)} />
              <span className="font-[600]">{field.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function AttributeInput({
  field,
  value,
  error,
  onChange,
}: {
  field: AttributeField;
  value: AttributeDraft | undefined;
  error?: string;
  onChange: (value: AttributeDraft) => void;
}) {
  const text = typeof value === 'string' ? value : '';
  const wide = field.type === 'tags';
  return (
    <Field label={field.label} hint={field.hint} error={error} className={wide ? 'sm:col-span-2' : undefined}>
      {(props) => {
        switch (field.type) {
          case 'select':
            return (
              <Select {...props} value={text} onChange={(e) => onChange(e.target.value)}>
                <option value="">—</option>
                {field.choices?.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </Select>
            );
          case 'tags':
            return (
              <TagInput
                id={props.id}
                describedBy={props['aria-describedby']}
                invalid={props['aria-invalid']}
                values={Array.isArray(value) ? value : []}
                onChange={onChange}
                placeholder={field.placeholder ?? (field.key === 'compatibleModels' ? 'iPhone 12, Galaxy A54' : undefined)}
                suggestions={field.choices?.map((c) => c.label)}
                maxLength={80}
              />
            );
          case 'number':
            return field.unit ? (
              <InputWithSuffix
                {...props}
                suffix={field.unit}
                inputMode="decimal"
                className="tabular"
                value={text}
                placeholder={field.placeholder}
                onChange={(e) => onChange(e.target.value)}
              />
            ) : (
              <Input
                {...props}
                inputMode="decimal"
                className="tabular"
                value={text}
                placeholder={field.placeholder}
                onChange={(e) => onChange(e.target.value)}
              />
            );
          default:
            return (
              <Input
                {...props}
                value={text}
                maxLength={200}
                placeholder={field.placeholder}
                onChange={(e) => onChange(e.target.value)}
              />
            );
        }
      }}
    </Field>
  );
}
