import { test, expect, type Page, type Locator } from "@playwright/test";
import JSZip from "jszip";
import YAML from "yaml";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const beta = "1.3.0-beta.1";
const article = {
  id: "article",
  name: "Article",
  kind: "entry",
  fields: [
    {
      id: "kind",
      name: "Kind",
      type: "enum",
      values: ["internal", "external"],
    },
    { id: "source", name: "Source", type: "string" },
    { id: "summary", name: "Summary", type: "text" },
    { id: "count", name: "Count", type: "number" },
    { id: "enabled", name: "Enabled", type: "boolean" },
    { id: "tags", name: "Tags", type: "string", list: true },
    { id: "author", name: "Author", type: "reference", targets: ["article"] },
  ],
};
async function ready(page: Page) {
  await expect(page.locator(".studio")).toBeVisible();
  await expect(page.locator(".loading-overlay")).toHaveCount(0);
}
async function importData(page: Page, value: unknown, name = "article.json") {
  await page.locator("input[type=file]").setInputFiles({
    name,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(value)),
  });
  await expect(page.locator(".loading-overlay")).toHaveCount(0);
}
async function setup(page: Page) {
  await page.goto("/");
  await ready(page);
  await page.getByLabel("CMMF version", { exact: true }).selectOption(beta);
  await importData(page, article);
  await expect(
    page.getByLabel("Name of Article", { exact: true }),
  ).toBeVisible();
  await page.getByTitle("Edit Article details", { exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Content type details" });
  await panel
    .getByRole("button", { name: "Validation hints", exact: true })
    .click();
  return panel;
}
async function actionFields(hint: Locator, action: string, ids: string[]) {
  const group = hint.locator(".hint-action").filter({
    has: hint.page().getByRole("checkbox", { name: action, exact: true }),
  });
  const toggle = group.getByRole("checkbox", { name: action, exact: true });
  await toggle.check();
  const choices = group.locator(".hint-field-choices").getByRole("checkbox");
  for (const choice of await choices.all()) {
    const id = await choice.locator("..").locator("small").textContent();
    await choice.setChecked(ids.includes(id!));
  }
}
async function snapshot(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("cmmf-studio")!));
}

