import type { Field, FieldType } from "./model";
export const textTypes: FieldType[] = ["string", "text", "slug"];
export const validationKeys = [
  "minLength",
  "maxLength",
  "regex",
  "min",
  "max",
  "integerOnly",
  "minItems",
  "maxItems",
  "uniqueItems",
  "mimeTypes",
  "dimensions",
  "fileSize",
] as const;
export function supportedValidations(type: FieldType, list = false): string[] {
  return [
    ...(textTypes.includes(type) ? ["minLength", "maxLength", "regex"] : []),
    ...(type === "number" ? ["min", "max", "integerOnly"] : []),
    ...(type === "asset" ? ["mimeTypes", "dimensions", "fileSize"] : []),
    ...(list ? ["minItems", "maxItems", "uniqueItems"] : []),
  ];
}
export function changeFieldType(f: Field, type: FieldType): Field {
  const list = f.list ?? f.relation?.cardinality === "many";
  const validations = Object.fromEntries(
    Object.entries(f.validations || {}).filter(
      ([key]) =>
        !validationKeys.includes(key as (typeof validationKeys)[number]) ||
        supportedValidations(type, list).includes(key),
    ),
  );
  if (f.type === "reference" && type !== "reference" && list)
    for (const key of ["minItems", "maxItems", "uniqueItems"] as const)
      if (validations[key] === undefined && f.relation?.[key] !== undefined)
        validations[key] = f.relation[key];
  return {
    ...f,
    type,
    list,
    default: undefined,
    targets: type === "reference" ? [] : undefined,
    objectType: type === "object" ? "" : undefined,
    values: type === "enum" ? [] : undefined,
    richTextConfig: undefined,
    relation:
      type === "reference" && f.relation
        ? { ...f.relation, cardinality: undefined }
        : undefined,
    validations: Object.keys(validations).length ? validations : undefined,
  };
}
export const tokens = (value: string) =>
  value
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
export function updateReferenceConstraint(
  f: Field,
  key: "minItems" | "maxItems" | "uniqueItems",
  value: unknown,
): Partial<Field> {
  const validations = { ...f.validations };
  delete validations[key];
  return {
    relation: { ...f.relation, [key]: value },
    validations: Object.keys(validations).length ? validations : undefined,
  };
}
