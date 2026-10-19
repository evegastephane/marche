import type { ReactNode } from 'react';
import { Headline } from './headline';

/** Un chapitre de l'accueil : un verbe géant dont le point est une roue, une phrase, puis le produit à manipuler. */
export function Chapter({
  id,
  title,
  lede,
  wide = false,
  thread = true,
  paper = false,
  children,
}: {
  id: string;
  title: string;
  lede: string;
  /** Le contenu sort du conteneur (bandes défilantes pleine largeur). */
  wide?: boolean;
  /** La roue du titre est un repère du fil orange (thread.tsx). */
  thread?: boolean;
  /** Feuille blanche posée sur la scène, pour montrer le produit en pleine lumière. */
  paper?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-scene
      data-paper={paper || undefined}
      aria-labelledby={`${id}-titre`}
      className={paper ? 'uh-chapter uh-paper' : 'uh-chapter'}
    >
      <div className="uh-container">
        <div className="uh-chapter-head">
          <Headline
            id={`${id}-titre`}
            lines={[title]}
            thread={thread}
            className="uh-display-l"
          />
          <p className="uh-lede">{lede}</p>
        </div>
        {!wide && children}
      </div>
      {wide && children}
    </section>
  );
}