test("author all beta forms, nested conditions and combined actions, then validate a real export upstream", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const panel = await setup(page);
  await panel
    .getByRole("button", { name: "Add structured hint", exact: true })
    .click();
  const first = panel.getByRole("article", {
    name: "Validation hint 1",
    exact: true,
  });
  await first.getByLabel("Hint 1 ID", { exact: true }).fill("source-intent");
  await first
    .getByLabel("Hint 1 description", { exact: true })
    .fill("Conditional source decisions");
  await first.getByLabel("Hint 1 conditional", { exact: true }).check();
  await first
    .getByLabel("Condition form", { exact: true })
    .selectOption("allOf");
  await first
    .getByLabel("Condition 1 field", { exact: true })
    .selectOption("enabled");
  await first
    .getByLabel("Condition 1 operator", { exact: true })
    .selectOption("equals");
  await first
    .getByLabel("Condition 1 value", { exact: true })
    .selectOption("false");
  await first
    .getByRole("button", { name: "Add condition", exact: true })
    .click();
  await first
    .getByLabel("Condition 2 form", { exact: true })
    .selectOption("not");
  await first
    .getByLabel("Condition 2 negated form", { exact: true })
    .selectOption("anyOf");
  await first
    .getByLabel("Condition 2 negated 1 field", { exact: true })
    .selectOption("count");
  await first
    .getByLabel("Condition 2 negated 1 operator", { exact: true })
    .selectOption("gte");
  await first
    .getByLabel("Condition 2 negated 1 value", { exact: true })
    .fill("0");
  const anyGroup = first
    .locator("fieldset")
    .filter({
      has: page.getByLabel("Condition 2 negated form", { exact: true }),
    })
    .last();
  await anyGroup
    .getByRole("button", { name: "Add condition", exact: true })
    .click();
  await first
    .getByLabel("Condition 2 negated 2 field", { exact: true })
    .selectOption("kind");
  await first
    .getByLabel("Condition 2 negated 2 operator", { exact: true })
    .selectOption("in");
  await first
    .getByLabel("Condition 2 negated 2 set value 1", { exact: true })
    .fill("external");
  await first
    .getByRole("button", { name: "Add set value", exact: true })
    .click();
  await first
    .getByLabel("Condition 2 negated 2 set value 2", { exact: true })
    .fill("internal");
  await actionFields(first, "Require every field", ["source"]);
  await actionFields(first, "Keep every field empty", ["summary"]);
  await actionFields(first, "At least one field", ["source", "author"]);
  await actionFields(first, "At most one field", ["enabled", "count"]);
  await actionFields(first, "Exactly one field", ["tags", "source"]);
  await expect(first.getByLabel("Hint 1 ID", { exact: true })).toHaveValue(
    "source-intent",
  );
  await panel
    .getByRole("button", { name: "Add expression hint", exact: true })
    .click();
  const second = panel.getByRole("article", {
    name: "Validation hint 2",
    exact: true,
  });
  await second
    .getByLabel("Hint 2 description", { exact: true })
    .fill("Vendor expression stays intact");
  await second
    .getByLabel("Hint 2 dialect", { exact: true })
    .fill("vendor-rules-v2");
  await second
    .getByLabel("Hint 2 expression rule value type", { exact: true })
    .selectOption("string");
  await second
    .getByLabel("Hint 2 expression rule", { exact: true })
    .fill("throw new Error('must never run')");
  await second
    .getByLabel("Hint 2 severity", { exact: true })
    .selectOption("warning");
  await panel
    .getByRole("button", { name: "Add prose hint", exact: true })
    .click();
  const third = panel.getByRole("article", {
    name: "Validation hint 3",
    exact: true,
  });
  await third
    .getByLabel("Hint 3 description", { exact: true })
    .fill("Confirm source rights manually");
  await third
    .getByLabel("Hint 3 severity", { exact: true })
    .selectOption("info");
  await page
    .getByLabel("Export namespace", { exact: true })
    .fill("test.studio.beta");
  await expect(
    page.getByText("Model checks passed", { exact: true }),
  ).toBeVisible();
  await expect(panel.locator(".hint-diagnostics")).toHaveCount(0);
  const saved = await snapshot(page);
  const hints = saved.models[0].validationHints;
  expect(saved.cmmfVersion).toBe(beta);
  expect(hints[0].when).toEqual({
    allOf: [
      { field: "enabled", equals: false },
      {
        not: {
          anyOf: [
            { field: "count", gte: 0 },
            { field: "kind", in: ["external", "internal"] },
          ],
        },
      },
    ],
  });
  expect(hints[0].then).toEqual({
    require: ["source"],
    forbid: ["summary"],
    atLeastOneOf: ["source", "author"],
    atMostOneOf: ["count", "enabled"],
    exactlyOneOf: ["source", "tags"],
  });
  expect(hints[0]).not.toHaveProperty("severity");
  expect(hints[1].expression).toEqual({
    dialect: "vendor-rules-v2",
    rule: "throw new Error('must never run')",
  });
  expect(hints[2]).not.toHaveProperty("then");
  await page.screenshot({ path: "artifacts/studio-beta-prose-light.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CMMF models" }).click();
  const download = await downloadPromise;
  const zip = await JSZip.loadAsync(
    await fs.readFile((await download.path())!),
  );
  const manifest = YAML.parse(await zip.file("manifest.yaml")!.async("string"));
  expect(manifest).toEqual({
    specVersion: beta,
    namespace: "test.studio.beta",
    modelsPath: "./models",
  });
  const exported = YAML.parse(
    await zip.file("models/article.yaml")!.async("string"),
  );
  expect(exported.validationHints).toEqual(hints);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "studio-beta-export-"));
  try {
    for (const file of Object.values(zip.files)) {
      if (file.dir) continue;
      const destination = path.join(dir, file.name);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, await file.async("nodebuffer"));
    }
    expect(
      execFileSync(
        process.execPath,
        [
          path.resolve("vendor/cmmf/1.3.0-beta.1/scripts/validate-models.mjs"),
          "--manifest",
          path.join(dir, "manifest.yaml"),
        ],
        { encoding: "utf8" },
      ),
    ).toContain("Validated 1 model declarations");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
  await page.reload();
  await ready(page);
  await expect(page.getByLabel("CMMF version", { exact: true })).toHaveValue(
    beta,
  );
  expect((await snapshot(page)).models[0].validationHints).toEqual(hints);
  expect(pageErrors).toEqual([]);
});

