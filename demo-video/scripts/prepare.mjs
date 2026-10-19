import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "../../node_modules/ajv/dist/ajv.js";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const source = JSON.parse(
  await fs.readFile(path.join(root, "../examples/ecommerce.cmmf.json"), "utf8"),
);
export const finalBoard = structuredClone(source);
finalBoard.name = "Ecommerce architecture";
finalBoard.models
  .find((m) => m.id === "product")
  .fields.find((f) => f.id === "variants").relation.minItems = 1;

const fields = {
  product: ["name", "slug", "summary", "categories", "variants"],
  "product-variant": ["sku", "barcode", "images", "weight", "is-master"],
  category: ["name", "slug", "description", "image", "sort-order"],
  "landing-page": ["name", "slug", "blocks"],
  hero: ["headline", "summary", "image", "theme"],
  "product-grid": ["heading", "products", "maximum-products"],
};
export function focused(
  ids = ["product", "product-variant", "category"],
  stage = "complete",
) {
  const models = finalBoard.models
    .filter((m) => ids.includes(m.id))
    .map((m) => {
      const next = structuredClone(m);
      next.fields = next.fields.filter((f) => fields[m.id]?.includes(f.id));
      for (const f of next.fields)
        if (f.targets) f.targets = f.targets.filter((id) => ids.includes(id));
      if (next.id === "product") {
        const v = next.fields.find((f) => f.id === "variants");
        const c = next.fields.find((f) => f.id === "categories");
        const n = next.fields.find((f) => f.id === "name");
        if (stage === "variants") {
          v.targets = [];
          v.list = false;
          v.required = false;
          delete v.relation;
        }
        if (stage === "variants" || stage === "categories") {
          c.targets = [];
          c.list = false;
          delete c.relation;
        }
        if (stage !== "complete") n.localisation = false;
      }
      return next;
    });
  const positions = {
    product: { x: 40, y: 100 },
    "product-variant": { x: 530, y: 100 },
    category: { x: 1020, y: 100 },
    "landing-page": { x: 40, y: 760 },
    hero: { x: 530, y: 760 },
    "product-grid": { x: 1020, y: 760 },
  };
  if (stage === "localisation") positions.category = { x: 530, y: 700 };
  if (stage === "categories") positions["product-variant"] = { x: 530, y: 700 };
  return {
    version: 1,
    name: "Ecommerce architecture",
    models,
    positions: Object.fromEntries(ids.map((id) => [id, positions[id]])),
  };
}

for (const dir of ["public/fonts", "public/recordings", "public/stills", "out"])
  await fs.mkdir(path.join(root, dir), { recursive: true });
for (const font of [
  "source-sans-3-latin-400-normal.woff2",
  "source-sans-3-latin-600-normal.woff2",
  "reem-kufi-latin-500-normal.woff2",
]) {
  await fs.copyFile(
    path.join(root, "../src/assets/brand/fonts", font),
    path.join(root, "public/fonts", font),
  );
}
await fs.copyFile(
  path.join(
    root,
    "../src/assets/brand/studio-header-horizontal-gradient-light.svg",
  ),
  path.join(root, "public/studio-logo.svg"),
);
const schema = JSON.parse(
  await fs.readFile(path.join(root, "../src/model.schema.json"), "utf8"),
);
const validate = new Ajv({ strict: false, allErrors: true }).compile(schema);
const ids = new Set(finalBoard.models.map((m) => m.id));
for (const model of finalBoard.models) {
  if (!validate(model))
    throw Error(`${model.id}: ${JSON.stringify(validate.errors)}`);
  for (const f of model.fields)
    for (const id of [
      ...(f.targets || []),
      ...(f.objectType ? [f.objectType] : []),
    ]) {
      if (!ids.has(id)) throw Error(`Missing target ${id}`);
    }
}
const finalPath = path.join(root, "public/final-workspace.cmmf.json");
if (
  !(await fs
    .access(finalPath)
    .then(() => true)
    .catch(() => false))
)
  await fs.writeFile(finalPath, JSON.stringify(finalBoard, null, 2));
await fs.writeFile(
  path.join(root, "public/focused-workspace.cmmf.json"),
  JSON.stringify(focused(), null, 2),
);
await fs.writeFile(
  path.join(root, "public/model-summary.json"),
  JSON.stringify(
    {
      models: finalBoard.models.length,
      fields: finalBoard.models.reduce((n, m) => n + m.fields.length, 0),
      source: "../examples/ecommerce.cmmf.json",
      refinement: "product / variants / relation.minItems = 1",
    },
    null,
    2,
  ),
);
console.log(
  `Prepared ${finalBoard.models.length} models / ${finalBoard.models.reduce((n, m) => n + m.fields.length, 0)} fields; explicit variant minimum = 1.`,
);
