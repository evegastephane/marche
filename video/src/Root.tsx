import { Composition, Folder } from "remotion";
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
import { UpsellPromo } from "./UpsellPromo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="UpsellPromo"
        component={UpsellPromo}
        durationInFrames={1146}
        fps={30}
        width={1080}
        height={1920}
      />
      <Folder name="Scenes">
        <Composition
          id="Intro"
          component={IntroScene}
          durationInFrames={105}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{ backdrop: true }}
        />
        <Composition
          id="Accroche"
          component={HookScene}
          durationInFrames={115}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Votre\nboutique,\nen un clic.",
            clickWord: "clic",
            lede: "Le dashboard, le site, la caisse et WhatsApp, tenus par le même stock.",
            backdrop: true,
          }}
        />
        <Composition
          id="Gerez"
          component={ManageScene}
          durationInFrames={170}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Gérez",
            lede: "Produits, stock et commandes, au même endroit.",
            backdrop: true,
          }}
        />
        <Composition
          id="Publiez"
          component={PublishScene}
          durationInFrames={170}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Publiez",
            lede: "Votre catalogue devient votre site, en direct. Un clic, sans développeur.",
            button: "Générer mon site",
            backdrop: true,
          }}
        />
        <Composition
          id="Encaissez"
          component={CounterScene}
          durationInFrames={180}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Encaissez",
            lede: "Au comptoir, la vente sort du même stock que le site.",
            backdrop: true,
          }}
        />
        <Composition
          id="Annoncez"
          component={AnnounceScene}
          durationInFrames={165}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Annoncez",
            lede: "Une nouveauté part sur WhatsApp, vers les clients qui l’ont accepté.",
            backdrop: true,
          }}
        />
        <Composition
          id="LeStock"
          component={StockScene}
          durationInFrames={140}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Le stock\nne ment\njamais.",
            lede: "Un seul stock pour le site, la caisse et WhatsApp. Jamais de survente.",
            backdrop: true,
          }}
        />
        <Composition
          id="ToutLeReste"
          component={RestScene}
          durationInFrames={125}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Tout\nle reste",
            lede: "Ce qu’une boutique demande chaque jour, déjà prêt.",
            backdrop: true,
          }}
        />
        <Composition
          id="Fin"
          component={OutroScene}
          durationInFrames={160}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{
            title: "Ouvrez la vôtre.",
            cta: "Créer ma boutique",
            backdrop: true,
          }}
        />
      </Folder>
      <Folder name="Elements">
        <Composition
          id="Backdrop"
          component={Backdrop}
          durationInFrames={300}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{ pieceColor: "#17181d" }}
        />
      </Folder>
    </>
  );
};