test("semantic problems, duplicate IDs and downgrades preserve intent but block CMMF export", async ({
  page,
}) => {
  const panel = await setup(page);
  await panel
    .getByRole("button", { name: "Add structured hint", exact: true })
    .click();
  const hint = panel.getByRole("article", {
    name: "Validation hint 1",
    exact: true,
  });
  await hint
    .getByLabel("Hint 1 description", { exact: true })
    .fill("Numeric threshold");
  await hint.getByLabel("Hint 1 conditional", { exact: true }).check();
  await hint
    .getByLabel("Condition field", { exact: true })
    .selectOption("source");
  await hint
    .getByLabel("Condition operator", { exact: true })
    .selectOption("gte");
  await expect(hint.getByLabel("Hint 1 declaration issues")).toContainText(
    "not supported for string",
  );
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "CMMF models" }).click();
  await expect(
    page.getByText("Resolve model issues before exporting CMMF.", {
      exact: true,
    }),
  ).toBeVisible();
  await hint
    .getByLabel("Condition field", { exact: true })
    .selectOption("count");
  await expect(hint.locator(".hint-diagnostics")).toHaveCount(0);
  await panel
    .getByRole("button", { name: "Add prose hint", exact: true })
    .click();
  await panel
    .getByLabel("Hint 2 description", { exact: true })
    .fill("Prose review");
  await panel.getByLabel("Hint 2 ID", { exact: true }).fill("hint");
  await panel
    .getByLabel("Hint 2 severity", { exact: true })
    .selectOption("info");
  await expect(panel.getByLabel("Hint 2 declaration issues")).toContainText(
    "Duplicate hint ID",
  );
  await panel.getByLabel("Hint 2 ID", { exact: true }).fill("manual-review");
  await expect(panel.locator(".hint-diagnostics")).toHaveCount(0);
  const before = (await snapshot(page)).models[0].validationHints;
  await page.getByLabel("CMMF version", { exact: true }).selectOption("1.2.0");
  await expect(
    panel.getByText(/stable CMMF 1.2.0 does not support or check/),
  ).toBeVisible();
  expect((await snapshot(page)).models[0].validationHints).toEqual(before);
  await expect(
    panel.getByLabel("Hint 1 description", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "CMMF models" }).click();
  await expect(
    page.getByText(/stable 1.2.0 does not check or support/),
  ).toBeVisible();
  await page.getByLabel("CMMF version", { exact: true }).selectOption(beta);
  await expect(
    panel.getByLabel("Hint 1 description", { exact: true }),
  ).toHaveValue("Numeric threshold");
  await expect(panel.locator(".hint-diagnostics")).toHaveCount(0);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await hint
    .getByLabel("Condition operator", { exact: true })
    .selectOption("isEmpty");
  await expect(hint.getByText(/False, 0, whitespace/)).toBeVisible();
  await page.screenshot({ path: "artifacts/studio-beta-hints-dark.png" });
});

