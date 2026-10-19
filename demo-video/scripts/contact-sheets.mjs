import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "../../node_modules/playwright/index.mjs";
import { root } from "./prepare.mjs";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1200 },
  });
  const files = await fs.readdir(path.join(root, "out"));
  for (const [name, pattern, cols] of [
    ["edit-proof", /^qa-\d+\.png$/, 4],
    ["capture-start", /^proof-.*-start\.png$/, 3],
    ["capture-middle", /^proof-.*-middle\.png$/, 3],
    ["capture-end", /^proof-.*-end\.png$/, 3],
  ]) {
    const selected = files.filter((f) => pattern.test(f)).sort();
    const frames = await Promise.all(
      selected.map(async (f) => ({
        name: f,
        url:
          "data:image/png;base64," +
          (await fs.readFile(path.join(root, "out", f))).toString("base64"),
      })),
    );
    const w = 480 * cols,
      h = 300 * Math.ceil(frames.length / cols);
    await page.setViewportSize({ width: w, height: h });
    await page.setContent('<canvas id="sheet"></canvas>');
    await page.evaluate(
      async ({ frames, cols, w, h }) => {
        const c = document.querySelector("canvas");
        c.width = w;
        c.height = h;
        document.body.style.margin = "0";
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#F6F7F3";
        ctx.fillRect(0, 0, w, h);
        ctx.font = "17px sans-serif";
        for (let i = 0; i < frames.length; i++) {
          const im = new Image();
          im.src = frames[i].url;
          await im.decode();
          const x = (i % cols) * 480,
            y = Math.floor(i / cols) * 300;
          ctx.drawImage(im, x, y, 480, 270);
          ctx.fillStyle = "#192329";
          ctx.fillText(frames[i].name, x + 10, y + 292);
        }
      },
      { frames, cols, w, h },
    );
    await page.screenshot({ path: path.join(root, `out/${name}-contact.png`) });
  }
} finally {
  await browser.close();
}
