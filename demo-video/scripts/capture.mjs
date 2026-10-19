import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "../../node_modules/playwright/index.mjs";
import JSZip from "../../node_modules/jszip/lib/index.js";
import YAML from "../../node_modules/yaml/dist/index.js";
import { root, source, finalBoard, focused } from "./prepare.mjs";

const BASE = process.env.CMMF_DEMO_URL || "http://127.0.0.1:5173";
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const from = process.argv.find((a) => a.startsWith("--from="))?.slice(7);
const browser = await chromium.launch({ headless: true });
const previous = await fs
  .readFile(path.join(root, "out/capture-manifest.json"), "utf8")
  .then(JSON.parse)
  .catch(() => ({ clips: {} }));
const clips = previous.clips;
const errors = [];
const hold = (page, sec) => page.waitForTimeout(sec * 1000);
async function cursor(page) {
  await page.evaluate(() => {
    const el = document.createElement("div");
    el.id = "demo-cursor";
    el.innerHTML =
      '<svg width="28" height="34" viewBox="0 0 28 34"><path d="M3 2v26l7-7 6 11 5-3-6-10h10z" fill="#192329" stroke="white" stroke-width="2"/></svg>';
    Object.assign(el.style, {
      position: "fixed",
      zIndex: "99999",
      pointerEvents: "none",
      left: "620px",
      top: "100px",
      filter: "drop-shadow(0 2px 2px #0003)",
    });
    document.body.append(el);
    document.addEventListener("pointermove", (e) => {
      el.style.left = e.clientX + "px";
      el.style.top = e.clientY + "px";
    });
    document.addEventListener("pointerdown", () => {
      el.style.filter = "drop-shadow(0 0 8px #945d9c)";
    });
    document.addEventListener("pointerup", () => {
      el.style.filter = "drop-shadow(0 2px 2px #0003)";
    });
  });
}
async function click(page, locator) {
  const b = await locator.boundingBox();
  if (!b) throw Error("Invisible capture control");
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 18 });
  await hold(page, 0.15);
  await locator.click();
  await hold(page, 0.35);
}
async function type(page, locator, value) {
  await click(page, locator);
  await locator.fill("");
  await locator.pressSequentially(value, { delay: 45 });
  await locator.press("Tab");
  await hold(page, 0.3);
}
async function focus(page, id, x = 440) {
  await page.getByLabel("Focus a content type").selectOption(id);
  await hold(page, 0.5);
  const node = page.locator(`.react-flow__node[data-id="${id}"]`);
  const b = await node.boundingBox();
  const delta = x - b.x;
  await page.keyboard.press("h");
  await page.mouse.move(1100, 880);
  await page.mouse.down();
  await page.mouse.move(1100 + delta, 880, { steps: 30 });
  await page.mouse.up();
  await page.keyboard.press("v");
  await hold(page, 0.4);
}
async function connect(page, model, field, target) {
  const a = await page
    .locator(
      `.react-flow__node[data-id="${model}"] .react-flow__handle[data-handleid="${field}"]`,
    )
    .boundingBox();
  const b = await page
    .locator(`.react-flow__node[data-id="${target}"] .model-target`)
    .boundingBox();
  if (!a || !b) throw Error(`Missing connection ${field}`);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2, { steps: 20 });
  await hold(page, 0.4);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 45 });
  await hold(page, 0.3);
  await page.mouse.up();
  await hold(page, 1);
}
async function panel(page, name) {
  await click(page, page.getByTitle(`Edit ${name}`, { exact: true }).first());
  const panel = page.getByRole("dialog", { name: "Field details" });
  await click(page, panel.getByRole("button", { name: "Rules", exact: true }));
  return panel;
}
async function take(name, board, action, { initialFocus, holdEnd = 3 } = {}) {
  if (only && only !== name) return;
  if (from && name.slice(0, 2) < from) return;
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    colorScheme: "light",
    acceptDownloads: true,
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
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  const start = Date.now();
  await page.goto(BASE);
  await page.evaluate(() => document.fonts.ready);
  await hold(page, 0.8);
  await cursor(page);
  if (initialFocus) await focus(page, initialFocus);
  const inPoint = (Date.now() - start) / 1000;
  await action(page);
  await page.mouse.move(1850, 1030, { steps: 20 });
  await hold(page, holdEnd);
  await page.screenshot({ path: path.join(root, `public/stills/${name}.png`) });
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cmmf-studio")),
  );
  await fs.writeFile(
    path.join(root, `out/${name}-workspace.json`),
    JSON.stringify(saved, null, 2),
  );
  const elapsed = (Date.now() - start) / 1000;
  const video = page.video();
  await context.close();
  await video.saveAs(path.join(root, `public/recordings/${name}.webm`));
  clips[name] = {
    inPoint: Number(inPoint.toFixed(2)),
    wallDuration: Number(elapsed.toFixed(2)),
  };
  await fs.writeFile(
    path.join(root, "out/capture-manifest.json"),
    JSON.stringify(
      {
        clips,
        errors,
        viewport: { width: 1920, height: 1080 },
        note: "Video in-points are provisional until verified against encoded frames.",
      },
      null,
      2,
    ),
  );
  console.log(
    `${name}: ${elapsed.toFixed(1)}s, clean picture starts approximately ${inPoint.toFixed(1)}s`,
  );
}

