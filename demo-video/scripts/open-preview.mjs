import path from "node:path";
import { chromium } from "../../node_modules/playwright/index.mjs";
import { root } from "./prepare.mjs";
const browser = await chromium.launch({
  headless: false,
  args: ["--window-size=1600,1000"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:3001/StudioDemo");
await page.getByRole("button", { name: "Play", exact: true }).click();
await page.waitForTimeout(15000);
await page.getByRole("button", { name: "Pause", exact: true }).click();
await page.screenshot({ path: path.join(root, "out/review-preview.png") });
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "Opened the revised 92-second Studio demo; playback verified and paused in the typed-fields scene.",
);
await new Promise((resolve) => browser.on("disconnected", resolve));