test("imports respect explicit versions, reject invalid declarations, and do not infer beta from hints", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  await expect(page.getByLabel("CMMF version", { exact: true })).toHaveValue(
    "1.2.0",
  );
  const model = {
    ...article,
    validationHints: [{ id: "review", description: "Manual review" }],
  };
  await importData(page, model);
  await expect(page.getByLabel("Workspace name")).toHaveValue("Article");
  await expect(page.getByLabel("CMMF version", { exact: true })).toHaveValue(
    "1.2.0",
  );
  await page.getByRole("button", { name: /model issues/ }).click();
  await expect(
    page.getByText(/stable 1.2.0 does not check or support/),
  ).toBeVisible();
  await importData(page, {
    version: 1,
    name: "Beta model",
    cmmfVersion: beta,
    models: [model],
  });
  await expect(page.getByLabel("Workspace name")).toHaveValue("Beta model");
  await expect(page.getByLabel("CMMF version", { exact: true })).toHaveValue(
    beta,
  );
  for (const value of [
    { version: 1, name: "Bad version", cmmfVersion: "1.3.0", models: [model] },
    {
      version: 1,
      name: "Bad hint",
      cmmfVersion: beta,
      models: [
        {
          ...article,
          validationHints: [
            {
              id: "missing",
              description: "Broken reference",
              then: { require: ["missing-field"] },
            },
          ],
        },
      ],
    },
  ]) {
    await importData(page, value);
    await expect(page.getByText(/Import failed:/)).toBeVisible();
    await expect(page.getByLabel("Workspace name")).toHaveValue("Beta model");
  }
  await page.getByRole("button", { name: "Canvas guide" }).click();
  await page
    .getByRole("button", { name: "Load example board (can undo)" })
    .click();
  await ready(page);
  await expect(page.getByLabel("CMMF version", { exact: true })).toHaveValue(
    beta,
  );
  await page.reload();
  await ready(page);
  await expect(page.getByLabel("CMMF version", { exact: true })).toHaveValue(
    beta,
  );
});

test("unsupported saved declarations remain recoverable rather than being replaced by stable data", async ({
  page,
}) => {
  const original = JSON.stringify({
    version: 1,
    cmmfVersion: "1.3.0-beta.2",
    name: "Future workspace",
    models: [article],
    positions: {},
  });
  await page.addInitScript(
    (original) => localStorage.setItem("cmmf-studio", original),
    original,
  );
  await page.goto("/");
  await ready(page);
  const warning = page.getByRole("alert", {
    name: "Saved workspace could not be opened",
  });
  await expect(warning).toBeVisible();
  await expect(warning).toContainText("Unsupported CMMF version");
  expect(await page.evaluate(() => localStorage.getItem("cmmf-studio"))).toBe(
    original,
  );
  const downloadPromise = page.waitForEvent("download");
  await warning
    .getByRole("button", { name: "Download original workspace" })
    .click();
  const download = await downloadPromise;
  expect(await fs.readFile((await download.path())!, "utf8")).toBe(original);
  await warning
    .getByRole("button", { name: "Save current workspace instead" })
    .click();
  await expect(warning).toHaveCount(0);
  await expect
    .poll(async () => (await snapshot(page)).name)
    .toBe("Customer stories");
});

test("beta content-type controls remain usable on mobile and do not appear in field settings", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const panel = await setup(page);
  await panel
    .getByRole("button", { name: "Add structured hint", exact: true })
    .click();
  const hint = panel.getByRole("article", {
    name: "Validation hint 1",
    exact: true,
  });
  await hint
    .getByLabel("Hint 1 description", { exact: true })
    .fill("A present tag needs a source");
  await hint.getByLabel("Hint 1 conditional", { exact: true }).check();
  await hint
    .getByLabel("Condition form", { exact: true })
    .selectOption("allOf");
  await hint
    .getByLabel("Condition 1 form", { exact: true })
    .selectOption("not");
  await hint
    .getByLabel("Condition 1 negated field", { exact: true })
    .selectOption("tags");
  await hint
    .getByLabel("Condition 1 negated operator", { exact: true })
    .selectOption("isEmpty");
  await actionFields(hint, "Require every field", ["source"]);
  await expect(hint.locator(".hint-diagnostics")).toHaveCount(0);
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  expect(
    await panel
      .locator(".panel-body")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await panel.locator(".panel-body").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: "artifacts/studio-beta-mobile-light.png" });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({ path: "artifacts/studio-beta-mobile-dark.png" });
  await page.keyboard.press("Escape");
  await page.getByTitle("Edit Count", { exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Field details" })
      .getByRole("button", { name: "Validation hints", exact: true }),
  ).toHaveCount(0);
});