try {
  await take(
    "01-concepts",
    { version: 1, name: "Ecommerce architecture", models: [], positions: {} },
    async (page) => {
      await hold(page, 2);
      for (const [name, kind] of [
        ["Product", "entry"],
        ["Product Variant", "entry"],
        ["Category", "taxonomy"],
      ]) {
        let source = page.locator(".new-type");
        if (kind === "taxonomy") {
          await click(page, source);
          source = page.getByRole("dialog", { name: "Add content type" })
            .getByRole("button", { name: "Taxonomy Classification model" });
        }
        const b = await source.boundingBox();
        if (!b) throw Error("Content type palette is not visible");
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 });
        await page.mouse.down();
        await page.mouse.move(950, 450, { steps: 45 });
        await hold(page, 0.3);
        await page.mouse.up();
        await hold(page, 0.7);
        await type(
          page,
          page.locator(".react-flow__node.selected .node-heading input"),
          name,
        );
        await hold(page, 0.7);
      }
      await click(page, page.getByTitle("Fit whole model"));
      await hold(page, 3);
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("cmmf-studio")));
      if (saved.models.length !== 3 || saved.models[2].kind !== "taxonomy") throw Error("Drag-and-drop concept creation failed");
    },
  );

  const fieldBoard = focused();
  fieldBoard.models.forEach((m) => (m.fields = []));
  await take("02-fields", fieldBoard, async (page) => {
    await focus(page, "product", 490);
    for (const [type, name] of [
      ["string", "Name"],
      ["slug", "Slug"],
      ["text", "Summary"],
      ["reference", "Categories"],
      ["reference", "Variants"],
    ]) {
      await click(page, page.locator(`.palette-field.type-${type}`));
      const row = page
        .locator('.react-flow__node[data-id="product"] .field-row')
        .last();
      await typeName(row, name, page);
      await hold(page, 0.5);
    }
    await click(page, page.getByTitle("Fit whole model"));
  });

  for (const [name, count] of [
    ["03-catalogue", 7],
    ["04-store-context", 23],
    ["05-editorial", 34],
  ]) {
    const b = structuredClone(source);
    b.name = "Ecommerce architecture";
    b.models = b.models.slice(0, count);
    for (const m of b.models)
      for (const f of m.fields) {
        if (f.targets) f.targets = [];
        if (f.objectType) f.objectType = "";
      }
    await take(name, b, async (page) => {
      await click(page, page.getByLabel("Auto-layout as grid"));
      await hold(page, 2);
      await click(page, page.getByTitle("Fit whole model"));
      await hold(page, 4);
    });
  }

  await take(
    "06-variants",
    focused(undefined, "variants"),
    async (page) => {
      await hold(page, 2);
      await connect(page, "product", "variants", "product-variant");
      const p = await panel(page, "Variants");
      await click(page, p.getByLabel("Required field"));
      await hold(page, 1.3);
      await click(page, p.getByLabel("Allow multiple values"));
      await hold(page, 1.3);
      await type(page, p.getByLabel("Minimum", { exact: true }), "1");
      await hold(page, 2);
      await click(page, p.getByLabel("Ownership"));
      await p.getByLabel("Ownership").selectOption("contained");
      await hold(page, 3);
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("cmmf-studio")),
      );
      const v = saved.models
        .find((m) => m.id === "product")
        .fields.find((f) => f.id === "variants");
      if (
        v.relation.minItems !== 1 ||
        v.relation.ownership !== "contained" ||
        !v.required ||
        !v.list ||
        v.targets[0] !== "product-variant"
      )
        throw Error("Variant decision was not recorded");
    },
    { initialFocus: "product", holdEnd: 6 },
  );

  const cat = focused(undefined, "categories");
  cat.positions.category = { x: 530, y: 100 };
  await take(
    "07-categories",
    cat,
    async (page) => {
      await hold(page, 2);
      await connect(page, "product", "categories", "category");
      const p = await panel(page, "Categories");
      await click(page, p.getByLabel("Allow multiple values"));
      await hold(page, 2);
      await click(page, p.getByLabel("Ownership"));
      await p.getByLabel("Ownership").selectOption("linked");
      await hold(page, 4);
    },
    { initialFocus: "product", holdEnd: 6 },
  );

  await take(
    "08-localisation",
    focused(undefined, "localisation"),
    async (page) => {
      const p = await panel(page, "Name");
      await hold(page, 2);
      await click(page, p.getByLabel("Localised values"));
      await hold(page, 5);
    },
    { initialFocus: "product", holdEnd: 5 },
  );

  const ed = focused([
    "product",
    "product-variant",
    "category",
    "landing-page",
    "hero",
    "product-grid",
  ]);
  ed.positions["landing-page"] = { x: 40, y: 100 };
  ed.positions.hero = { x: 530, y: 100 };
  ed.positions["product-grid"] = { x: 530, y: 650 };
  ed.positions.product = { x: 1020, y: 650 };
  ed.positions["product-variant"] = { x: 1510, y: 650 };
  ed.positions.category = { x: 1510, y: 100 };
  await take(
    "09-composition",
    ed,
    async (page) => {
      await hold(page, 2);
      const p = await panel(page, "Blocks");
      await hold(page, 5);
      await page.keyboard.press("Escape");
      await click(page, page.getByTitle("Fit whole model"));
      await hold(page, 4);
    },
    { initialFocus: "landing-page", holdEnd: 4 },
  );

  await take(
    "10-architecture",
    finalBoard,
    async (page) => {
      await click(page, page.getByLabel("Auto-layout for connections"));
      await hold(page, 3);
      await click(page, page.getByTitle("Fit whole model"));
      await hold(page, 6);
      await fs.writeFile(
        path.join(root, "public/final-workspace.cmmf.json"),
        JSON.stringify(
          await page.evaluate(() =>
            JSON.parse(localStorage.getItem("cmmf-studio")),
          ),
          null,
          2,
        ),
      );
    },
    { holdEnd: 4 },
  );

  await take(
    "11-export",
    finalBoard,
    async (page) => {
      await hold(page, 2);
      await click(
        page,
        page.getByRole("button", { name: "Export", exact: true }),
      );
      await hold(page, 2);
      const wait = page.waitForEvent("download");
      await click(page, page.getByRole("button", { name: "CMMF models" }));
      const dl = await wait;
      await dl.saveAs(path.join(root, "public/cmmf-models.zip"));
      const zip = await JSZip.loadAsync(
        await fs.readFile(path.join(root, "public/cmmf-models.zip")),
      );
      const yaml = await zip.file("models/product.yaml").async("string");
      const product = YAML.parse(yaml);
      const variant = product.fields.find((f) => f.id === "variants");
      if (
        variant.relation.minItems !== 1 ||
        variant.relation.ownership !== "contained"
      )
        throw Error("Export lost the explicit variant decision");
      const cats = product.fields.find((f) => f.id === "categories");
      if (cats.relation.ownership !== "linked")
        throw Error("Export lost linked categories");
      if (!product.fields.find((f) => f.id === "name").localisation)
        throw Error("Export lost localisation");
      const files = Object.keys(zip.files).filter(
        (f) => f.startsWith("models/") && f.endsWith(".yaml"),
      );
      if (files.length !== 34) throw Error(`Export has ${files.length} models`);
      await fs.writeFile(path.join(root, "public/product.yaml"), yaml);
      const excerpt = YAML.stringify({
        id: product.id,
        name: product.name,
        kind: product.kind,
        fields: [variant],
      });
      await fs.writeFile(
        path.join(root, "public/product-excerpt.yaml"),
        excerpt,
      );
      await fs.writeFile(
        path.join(root, "src/export-data.json"),
        JSON.stringify({ excerpt, models: 34, fields: 201 }, null, 2),
      );
      console.log(
        "Verified actual Studio ZIP: 34 models; minimum 1; contained variants; linked categories; localised name.",
      );
    },
    { initialFocus: "product", holdEnd: 4 },
  );
} finally {
  await browser.close();
}
if (errors.length) throw Error(errors.join("\n"));
async function typeName(row, name, page) {
  await type(page, row.locator(".field-name input"), name);
}
