import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "../../node_modules/playwright/index.mjs";
import { root } from "./prepare.mjs";

const board = JSON.parse(
  await fs.readFile(
    path.join(root, "public/final-workspace.cmmf.json"),
    "utf8",
  ),
);
if (board.models.length !== 34)
  throw Error("Estate capture must contain all 34 models");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "out/capture-manifest.json"), "utf8"),
);
const browser = await chromium.launch({ headless: true });
const hold = (page, s) => page.waitForTimeout(s * 1000);
// Partial re-records retain the evidence for the other estate shots.
const checks = only
  ? JSON.parse(await fs.readFile(path.join(root, "out/estate-highlight-checks.json"), "utf8")).filter((c) => c.name !== only)
  : [];
async function moveTo(page, locator) {
  const r = await locator.boundingBox();
  if (!r) throw Error("Missing control");
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2, { steps: 35 });
}
async function click(page, locator) {
  await moveTo(page, locator);
  await locator.click();
  await hold(page, 0.4);
}
async function frameProduct(page) {
  await page.getByLabel("Focus a content type").selectOption("product");
  await hold(page, 0.5);
  await click(
    page,
    page.getByRole("button", { name: "Zoom Out", exact: true }),
  );
  const b = await page
    .locator('.react-flow__node[data-id="product"]')
    .boundingBox();
  await page.keyboard.press("h");
  await page.mouse.move(1000, 950);
  await page.mouse.down();
  await page.mouse.move(1000 + 440 - b.x, 950, { steps: 35 });
  await page.mouse.up();
  await page.keyboard.press("v");
  await hold(page, 0.5);
}
async function proof(page, name, expected) {
  await hold(page, 0.3);
  const state = await page
    .locator(".react-flow__node")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        id: n.getAttribute("data-id"),
        className: n.className,
        opacity: Number(getComputedStyle(n).opacity),
      })),
    );
  const highlighted = state
    .filter((n) => n.className.includes("node-highlight"))
    .map((n) => n.id)
    .sort();
  if (
    expected &&
    JSON.stringify(highlighted) !== JSON.stringify(expected.sort())
  )
    throw Error(`${name}: wrong highlighted targets ${highlighted}`);
  if (state.length !== 34) throw Error("A full-estate shot dropped models");
  const edges = await page
    .locator(".react-flow__edge.edge-highlight")
    .evaluateAll((es) => es.map((e) => e.getAttribute("data-id")));
  if (expected) {
    const field = name.includes("variants")
      ? "variants"
      : name.includes("categories")
        ? "categories"
        : "brand";
    const target = expected.find((id) => id !== "product");
    if (
      JSON.stringify(edges) !== JSON.stringify([`product/${field}/${target}`])
    )
      throw Error(`${name}: wrong highlighted edge`);
  }
  checks.push({ name, models: state.length, highlighted, edges, state });
  await page.screenshot({ path: path.join(root, `public/stills/${name}.png`) });
}
async function take(name, action, { focus = false } = {}) {
  if (only && only !== name) return;
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    recordVideo: {
      dir: path.join(root, "out/raw"),
      size: { width: 1920, height: 1080 },
    },
  });
  await context.addInitScript((b) => {
    localStorage.setItem("cmmf-studio", JSON.stringify(b));
    localStorage.setItem("cmmf-theme", "light");
  }, board);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const started = Date.now();
  await page.goto(process.env.CMMF_DEMO_URL || "http://127.0.0.1:5173");
  await page.evaluate(() => document.fonts.ready);
  await hold(page, 0.8);
  await page.evaluate(() => {
    const c = document.createElement("div");
    c.innerHTML =
      '<svg width="30" height="36" viewBox="0 0 28 34"><path d="M3 2v26l7-7 6 11 5-3-6-10h10z" fill="#192329" stroke="white" stroke-width="2"/></svg>';
    Object.assign(c.style, {
      position: "fixed",
      left: "320px",
      top: "150px",
      zIndex: "99999",
      pointerEvents: "none",
      filter: "drop-shadow(0 2px 2px #0003)",
    });
    document.body.append(c);
    document.addEventListener("pointermove", (e) => {
      c.style.left = e.clientX + "px";
      c.style.top = e.clientY + "px";
    });
  });
  if (focus) await frameProduct(page);
  const inPoint = (Date.now() - started) / 1000;
  await action(page);
  await page.screenshot({ path: path.join(root, `public/stills/${name}.png`) });
  const video = page.video();
  const duration = (Date.now() - started) / 1000;
  await context.close();
  await video.saveAs(path.join(root, `public/recordings/${name}.webm`));
  if (errors.length) throw Error(errors.join("\n"));
  manifest.clips[name] = {
    inPoint: Number(inPoint.toFixed(2)),
    wallDuration: Number(duration.toFixed(2)),
  };
  await fs.writeFile(
    path.join(root, "out/capture-manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
  await fs.writeFile(
    path.join(root, "out/estate-highlight-checks.json"),
    JSON.stringify(checks, null, 2),
  );
  console.log(
    `${name}: ${(duration - inPoint).toFixed(1)} seconds of full-estate interactions`,
  );
}
try {
  await take("12-estate-focus", async (page) => {
    await page.mouse.move(320, 150);
    await hold(page, 2);
    await click(
      page,
      page.locator('.react-flow__node[data-id="product"] .model-symbol'),
    );
    await page.mouse.move(320, 150, { steps: 25 });
    await hold(page, 5);
    const neighbours = await page
      .locator(".react-flow__node.node-neighbour")
      .evaluateAll((ns) => ns.map((n) => n.getAttribute("data-id")).sort());
    const wanted = new Set();
    for (const m of board.models)
      for (const f of m.fields)
        for (const target of [
          ...(f.targets || []),
          ...(f.objectType ? [f.objectType] : []),
        ]) {
          if (m.id === "product" && target !== "product") wanted.add(target);
          if (target === "product" && m.id !== "product") wanted.add(m.id);
        }
    if (JSON.stringify(neighbours) !== JSON.stringify([...wanted].sort()))
      throw Error("Selected Product did not show its complete neighbourhood");
    checks.push({ name: "selected-product", models: 34, neighbours });
    await proof(page, "selected-product");
    await frameProduct(page);
    await page.mouse.move(350, 150);
    await hold(page, 8);
  });
  for (const [name, field, target] of [
    ["13-hover-variants", "variants", "product-variant"],
    ["14-hover-categories", "categories", "category"],
    ["15-hover-brand", "brand", "brand"],
  ]) {
    await take(
      name,
      async (page) => {
        if (field === "brand") {
          await click(
            page,
            page.getByRole("button", { name: "Zoom Out", exact: true }),
          );
          const fieldBox = await page
            .getByLabel("Product brand name", { exact: true })
            .boundingBox();
          const targetBox = await page
            .locator('.react-flow__node[data-id="brand"] .model-drag')
            .boundingBox();
          const shiftY = 500 - (fieldBox.y + targetBox.y) / 2;
          await page.keyboard.press("h");
          await page.mouse.move(1000, 950);
          await page.mouse.down();
          await page.mouse.move(1000, 950 + shiftY, { steps: 35 });
          await page.mouse.up();
          await page.keyboard.press("v");
          await hold(page, 0.3);
        }
        await page.mouse.move(350, 150);
        await hold(page, 1);
        await moveTo(
          page,
          page
            .locator(`.react-flow__node[data-id="product"] .field-row`)
            .filter({
              has: page.locator(`input[aria-label="Product ${field} name"]`),
            }),
        );
        await proof(page, name, ["product", target]);
        await hold(page, 6);
      },
      { focus: true },
    );
  }
  await take("16-estate-reset", async (page) => {
    await click(
      page,
      page.locator('.react-flow__node[data-id="product"] .model-symbol'),
    );
    await page.mouse.move(350, 150);
    await hold(page, 2);
    await click(page, page.getByTitle("Fit whole model"));
    await page.mouse.move(350, 150);
    await hold(page, 5);
    const muted = await page.locator(".react-flow__node.node-muted").count();
    if (muted) throw Error("Whole-model reset left nodes muted");
    await proof(page, "whole-estate");
  });
  await take("17-field-details", async (page) => {
    await page.mouse.move(350, 150);
    await hold(page, 1);
    const product = page.locator('.react-flow__node[data-id="product"]');
    await click(page, product.getByTitle("Edit Name", { exact: true }));
    const panel = page.getByRole("dialog", { name: "Field details" });
    await panel.getByRole("button", { name: "Intent", exact: true }).waitFor();
    await hold(page, 3);
    await click(page, panel.getByRole("button", { name: "Rules", exact: true }));
    const required = await panel.getByLabel("Required field").isChecked();
    const maximum = await panel.getByLabel("Maximum characters", { exact: true }).inputValue();
    if (!required || maximum !== "160") throw Error("Unexpected Product Name settings");
    await moveTo(page, panel.getByLabel("Maximum characters", { exact: true }));
    await hold(page, 5);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("cmmf-studio")));
    if (JSON.stringify(saved.models) !== JSON.stringify(board.models)) throw Error("Inspecting field details changed the model");
    checks.push({ name: "17-field-details", models: saved.models.length, field: "product/name", required, maximum, unchanged: true });
  }, { focus: true });
} finally {
  await browser.close();
}
