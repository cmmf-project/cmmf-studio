import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import YAML from "yaml";
import fs from "node:fs/promises";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Workspace name")).toHaveValue(
    "Customer stories",
  );
  await expect(async () => {
    const canvas = await page.locator(".canvas").boundingBox();
    const last = await page
      .locator('.react-flow__node[data-id="organisation"]')
      .boundingBox();
    expect(last!.x + last!.width).toBeLessThan(canvas!.x + canvas!.width - 20);
  }).toPass();
});
test("canvas, drag fields and containers, reorder, multiple inspectors, persistence and export", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const story = page.locator('.react-flow__node[data-id="customer-story"]');
  await expect(story).toBeVisible();
  await expect(page.getByText("Model checks passed")).toBeVisible();
  await expect(async () => {
    const canvas = await page.locator(".canvas").boundingBox();
    const last = await page
      .locator('.react-flow__node[data-id="organisation"]')
      .boundingBox();
    expect(last!.x + last!.width).toBeLessThan(canvas!.x + canvas!.width - 20);
  }).toPass();
  await page.screenshot({ path: "artifacts/studio-canvas.png" });
  // Native HTML drag payload is used by the field palette.
  const data = await page.evaluateHandle(() => new DataTransfer());
  await page
    .locator(".palette-field.type-number")
    .dispatchEvent("dragstart", { dataTransfer: data });
  await story.locator("article").dispatchEvent("drop", { dataTransfer: data });
  await expect(story.getByLabel("Customer story number name")).toHaveValue(
    "Number",
  );
  await story.getByLabel("Customer story number name").fill("Impact score");
  const field = await page.evaluateHandle(() => new DataTransfer());
  await story
    .locator(".field-row")
    .last()
    .locator(".field-grip")
    .dispatchEvent("dragstart", { dataTransfer: field });
  await story
    .locator(".field-row")
    .first()
    .dispatchEvent("drop", { dataTransfer: field });
  await expect(
    story.locator(".field-row").first().locator("input"),
  ).toHaveValue("Impact score");
  await page.getByTitle("Edit Customer story details").click();
  await page.getByTitle("Edit Title", { exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(2);
  const panel = page.getByRole("dialog", { name: "Field details" });
  await panel.getByText("Editorial", { exact: true }).click();
  await panel
    .getByLabel("Guidance for authors")
    .fill("Lead with a measurable result.");
  const box = await panel.locator("header").boundingBox();
  if (box) {
    await page.mouse.move(box.x + 90, box.y + 18);
    await page.mouse.down();
    await page.mouse.move(650, 170, { steps: 15 });
    await page.mouse.up();
  }
  await expect(
    page.getByRole("dialog", { name: "Content type details" }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/studio-inspectors.png" });
  await page.keyboard.press("Escape");
  const container = await page.evaluateHandle(() => new DataTransfer());
  await page
    .locator(".new-type")
    .dispatchEvent("dragstart", { dataTransfer: container });
  await page.locator(".canvas").dispatchEvent("drop", {
    dataTransfer: container,
    clientX: 850,
    clientY: 500,
  });
  await expect(page.getByLabel("Name of Untitled type")).toBeVisible();
  await page.getByTitle("Undo (⌘Z)").click();
  await expect(page.getByLabel("Name of Untitled type")).toHaveCount(0);
  await page.reload();
  await expect(
    story.locator(".field-row").first().locator("input"),
  ).toHaveValue("Impact score");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CMMF models" }).click();
  const download = await downloadPromise;
  const zip = await JSZip.loadAsync(
    await fs.readFile((await download.path())!),
  );
  const model = YAML.parse(
    await zip.file("models/customer-story.yaml")!.async("string"),
  );
  expect(
    model.fields.find((f: any) => f.id === "title").editorial.helpText,
  ).toBe("Lead with a measurable result.");
  expect(model.fields[0].name).toBe("Impact score");
  expect(errors).toEqual([]);
});
test("reference handles connect; cardinality and delete update the model", async ({
  page,
}) => {
  const story = page.locator('.react-flow__node[data-id="customer-story"]');
  await story.click();
  await page.locator(".palette-field.type-reference").click();
  const handle = story.locator(
    '.react-flow__handle[data-handleid="reference"]',
  );
  const target = page.locator(
    '.react-flow__node[data-id="person"] .model-target',
  );
  const a = await handle.boundingBox(),
    b = await target.boundingBox();
  if (!a || !b) throw Error("Missing handles");
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 });
  await page.mouse.up();
  await expect(
    page.locator(
      '.react-flow__edge[data-id="customer-story/reference/person"]',
    ),
  ).toBeVisible();
  await page.getByTitle("Edit Reference", { exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Field details" });
  await panel.getByRole("button", { name: "Rules", exact: true }).click();
  await panel.getByLabel("Allow multiple values").check();
  await panel.getByLabel("Minimum").fill("2");
  await panel.getByLabel("Maximum").fill("5");
  await expect(
    page.getByText("Reference · 2..5", { exact: true }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Delete field" }).click();
  await expect(handle).toHaveCount(0);
  await expect(
    page.locator(
      '.react-flow__edge[data-id="customer-story/reference/person"]',
    ),
  ).toHaveCount(0);
});
test("workspace import and empty workspace survive reload", async ({
  page,
}) => {
  await page.locator("input[type=file]").setInputFiles({
    name: "test.yaml",
    mimeType: "text/yaml",
    buffer: Buffer.from(
      "id: note\nname: Note\nkind: entry\nfields:\n  - id: title\n    type: string\n    name: Title\n",
    ),
  });
  await expect(page.getByLabel("Name of Note")).toBeVisible();
  await page.getByRole("button", { name: "Canvas guide" }).click();
  await page
    .getByRole("button", { name: "Start an empty board (can undo)" })
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".react-flow__node")).toHaveCount(0);
});

test("type-specific rules are editable and export as CMMF", async ({
  page,
}) => {
  const story = page.locator('.react-flow__node[data-id="customer-story"]');
  await page.getByTitle("Edit Title", { exact: true }).click();
  let panel = page.getByRole("dialog", { name: "Field details" });
  await panel.getByRole("button", { name: "Rules", exact: true }).click();
  await expect(panel.getByText("Validation rules · JSON")).toHaveCount(0);
  await panel.getByLabel("Minimum characters").fill("5");
  await panel.getByLabel("Maximum characters").fill("90");
  await panel.getByLabel("Pattern (regular expression)").fill("^[A-Z]");
  await panel.getByLabel("Set a default").check();
  await panel.getByLabel("Default", { exact: true }).fill("A useful title");
  await page.screenshot({ path: "artifacts/studio-text-rules.png" });
  await page.keyboard.press("Escape");
  await story.click();
  await page.locator(".palette-field.type-number").click();
  await page.getByTitle("Edit Number", { exact: true }).click();
  panel = page.getByRole("dialog", { name: "Field details" });
  await panel.getByRole("button", { name: "Rules", exact: true }).click();
  await panel.getByLabel("Minimum value").fill("0");
  await panel.getByLabel("Maximum value").fill("100");
  await panel.getByLabel("Whole numbers only").check();
  await panel.getByLabel("Allow multiple values").check();
  await panel.getByLabel("Minimum items").fill("1");
  await panel.getByLabel("Maximum items").fill("4");
  await panel.getByLabel("Unique list values").check();
  await page.keyboard.press("Escape");
  await page.getByTitle("Edit Story", { exact: true }).click();
  panel = page.getByRole("dialog", { name: "Field details" });
  await panel.getByRole("button", { name: "Rules", exact: true }).click();
  await panel.getByLabel("Allowed marks").pressSequentially("bold, italic");
  await panel.getByLabel("Allowed blocks").fill("paragraph, quote");
  await panel.getByLabel("Allow asset embeds").check();
  await panel.getByLabel("Reference embed targets").selectOption("person");
  await page.screenshot({ path: "artifacts/studio-rich-text-rules.png" });
  await page.keyboard.press("Escape");
  await page.getByTitle("Edit Cover image", { exact: true }).click();
  panel = page.getByRole("dialog", { name: "Field details" });
  await panel.getByRole("button", { name: "Rules", exact: true }).click();
  await panel
    .getByLabel("Allowed MIME types")
    .pressSequentially("image/jpeg, image/png");
  await panel.getByLabel("File size limit").fill("5000000");
  await panel.getByLabel("Set image dimensions").check();
  await panel.getByLabel("New Dimensions property").fill("width");
  await panel.getByLabel("Add Dimensions property").click();
  await panel.getByLabel("width value type").selectOption("number");
  await panel.getByLabel("width", { exact: true }).fill("1600");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "CMMF models" }).click();
  const download = await wait;
  const zip = await JSZip.loadAsync(
    await fs.readFile((await download.path())!),
  );
  const m = YAML.parse(
    await zip.file("models/customer-story.yaml")!.async("string"),
  );
  expect(m.fields.find((f: any) => f.id === "title")).toMatchObject({
    default: "A useful title",
    validations: { minLength: 5, maxLength: 90, regex: "^[A-Z]" },
  });
  expect(m.fields.find((f: any) => f.id === "number").validations).toEqual({
    min: 0,
    max: 100,
    integerOnly: true,
    minItems: 1,
    maxItems: 4,
    uniqueItems: true,
  });
  expect(m.fields.find((f: any) => f.id === "story").richTextConfig).toEqual({
    marks: ["bold", "italic"],
    blocks: ["paragraph", "quote"],
    embeds: [{ kind: "asset" }, { kind: "reference", targets: ["person"] }],
  });
  expect(m.fields.find((f: any) => f.id === "cover").validations).toEqual({
    mimeTypes: ["image/jpeg", "image/png"],
    fileSize: 5000000,
    dimensions: { width: 1600 },
  });
});
test("large ecommerce overview, focus and model kinds", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.getByText("A little structure.")).toHaveCount(0);
  await expect(page.getByText("BUILD YOUR MODEL", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Canvas guide" }).click();
  await page
    .getByRole("button", { name: "Load large ecommerce model (can undo)" })
    .click();
  await expect(page.getByLabel("Workspace name")).toHaveValue(
    "Large ecommerce store",
  );
  await expect(page.locator(".react-flow__node")).toHaveCount(34);
  await expect(page.getByText("Model checks passed")).toBeVisible();
  await expect(async () => {
    const canvas = await page.locator(".canvas").boundingBox();
    for (const node of await page.locator(".react-flow__node").all()) {
      const box = await node.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(canvas!.x);
      expect(box!.y).toBeGreaterThanOrEqual(canvas!.y);
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        canvas!.x + canvas!.width,
      );
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        canvas!.y + canvas!.height,
      );
    }
  }).toPass();
  await page.screenshot({ path: "artifacts/studio-ecommerce-overview.png" });
  await page.getByLabel("Focus a content type").selectOption("product");
  const product = page.locator('.react-flow__node[data-id="product"]');
  await expect(async () =>
    expect((await product.boundingBox())!.width).toBeGreaterThan(280),
  ).toPass();
  await page.screenshot({ path: "artifacts/studio-ecommerce-product.png" });
  const beforeMove = await product.boundingBox();
  const grip = await product.locator(".model-symbol").boundingBox();
  await page.mouse.move(grip!.x + grip!.width / 2, grip!.y + grip!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    grip!.x + grip!.width / 2 + 60,
    grip!.y + grip!.height / 2 + 25,
    { steps: 15 },
  );
  await page.mouse.up();
  await expect(async () =>
    expect((await product.boundingBox())!.x).toBeGreaterThan(
      beforeMove!.x + 40,
    ),
  ).toPass();

  await page.getByTitle("Edit Product details").click();
  const panel = page.getByRole("dialog", { name: "Content type details" });
  await expect(panel.getByLabel("Model kind").locator("option")).toHaveCount(5);
  await page.keyboard.press("Escape");
  await page.locator(".new-type").click();
  await page
    .getByRole("dialog", { name: "Add content type", exact: true })
    .getByRole("button", { name: "Taxonomy Classification model" })
    .click();
  await page.getByTitle("Edit Untitled type details").click();
  await expect(page.getByRole("dialog").getByLabel("Model kind")).toHaveValue(
    "taxonomy",
  );
  expect(errors).toEqual([]);
});

