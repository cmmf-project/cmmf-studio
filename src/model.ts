import Ajv from "ajv";
import schema120 from "./model.schema.json";
import { validateBetaModel } from "./beta-validation";
import type { ValidationHint, DeclarationIssue } from "./validation-hints";
import {
  type CmmfVersion,
  defaultCmmfVersion,
  resolveCmmfVersion,
  betaCmmfVersion,
} from "./versions";
export type FieldType =
  | "string"
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "slug"
  | "enum"
  | "richText"
  | "asset"
  | "json"
  | "object"
  | "reference";
export const fieldTypes = schema120.definitions.field.properties.type
  .enum as FieldType[];
export const modelKinds = schema120.properties.kind.enum as Model["kind"][];
export type Field = {
  id: string;
  name?: string;
  type: FieldType;
  description?: string;
  required?: boolean;
  localisation?: boolean;
  list?: boolean;
  targets?: string[];
  objectType?: string;
  values?: string[];
  relation?: {
    ownership?: "linked" | "contained";
    ordered?: boolean;
    uniqueItems?: boolean;
    minItems?: number;
    maxItems?: number;
    cardinality?: "one" | "many";
  };
  editorial?: {
    helpText?: string;
    labelField?: string;
    preview?: { title?: string; description?: string; image?: string };
  };
  validations?: Record<string, unknown>;
  default?: unknown;
  richTextConfig?: {
    marks?: string[];
    blocks?: string[];
    embeds?: { kind: "asset" | "reference"; targets?: string[] }[];
  };
  translationHints?: Record<string, unknown>;
  [key: string]: unknown;
};
export type Model = {
  validationHints?: ValidationHint[];
  id: string;
  name: string;
  kind: "entry" | "component" | "object" | "taxonomy" | "settings";
  description?: string;
  fields: Field[];
  editorial?: {
    helpText?: string;
    labelField?: string;
    preview?: { title?: string; description?: string; image?: string };
  };
  tags?: string[];
  translationHints?: Record<string, unknown>;
  governance?: Record<string, unknown>;
  localisation?: boolean;
  singleton?: boolean;
  [key: string]: unknown;
};
export type Board = {
  cmmfVersion?: CmmfVersion;
  namespace?: string;
  layout?: "grid" | "connections";
  routes?: Record<
    string,
    { points: { x: number; y: number }[]; label?: { x: number; y: number } }
  >;
  version: 1;
  name: string;
  models: Model[];
  positions: Record<string, { x: number; y: number }>;
};
export const labels: Record<FieldType, string> = {
  string: "Short text",
  text: "Long text",
  richText: "Rich text",
  number: "Number",
  boolean: "Boolean",
  date: "Date",
  datetime: "Date & time",
  slug: "Slug",
  enum: "Options",
  asset: "Asset",
  json: "JSON",
  object: "Object",
  reference: "Reference",
};
export const glyphs: Record<FieldType, string> = {
  string: "Aa",
  text: "¶",
  richText: "≡",
  number: "#",
  boolean: "◐",
  date: "◷",
  datetime: "◷",
  slug: "/",
  enum: "☷",
  asset: "▧",
  json: "{}",
  object: "◇",
  reference: "↗",
};
export const isList = (f: Field) =>
  f.list ?? f.relation?.cardinality === "many";
