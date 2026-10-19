import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { openBrowser, getCompositions, renderStill } from "@remotion/renderer";
import { root } from "./prepare.mjs";
const browserExecutable =
  "/Users/djeglin/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.ts"),
  outDir: path.join(root, "out/bundle"),
});
const browser = await openBrowser("chrome", { browserExecutable });
try {
  const comps = await getCompositions(serveUrl, { puppeteerInstance: browser });
  const main = comps.find((c) => c.id === "StudioDemo");
  if (
    !main ||
    main.durationInFrames !== 2760 ||
    main.width !== 1920 ||
    main.height !== 1080
  )
    throw Error("Wrong master video metadata");
  const chapters = comps.filter((c) => c.id.startsWith("Chapter-"));
  if (
    chapters.length !== 4 ||
    chapters.reduce((n, c) => n + c.durationInFrames, 0) !== 2760
  )
    throw Error("Chapter timings do not match the 92-second master");
  const frames = [0, 210, 330, 630, 720, 1050, 1380, 1530, 1635, 1800, 1980, 2130, 2310, 2490, 2580, 2598, 2622, 2664, 2700, 2759];
  for (const frame of frames) {
    await renderStill({
      serveUrl,
      composition: main,
      frame,
      output: path.join(root, `out/qa-${String(frame).padStart(4, "0")}.png`),
      puppeteerInstance: browser,
      imageFormat: "png",
    });
    console.log(`Verified render at ${(frame / 30).toFixed(1)}s`);
  }
  await fs.writeFile(
    path.join(root, "out/qa-metadata.json"),
    JSON.stringify(
      {
        compositions: comps.map((c) => ({
          id: c.id,
          frames: c.durationInFrames,
          width: c.width,
          height: c.height,
          fps: c.fps,
        })),
        frames,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close({ silent: true });
}
