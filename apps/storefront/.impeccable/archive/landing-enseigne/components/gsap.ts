'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/** GSAP de l'accueil : un seul enregistrement des greffons, pour tous les composants de la page. */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/** Mouvement complet, ou réduit : chaque animation GSAP de la page se range sous l'une de ces deux conditions. */
export const MOTION_OK = '(prefers-reduced-motion: no-preference)';

export { gsap, ScrollTrigger, SplitText, useGSAP };
