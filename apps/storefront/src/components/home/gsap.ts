'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/** GSAP de l'accueil : un seul enregistrement des greffons, pour tous les composants de la page. */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Flip, DrawSVGPlugin);

/** Mouvement complet ; sous `prefers-reduced-motion`, chaque animation de la page se range dans l'autre branche. */
export const MOTION_OK = '(prefers-reduced-motion: no-preference)';
export const MOTION_REDUCED = '(prefers-reduced-motion: reduce)';

/** Courbe de la marque : départ franc, arrivée très douce. */
export const EASE = 'expo.out';

export { DrawSVGPlugin, Flip, gsap, ScrollTrigger, SplitText, useGSAP };
