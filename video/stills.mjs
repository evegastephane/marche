// Usage : node stills.mjs <compositionId> <frame,frame,...> [dossier]
// Exporte des images fixes (JPEG réduits) pour contrôler une scène sans tout rendre.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const [id, frames, out = "out/stills"] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id });
for (const frame of frames.split(",").map(Number)) {
  const output = path.resolve(out, `${id}-${String(frame).padStart(4, "0")}.jpeg`);
  await renderStill({ serveUrl, composition, frame, output, imageFormat: "jpeg", jpegQuality: 70, scale: 0.4 });
  console.log(output);
}
