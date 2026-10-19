import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Impression d'un document seul (ticket de caisse, récapitulatif de caisse) : le document est posé
 * dans un calque réservé à l'impression, le reste de l'application est masqué le temps de
 * l'impression (règles `@media print` de styles.css), puis tout revient.
 * `roll` : ticket sur rouleau thermique, sans marges ; sinon une page A4 aux marges courtes.
 */
export function PrintJob({ children, roll = false, onDone }: { children: ReactNode; roll?: boolean; onDone: () => void }) {
  const [host] = useState(() => {
    const element = document.createElement('div');
    element.id = 'upsell-print';
    return element;
  });

  // Le rappel peut changer à chaque rendu : l'impression, elle, ne se lance qu'une fois.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    document.body.append(host);
    const style = document.createElement('style');
    style.textContent = roll ? '@page { margin: 0; }' : '@page { size: A4; margin: 12mm; }';
    document.head.append(style);
    document.body.classList.add('printing');
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      done.current();
    };
    window.addEventListener('afterprint', finish);
    // Laisse le temps au navigateur de poser le document avant d'ouvrir la fenêtre d'impression.
    const timer = window.setTimeout(() => {
      window.print();
      // Certains navigateurs n'émettent pas « afterprint » : window.print() bloque jusqu'à la fin.
      window.setTimeout(finish, 300);
    }, 80);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', finish);
      document.body.classList.remove('printing');
      style.remove();
      host.remove();
    };
  }, [host, roll]);

  return createPortal(children, host);
}
