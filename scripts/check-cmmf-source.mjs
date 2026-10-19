import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../vendor/cmmf/1.3.0-beta.1/", import.meta.url);
const source = JSON.parse(await readFile(new URL("source.json", root), "utf8"));
for (const [name, expected] of Object.entries(source.sha256)) {
  const actual = createHash("sha256")
    .update(await readFile(new URL(name, root)))
    .digest("hex");
  if (actual !== expected) throw Error(`Pinned CMMF source changed: ${name}`);
}
const schema = JSON.parse(
  await readFile(new URL("schemas/model.schema.json", root), "utf8"),
);
const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
if (
  schema.title !== `CMMF ${source.specVersion} Model Schema` ||
  pkg.version !== source.specVersion
)
  throw Error("Pinned CMMF versions disagree");
console.log(
  `Verified ${Object.keys(source.sha256).length} pinned files: CMMF ${source.specVersion} at ${source.commit}`,
);