test("typed null operands, form changes, deletion and undo retain stable hint identity", async ({
  page,
}) => {
  const panel = await setup(page);
  await panel
    .getByRole("button", { name: "Add structured hint", exact: true })
    .click();
  const hint = panel.getByRole("article", {
    name: "Validation hint 1",
    exact: true,
  });
  await hint
    .getByLabel("Hint 1 description", { exact: true })
    .fill("Explicit null comparison");
  await hint.getByLabel("Hint 1 conditional", { exact: true }).check();
  await hint
    .getByLabel("Condition field", { exact: true })
    .selectOption("count");
  await hint
    .getByLabel("Condition operator", { exact: true })
    .selectOption("equals");
  await hint
    .getByLabel("Condition value type", { exact: true })
    .selectOption("null");
  expect((await snapshot(page)).models[0].validationHints[0].when).toEqual({
    field: "count",
    equals: null,
  });
  await hint
    .getByLabel("Hint 1 representation", { exact: true })
    .selectOption("expression");
  await hint
    .getByLabel("Hint 1 dialect", { exact: true })
    .fill("unknown-dialect");
  let saved = (await snapshot(page)).models[0].validationHints[0];
  expect(saved).toEqual({
    id: "hint",
    description: "Explicit null comparison",
    expression: { dialect: "unknown-dialect", rule: null },
  });
  await hint
    .getByLabel("Hint 1 representation", { exact: true })
    .selectOption("prose");
  saved = (await snapshot(page)).models[0].validationHints[0];
  expect(saved).toEqual({
    id: "hint",
    description: "Explicit null comparison",
  });
  await hint
    .getByRole("button", { name: "Remove hint 1", exact: true })
    .click();
  expect((await snapshot(page)).models[0]).not.toHaveProperty(
    "validationHints",
  );
  await page.getByTitle("Undo (⌘Z)").click();
  await expect(panel.getByLabel("Hint 1 ID", { exact: true })).toHaveValue(
    "hint",
  );
  await panel
    .getByRole("button", { name: "Remove hint 1", exact: true })
    .click();
  await page.getByLabel("CMMF version", { exact: true }).selectOption("1.2.0");
  await expect(
    panel.getByRole("button", { name: "Validation hints", exact: true }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Intent", exact: true }),
  ).toHaveClass("active");
  await expect(
    page.getByText("Model checks passed", { exact: true }),
  ).toBeVisible();
});

test("malformed metadata preserved by stable can be repaired after beta selection without crashing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await ready(page);
  const invalid = {
    ...article,
    validationHints: [
      null,
      {
        id: "legacy",
        description: "Retained intent",
        when: null,
        then: { require: ["source"] },
        extra: true,
      },
    ],
  };
  await importData(page, invalid);
  await page.getByLabel("CMMF version", { exact: true }).selectOption(beta);
  expect((await snapshot(page)).models[0].validationHints).toEqual(
    invalid.validationHints,
  );
  await page.getByTitle("Edit Article details", { exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Content type details" });
  await panel
    .getByRole("button", { name: "Validation hints", exact: true })
    .click();
  await expect(
    panel.getByText("Hint 1 needs repair", { exact: true }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Remove hint 1", exact: true })
    .click();
  const hint = panel.getByRole("article", {
    name: "Validation hint 1",
    exact: true,
  });
  await hint.getByRole("button", { name: "Remove extra", exact: true }).click();
  await hint.getByRole("button", { name: "Remove when", exact: true }).click();
  await expect(hint.getByLabel("Hint 1 ID", { exact: true })).toHaveValue(
    "legacy",
  );
  await expect(
    hint.getByLabel("Hint 1 description", { exact: true }),
  ).toHaveValue("Retained intent");
  expect((await snapshot(page)).models[0].validationHints).toEqual([
    {
      id: "legacy",
      description: "Retained intent",
      then: { require: ["source"] },
    },
  ]);
  await expect(
    page.getByText("Model checks passed", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
