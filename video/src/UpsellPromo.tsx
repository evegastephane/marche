import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { AbsoluteFill, Easing, useVideoConfig } from "remotion";
import { AnnounceScene } from "./scenes/AnnounceScene";
import { Backdrop } from "./scenes/Backdrop";
import { CounterScene } from "./scenes/CounterScene";
import { HookScene } from "./scenes/HookScene";
import { IntroScene } from "./scenes/IntroScene";
import { ManageScene } from "./scenes/ManageScene";
import { OutroScene } from "./scenes/OutroScene";
import { PublishScene } from "./scenes/PublishScene";
import { RestScene } from "./scenes/RestScene";
import { StockScene } from "./scenes/StockScene";

/**
 * Présentation d'Upsell, format vertical (statuts WhatsApp, Reels, TikTok).
 * Le fond animé reste en place ; les scènes défilent vers le haut comme l'accueil du site.
 * Durée : somme des scènes (1330) moins les transitions (184) = 1146 images.
 */
export const UpsellPromo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#0e0f12" }}>
      <Backdrop name="Fond animé" pieceColor="#17181d" />
      <TransitionSeries>
        <TransitionSeries.Sequence name="Intro" durationInFrames={105} premountFor={fps}>
          <IntroScene backdrop={false} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence name="Accroche" durationInFrames={115} premountFor={fps}>
          <HookScene
            title={"Votre\nboutique,\nen un clic."}
            clickWord="clic"
            lede="Le dashboard, le site, la caisse et WhatsApp, tenus par le même stock."
            backdrop={false}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 24, easing: Easing.bezier(0.65, 0, 0.35, 1) })}
        />
        <TransitionSeries.Sequence name="Gérez" durationInFrames={170} premountFor={fps}>
          <ManageScene
            title="Gérez"
            lede="Produits, stock et commandes, au même endroit."
            backdrop={false}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 24, easing: Easing.bezier(0.65, 0, 0.35, 1) })}
        />
        <TransitionSeries.Sequence name="Publiez" durationInFrames={170} premountFor={fps}>
          <PublishScene
            title="Publiez"
            lede="Votre catalogue devient votre site, en direct. Un clic, sans développeur."
            button="Générer mon site"
            backdrop={false}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 24, easing: Easing.bezier(0.65, 0, 0.35, 1) })}
        />
        <TransitionSeries.Sequence name="Encaissez" durationInFrames={180} premountFor={fps}>
          <CounterScene
            title="Encaissez"
            lede="Au comptoir, la vente sort du même stock que le site."
            backdrop={false}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 24, easing: Easing.bezier(0.65, 0, 0.35, 1) })}
        />
        <TransitionSeries.Sequence name="Annoncez" durationInFrames={165} premountFor={fps}>
          <AnnounceScene
            title="Annoncez"
            lede="Une nouveauté part sur WhatsApp, vers les clients qui l’ont accepté."
            backdrop={false}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 20 })}
        />
        <TransitionSeries.Sequence name="Le stock" durationInFrames={140} premountFor={fps}>
          <StockScene
            title={"Le stock\nne ment\njamais."}
            lede="Un seul stock pour le site, la caisse et WhatsApp. Jamais de survente."
            backdrop={false}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 24, easing: Easing.bezier(0.65, 0, 0.35, 1) })}
        />
        <TransitionSeries.Sequence name="Tout le reste" durationInFrames={125} premountFor={fps}>
          <RestScene
            title={"Tout\nle reste"}
            lede="Ce qu’une boutique demande chaque jour, déjà prêt."
            backdrop={false}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={linearTiming({ durationInFrames: 24, easing: Easing.bezier(0.65, 0, 0.35, 1) })}
        />
        <TransitionSeries.Sequence name="Fin" durationInFrames={160} premountFor={fps}>
          <OutroScene title="Ouvrez la vôtre." cta="Créer ma boutique" backdrop={false} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