test("dark mode persists and covers canvas, palette and inspectors", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".topbar")).toHaveCSS(
    "background-color",
    "rgb(32, 39, 51)",
  );
  await expect(page.locator(".model-node").first()).toHaveCSS(
    "background-color",
    "rgb(32, 39, 51)",
  );
  await expect(page.locator(".react-flow__background")).toHaveCSS(
    "background-color",
    "rgb(21, 26, 35)",
  );
  await page.getByTitle("Edit Title", { exact: true }).click();
  await page
    .getByRole("dialog", { name: "Field details" })
    .getByRole("button", { name: "Rules", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/studio-dark-inspector.png" });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("focus and reference hover keep the sidebar and graph in sync", async ({
  page,
}) => {
  const story = page.locator('.react-flow__node[data-id="customer-story"]'),
    person = page.locator('.react-flow__node[data-id="person"]'),
    organisation = page.locator('.react-flow__node[data-id="organisation"]');
  await story.locator(".model-symbol").click();
  await expect(page.getByLabel("Focus a content type")).toHaveValue(
    "customer-story",
  );
  await expect(story).toHaveCSS("opacity", "1");
  await expect(
    page.locator(
      '.react-flow__edge[data-id="customer-story/customer/organisation"]',
    ),
  ).toHaveClass(/edge-highlight/);
  const row = story
    .locator(".field-row")
    .filter({ has: page.getByLabel("Customer story customer name") });
  await row.hover();
  await expect(organisation).toHaveClass(/node-highlight/);
  await expect(person).toHaveClass(/node-muted/);
  await expect(person).toHaveCSS("opacity", "0.22");
  await page.screenshot({ path: "artifacts/studio-reference-highlight.png" });
  await page.getByLabel("Focus a content type").selectOption("person");
  await expect(page.getByLabel("Focus a content type")).toHaveValue("person");
  await expect(person).toHaveClass(/node-focused/);
  await page.getByLabel("Focus a content type").selectOption("");
  await expect(person).toHaveCSS("opacity", "1");
  await expect(story).toHaveCSS("opacity", "1");
});
test("both add buttons open a kind popout and find collision-free space", async ({
  page,
}) => {
  await expect(page.getByLabel("New model kind")).toHaveCount(0);
  await page.locator(".new-type").click();
  let popup = page.getByRole("dialog", {
    name: "Add content type",
    exact: true,
  });
  await expect(popup.getByRole("button")).toHaveCount(6);
  await popup
    .getByRole("button", { name: "Taxonomy Classification model" })
    .click();
  await expect(page.getByLabel("Focus a content type")).toHaveValue("taxonomy");
  await page.getByTitle("Add content type", { exact: true }).click();
  popup = page.getByRole("dialog", { name: "Add content type", exact: true });
  await popup
    .getByRole("button", { name: "Object Embedded structure" })
    .click();
  await expect(page.getByLabel("Focus a content type")).toHaveValue("object");
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cmmf-studio")!),
  );
  expect(stored.models.find((m: any) => m.id === "taxonomy").kind).toBe(
    "taxonomy",
  );
  expect(stored.models.find((m: any) => m.id === "object").kind).toBe("object");
  for (const newId of ["taxonomy", "object"]) {
    const p = stored.positions[newId];
    for (const m of stored.models) {
      if (m.id === newId) continue;
      const q = stored.positions[m.id];
      expect(
        p.x < q.x + 310 &&
          p.x + 310 > q.x &&
          p.y < q.y + 124 + m.fields.length * 43 &&
          p.y + 124 > q.y,
      ).toBe(false);
    }
  }
  await page.getByTitle("Undo (⌘Z)").click();
  await expect(page.locator('.react-flow__node[data-id="object"]')).toHaveCount(
    0,
  );
});
test("relationship-aware layouts work on a large board and undo restores positions", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Canvas guide" }).click();
  await page
    .getByRole("button", { name: "Load large ecommerce model (can undo)" })
    .click();
  await expect(page.locator(".react-flow__node")).toHaveCount(34);
  const original = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cmmf-studio")!),
  );
  await page.getByRole("button", { name: "Auto-layout as grid" }).click();
  await expect(
    page.getByRole("button", { name: "Auto-layout as grid" }),
  ).toBeEnabled();
  await expect(async () => {
    const b = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cmmf-studio")!),
    );
    expect(b.layout).toBe("grid");
    expect(b.positions).not.toEqual(original.positions);
    expect(b.models).toEqual(original.models);
  }).toPass();
  await page
    .getByRole("button", { name: "Auto-layout for connections" })
    .click();
  await expect(
    page.getByRole("button", { name: "Auto-layout for connections" }),
  ).toBeEnabled();
  await expect(page.locator(".connection-label").first()).toBeVisible();
  const routed = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cmmf-studio")!),
  );
  expect(routed.layout).toBe("connections");
  expect(Object.keys(routed.routes).length).toBeGreaterThan(40);
  await expect(async () => {
    const boxes = await page.locator(".react-flow__node").evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i],
          b = boxes[j];
        expect(
          a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y,
        ).toBe(false);
      }
  }).toPass();
  await expect(async () => {
    const result = await page.evaluate(() => {
      const board = JSON.parse(localStorage.getItem("cmmf-studio")!);
      const canvas = document.querySelector(".canvas")!.getBoundingClientRect();
      const transform = new DOMMatrix(
        getComputedStyle(document.querySelector(".react-flow__viewport")!)
          .transform,
      );
      return Object.values(
        board.routes as Record<string, { points: { x: number; y: number }[] }>,
      )
        .flatMap((route) => route.points)
        .every(
          (p) =>
            p.x * transform.a + transform.e >= 0 &&
            p.y * transform.a + transform.f >= 0 &&
            p.x * transform.a + transform.e <= canvas.width &&
            p.y * transform.a + transform.f <= canvas.height,
        );
    });
    expect(result).toBe(true);
  }).toPass();
  await page.screenshot({ path: "artifacts/studio-connections-layout.png" });
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await page.screenshot({ path: "artifacts/studio-dark-connections.png" });
  await page.getByLabel("Focus a content type").selectOption("product");
  await expect(
    page.locator('.react-flow__node[data-id="product"]'),
  ).toHaveClass(/node-focused/);
  await expect(async () =>
    expect(
      (await page
        .locator('.react-flow__node[data-id="product"]')
        .boundingBox())!.width,
    ).toBeGreaterThan(270),
  ).toPass();
  await expect(
    page.locator('.react-flow__node[data-id="product"]'),
  ).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: "artifacts/studio-dark-product-focus.png" });
  await page.getByTitle("Undo (⌘Z)").click();
  const afterUndo = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cmmf-studio")!),
  );
  expect(afterUndo.layout).toBe("grid");
  await page.getByTitle("Undo (⌘Z)").click();
  const restored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cmmf-studio")!),
  );
  expect(restored.positions).toEqual(original.positions);
});
test("import offers automatic layouts and preserves saved positions when chosen", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(page.getByLabel("Import layout")).toHaveValue("connections");
  await page.getByLabel("Import layout").selectOption("grid");
  await page.getByRole("button", { name: "Choose file" }).click();
  const data = {
    version: 1,
    name: "Import layout",
    models: [
      {
        id: "one",
        name: "One",
        kind: "entry",
        fields: [
          { id: "link", name: "Link", type: "reference", targets: ["two"] },
        ],
      },
      { id: "two", name: "Two", kind: "entry", fields: [] },
    ],
    positions: { one: { x: 10, y: 20 }, two: { x: 999, y: 888 } },
  };
  await page.locator("input[type=file]").setInputFiles({
    name: "workspace.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(page.getByLabel("Workspace name")).toHaveValue("Import layout");
  const grid = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cmmf-studio")!),
  );
  expect(grid.layout).toBe("grid");
  expect(grid.positions).not.toEqual(data.positions);
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await page.getByLabel("Import layout").selectOption("saved");
  await page.getByRole("button", { name: "Choose file" }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "workspace.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(async () => {
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cmmf-studio")!),
    );
    expect(saved.positions).toEqual(data.positions);
  }).toPass();
});
