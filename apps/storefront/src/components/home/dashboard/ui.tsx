'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/*
 * Pièces du vrai dashboard (monde « L'instrument », thème clair), refaites pour la réplique de l'accueil :
 * mêmes témoins, mêmes touches, mêmes chiffres qui roulent. Styles : .d-* dans home.css.
 */

export const GLIDE = {
  type: 'spring',
  stiffness: 520,
  damping: 42,
  mass: 0.7,
} as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export type Tone = 'attention' | 'on' | 'off' | 'danger';

/** Témoin lumineux : orange = à faire, plein = fait, anneau = pas encore, rouge = rupture. */
export function Led({
  tone,
  pulse = false,
  className,
}: {
  tone: Tone;
  pulse?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <span
      aria-hidden
      className={cx('relative inline-flex size-2 shrink-0', className)}
    >
      {pulse && tone === 'attention' && !reduce && (
        <motion.span
          className="absolute inset-0 rounded-full bg-[var(--d-accent)]"
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 2.6 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeOut',
            repeatDelay: 0.6,
          }}
        />
      )}
      <span className="d-led relative size-2 rounded-full" data-tone={tone} />
    </span>
  );
}

/** État : témoin + libellé. Quand l'état change, l'ancien libellé monte et le nouveau prend sa place. */
export function Badge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx('d-badge', className)} data-tone={tone}>
      <Led tone={tone} />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(children)}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={GLIDE}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const digits = '0123456789'.split('');

/**
 * Nombre dont chaque chiffre roule dans sa colonne (les afficheurs du dashboard).
 * La valeur entière est lue d'un bloc par les lecteurs d'écran.
 */
export function Rolling({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const text = new Intl.NumberFormat('fr-FR').format(value);
  const chars = [...text];
  return (
    <span className={cx('d-rolling', className)}>
      <span className="sr-only">{text}</span>
      {chars.map((char, index) => {
        const key = chars.length - index;
        if (!/\d/.test(char)) {
          return (
            <span key={key} aria-hidden>
              {/\s/.test(char) ? ' ' : char}
            </span>
          );
        }
        return (
          <span key={key} aria-hidden className="d-digit">
            <span
              className="d-digit-strip"
              style={{
                transform: `translateY(-${Number(char)}em)`,
                transitionDelay: `${(chars.length - index) * 35}ms`,
              }}
            >
              {digits.map((digit) => (
                <span key={digit}>{digit}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Commutateur à curseur glissant (périodes, filtres). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  name,
  label,
  display = false,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  name: string;
  label: string;
  display?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('d-segmented', display && 'd-segmented-display')}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className="d-segment"
            data-active={active}
          >
            {active && (
              <motion.span
                layoutId={`seg-${name}`}
                className="d-segment-knob"
                transition={GLIDE}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
