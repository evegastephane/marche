import {
  CONDITION_HINTS,
  OPTION_PRESETS,
  OPTION_TYPE_LABELS,
  OPTION_TYPES,
  type OptionType,
} from '@marche/contracts';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/shared/ui/button';
import { Field, Input, Select } from '@/shared/ui/field';
import { glide } from '@/shared/ui/motion';
import { type OptionDraft, swatchOf } from '../product-draft';
import { TagInput } from './tag-input';

/** Pastille d'une couleur ; sans teinte connue, un anneau vide. */
export function Swatch({
  hex,
  className,
}: {
  hex: string | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.18)] ${className ?? ''}`}
      style={
        hex
          ? { backgroundColor: hex }
          : { boxShadow: 'inset 0 0 0 1.5px var(--color-ink-3)' }
      }
    />
  );
}

const PLACEHOLDERS: Partial<Record<OptionType, string>> = {
  size: 'S, M, L',
  shoe_size: '38, 39, 40',
  color: 'Bleu, Noir',
  storage: '128 Go, 256 Go',
  memory: '8 Go, 16 Go',
  screen: '13 pouces',
  condition: 'Neuf',
  model: 'iPhone 12, iPhone 12 mini',
  text: 'Valeur',
};

/** Ajoute des valeurs en gardant l'ordre des préréglages (XS avant S avant M…). */
function ordered(values: string[], presets: string[] | undefined): string[] {
  if (!presets) return values;
  const rank = (v: string) => {
    const i = presets.indexOf(v);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const known = values
    .filter((v) => presets.includes(v))
    .sort((a, b) => rank(a) - rank(b));
  const custom = values.filter((v) => !presets.includes(v));
  return [...known, ...custom];
}

/**
 * Une option de déclinaison typée : sa nature (taille, couleur, stockage…) propose des valeurs
 * prêtes à ajouter ; une couleur porte sa pastille, qu'on ajuste d'un clic.
 */
export function OptionEditor({
  option,
  onChange,
  onRemove,
  nameError,
  valuesError,
  suggestions,
  hintsByValue = CONDITION_HINTS,
}: {
  option: OptionDraft;
  onChange: (patch: Partial<OptionDraft>) => void;
  onRemove?: () => void;
  nameError?: string;
  valuesError?: string;
  /** Valeurs proposées à la place des préréglages (les états que vend la boutique, par exemple). */
  suggestions?: string[];
  /** Explication de chaque état (celles de la boutique). */
  hintsByValue?: Record<string, string>;
}) {
  const presets = suggestions ?? OPTION_PRESETS[option.type];

  const setType = (type: OptionType) => {
    const previousLabel = OPTION_TYPE_LABELS[option.type];
    const rename = !option.name.trim() || option.name === previousLabel;
    onChange({
      type,
      ...(rename && type !== 'text' ? { name: OPTION_TYPE_LABELS[type] } : {}),
    });
  };

  const renderTag =
    option.type === 'color'
      ? (value: string) => {
          const hex = swatchOf(option, value);
          return (
            <label
              className="relative inline-flex cursor-pointer"
              title={`Teinte de ${value}`}
            >
              <Swatch hex={hex} />
              <input
                type="color"
                aria-label={`Teinte de ${value}`}
                value={hex ?? '#888888'}
                onChange={(e) =>
                  onChange({
                    swatches: {
                      ...option.swatches,
                      [value]: e.target.value.toUpperCase(),
                    },
                  })
                }
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </label>
          );
        }
      : undefined;

  const hints =
    option.type === 'condition'
      ? option.values.flatMap((v) =>
          hintsByValue[v] ? [`${v} : ${hintsByValue[v]}`] : [],
        )
      : [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={glide}
      className="flex flex-col gap-3 rounded-xl p-4 shadow-[inset_0_0_0_1px_var(--color-line)]"
    >
      <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
        <Field label="Nature">
          {(props) => (
            <Select
              {...props}
              value={option.type}
              onChange={(e) => setType(e.target.value as OptionType)}
            >
              {OPTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {OPTION_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Nom affiché" error={nameError}>
          {(props) => (
            <Input
              {...props}
              value={option.name}
              maxLength={40}
              placeholder={OPTION_TYPE_LABELS[option.type]}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          )}
        </Field>
        {onRemove && (
          <Button
            variant="ghost"
            className="w-10 self-start px-0 max-md:w-11 max-sm:justify-self-end sm:mt-6"
            onClick={onRemove}
            aria-label={`Retirer l’option ${option.name}`}
          >
            <X />
          </Button>
        )}
      </div>
      <Field
        label="Valeurs"
        hint={
          option.type === 'color'
            ? 'Touchez une pastille pour ajuster sa teinte.'
            : hints.length > 0
              ? hints.join(' · ')
              : 'Entrée ou virgule pour ajouter.'
        }
        error={valuesError}
      >
        {(props) => (
          <TagInput
            id={props.id}
            describedBy={props['aria-describedby']}
            invalid={props['aria-invalid']}
            values={option.values}
            onChange={(values) =>
              onChange({ values: ordered(values, presets) })
            }
            placeholder={PLACEHOLDERS[option.type]}
            suggestions={presets}
            renderTag={renderTag}
            renderSuggestion={
              option.type === 'color'
                ? (value) => <Swatch hex={swatchOf(option, value)} />
                : undefined
            }
          />
        )}
      </Field>
    </motion.div>
  );
}