export function cardinality(f: Field) {
  return `${f.relation?.minItems ?? f.validations?.minItems ?? (f.required ? 1 : 0)}..${isList(f) ? (f.relation?.maxItems ?? f.validations?.maxItems ?? "*") : 1}`;
}
export const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "untitled";
export function uniqueId(base: string, existing: string[]) {
  let id = slug(base),
    i = 2;
  while (existing.includes(id)) id = `${slug(base)}-${i++}`;
  return id;
}
const validateStable = new Ajv({ allErrors: true, strict: false }).compile(
  schema120,
);
export function declarationIssues(
  model: unknown,
  version: CmmfVersion,
): DeclarationIssue[] {
  if (version === betaCmmfVersion) return validateBetaModel(model);
  if (validateStable(model)) return [];
  return (validateStable.errors || []).map((error) => ({
    code: "schema",
    path: error.instancePath || "/",
    message: error.message || "Invalid declaration",
  }));
}
export function issues(
  models: Model[],
  cmmfVersion: CmmfVersion = defaultCmmfVersion,
): string[] {
  const out: string[] = [];
  const ids = models.map((m) => m.id);
  for (const m of models) {
    out.push(
      ...declarationIssues(m, cmmfVersion).map(
        (e) => `${m.name}: ${e.path} [${e.code}] ${e.message}`,
      ),
    );
    if (cmmfVersion !== betaCmmfVersion && m.validationHints !== undefined)
      out.push(
        `${m.name}: validationHints are preserved but require CMMF ${betaCmmfVersion}; stable 1.2.0 does not check or support them.`,
      );
    if (ids.filter((id) => id === m.id).length > 1)
      out.push(`${m.name}: duplicate model ID`);
    if (!m.name.trim()) out.push(`${m.id}: give the model a name`);
    const fields = m.fields.map((f) => f.id);
    for (const f of m.fields) {
      if (fields.filter((id) => id === f.id).length > 1)
        out.push(`${m.name}: duplicate field ID ${f.id}`);
      if (f.type === "reference" && !f.targets?.length)
        out.push(`${m.name} / ${f.name || f.id}: connect a target model`);
      if (f.type === "object" && !f.objectType)
        out.push(`${m.name} / ${f.name || f.id}: choose an object model`);
      if (f.type === "enum" && !f.values?.length)
        out.push(`${m.name} / ${f.name || f.id}: add at least one option`);
      for (const target of [
        ...(f.targets || []),
        ...(f.richTextConfig?.embeds?.flatMap((e) => e.targets || []) || []),
        ...(f.objectType ? [f.objectType] : []),
      ])
        if (!ids.includes(target))
          out.push(`${m.name} / ${f.id}: missing target ${target}`);
      const rules = [f.validations || {}, f.relation || {}];
      for (const rule of rules) {
        for (const [lo, hi] of [
          ["minLength", "maxLength"],
          ["min", "max"],
          ["minItems", "maxItems"],
        ]) {
          const low = rule[lo as keyof typeof rule],
            high = rule[hi as keyof typeof rule];
          if (typeof low === "number" && typeof high === "number" && low > high)
            out.push(`${m.name} / ${f.id}: ${lo} exceeds ${hi}`);
        }
        for (const key of ["minLength", "maxLength", "minItems", "maxItems"]) {
          const value = rule[key as keyof typeof rule];
          if (
            typeof value === "number" &&
            (!Number.isInteger(value) || value < 0)
          )
            out.push(
              `${m.name} / ${f.id}: ${key} must be a non-negative integer`,
            );
        }
      }
      if (f.type === "enum" && f.values?.some((v) => !v.trim()))
        out.push(`${m.name} / ${f.id}: options cannot be blank`);
      if (
        f.type === "enum" &&
        f.values &&
        new Set(f.values).size !== f.values.length
      )
        out.push(`${m.name} / ${f.id}: options must be unique`);
    }
  }
  return [...new Set(out)];
}
export function parseBoard(
  input: unknown,
  selectedVersion: CmmfVersion = defaultCmmfVersion,
): Board {
  if (!input || typeof input !== "object")
    throw Error("Choose a CMMF model or a Studio workspace.");
  const obj = input as Record<string, unknown>;
  const models = (obj.models || (obj.fields ? [obj] : null)) as Model[];
  if (!Array.isArray(models) || (!models.length && obj.version !== 1))
    throw Error("No models found in this file.");
  const declaredVersion =
    obj.cmmfVersion !== undefined ? obj.cmmfVersion : obj.specVersion;
  const cmmfVersion =
    declaredVersion === undefined
      ? selectedVersion
      : resolveCmmfVersion(declaredVersion);
  if (
    obj.cmmfVersion !== undefined &&
    obj.specVersion !== undefined &&
    resolveCmmfVersion(obj.specVersion) !== cmmfVersion
  )
    throw Error("Conflicting CMMF version declarations.");
  for (const m of models) {
    const errors = declarationIssues(m, cmmfVersion);
    if (errors.length)
      throw Error(
        `Invalid CMMF model ${m.id || ""}: ${errors[0].path} ${errors[0].message}`,
      );
  }
  if (new Set(models.map((m) => m.id)).size !== models.length)
    throw Error("Duplicate model IDs.");
  const positions: Board["positions"] = {};
  models.forEach((m, i) => {
    const p = (obj.positions as Board["positions"] | undefined)?.[m.id];
    positions[m.id] =
      p && Number.isFinite(p.x) && Number.isFinite(p.y)
        ? p
        : { x: (i % 3) * 420, y: Math.floor(i / 3) * 450 };
  });
  const routes: NonNullable<Board["routes"]> = {};
  if (obj.routes && typeof obj.routes === "object")
    for (const [id, route] of Object.entries(obj.routes)) {
      if (
        route &&
        Array.isArray(route.points) &&
        route.points.length >= 2 &&
        route.points.every(
          (p: { x: number; y: number }) =>
            p && Number.isFinite(p.x) && Number.isFinite(p.y),
        )
      )
        routes[id] = {
          points: route.points,
          label:
            route.label &&
            Number.isFinite(route.label.x) &&
            Number.isFinite(route.label.y)
              ? route.label
              : undefined,
        };
    }
  const result: Board = {
    version: 1,
    name: typeof obj.name === "string" ? obj.name : "Imported model",
    models,
    positions,
    ...(obj.layout === "grid" || obj.layout === "connections"
      ? { layout: obj.layout }
      : {}),
    ...(Object.keys(routes).length ? { routes } : {}),
  };
  if (declaredVersion !== undefined || cmmfVersion !== defaultCmmfVersion)
    result.cmmfVersion = cmmfVersion;
  if (typeof obj.namespace === "string") result.namespace = obj.namespace;
  return result;
}
export const example: Board = {
  version: 1,
  name: "Customer stories",
  positions: {
    "customer-story": { x: 60, y: 90 },
    organisation: { x: 510, y: 20 },
    person: { x: 510, y: 360 },
  },
  models: [
    {
      id: "customer-story",
      name: "Customer story",
      kind: "entry",
      description:
        "Evidence of the difference our work makes, told in our customer’s voice.",
      editorial: {
        labelField: "title",
        helpText:
          "Lead with the outcome. Make the story useful to someone facing the same challenge.",
      },
      fields: [
        { id: "title", name: "Title", type: "string", required: true },
        { id: "slug", name: "Slug", type: "slug", required: true },
        { id: "story", name: "Story", type: "richText" },
        { id: "cover", name: "Cover image", type: "asset" },
        {
          id: "customer",
          name: "Customer",
          type: "reference",
          required: true,
          targets: ["organisation"],
          list: false,
          relation: { ownership: "linked" },
        },
        {
          id: "contributors",
          name: "Contributors",
          type: "reference",
          targets: ["person"],
          list: true,
          relation: { ownership: "linked", ordered: true },
        },
      ],
    },
    {
      id: "organisation",
      name: "Organisation",
      kind: "entry",
      description: "The organisation behind a customer story.",
      fields: [
        { id: "name", name: "Name", type: "string", required: true },
        { id: "logo", name: "Logo", type: "asset" },
        {
          id: "industry",
          name: "Industry",
          type: "enum",
          values: ["Technology", "Retail", "Healthcare"],
        },
        { id: "website", name: "Website", type: "string" },
      ],
    },
    {
      id: "person",
      name: "Person",
      kind: "entry",
      description: "A person who can bring a story to life.",
      fields: [
        { id: "name", name: "Name", type: "string", required: true },
        { id: "role", name: "Role", type: "string" },
        { id: "portrait", name: "Portrait", type: "asset" },
      ],
    },
  ],
};
