import Ajv, { type ValidateFunction } from "ajv";
import schema from "../vendor/cmmf/1.3.0-beta.1/schemas/model.schema.json";
import type { Model } from "./model";
import type {
  Condition,
  DeclarationIssue,
  HintOperator,
  Scalar,
} from "./validation-hints";

// Browser adaptation of the pinned release's scripts/validate-models.mjs.
// Keep declaration semantics aligned with its regression fixtures. No content,
// expression, or pattern is evaluated; RegExp construction checks syntax only.
let validateShape: ValidateFunction | undefined;
const textTypes = new Set(["string", "text", "slug", "enum"]);
const scalarTypes = new Set([
  ...textTypes,
  "number",
  "boolean",
  "date",
  "datetime",
]);
const numericOperators = new Set(["gt", "gte", "lt", "lte"]);
export function validateBetaModel(input: unknown): DeclarationIssue[] {
  // Stable startup does not pay for compilation of the optional beta schema.
  validateShape ||= new Ajv({ allErrors: true, strict: false }).compile(schema);
  if (!validateShape(input)) {
    return (validateShape.errors || []).map((error) => ({
      code: "schema",
      path: error.instancePath || "/",
      message: error.message || "Invalid declaration",
    }));
  }
  const model = input as Model;
  const errors: DeclarationIssue[] = [];
  const report = (code: string, path: string, message: string) => {
    errors.push({ code, path, message });
  };
  const fields = new Map<string, Model["fields"][number]>();
  model.fields.forEach((field, index) => {
    if (fields.has(field.id))
      report(
        "duplicate-field-id",
        `/fields/${index}/id`,
        `Duplicate field ID: ${field.id}`,
      );
    fields.set(field.id, field);
  });
  const hintIds = new Set<string>();
  const findField = (id: string, path: string) => {
    if (!fields.has(id))
      report(
        "unknown-field",
        path,
        `No field with ID ${id} in model ${model.id}`,
      );
    return fields.get(id);
  };
  function condition(node: Condition, path: string): void {
    if ("allOf" in node) {
      node.allOf.forEach((child, index) =>
        condition(child, `${path}/allOf/${index}`),
      );
      return;
    }
    if ("anyOf" in node) {
      node.anyOf.forEach((child, index) =>
        condition(child, `${path}/anyOf/${index}`),
      );
      return;
    }
    if ("not" in node) return condition(node.not, `${path}/not`);
    const field = findField(node.field, `${path}/field`);
    if (!field) return;
    const operator = Object.keys(node).find(
      (key) => key !== "field",
    ) as HintOperator;
    if (operator === "isEmpty" || operator === "isNotEmpty") return;
    const repeatable =
      field.list === true ||
      (field.type === "reference" && field.relation?.cardinality === "many");
    const allowedTypes = numericOperators.has(operator)
      ? new Set(["number"])
      : operator === "matches"
        ? textTypes
        : scalarTypes;
    if (repeatable || !allowedTypes.has(field.type)) {
      report(
        "operator-type",
        path,
        `${operator} is not supported for ${repeatable ? "repeatable " : ""}${field.type} field ${field.id}`,
      );
      return;
    }
    if (operator === "matches") {
      try {
        new RegExp(node.matches as string);
      } catch {
        report(
          "invalid-pattern",
          `${path}/matches`,
          "Expected an ECMAScript regular expression without delimiters or flags",
        );
      }
      return;
    }
    const expected =
      field.type === "number"
        ? "number"
        : field.type === "boolean"
          ? "boolean"
          : "string";
    const values =
      operator === "in" || operator === "notIn"
        ? (node[operator] as Scalar[])
        : [node[operator]];
    for (const value of values) {
      if (value !== null && typeof value !== expected)
        report(
          "operand-type",
          `${path}/${operator}`,
          `Expected ${expected} or null for ${field.id}; no type coercion is allowed`,
        );
    }
  }
  (model.validationHints || []).forEach((hint, index) => {
    const path = `/validationHints/${index}`;
    if (hintIds.has(hint.id))
      report(
        "duplicate-hint-id",
        `${path}/id`,
        `Duplicate hint ID: ${hint.id}`,
      );
    hintIds.add(hint.id);
    if (hint.when) condition(hint.when, `${path}/when`);
    for (const [action, ids] of Object.entries(hint.then || {}))
      ids.forEach((id, item) =>
        findField(id, `${path}/then/${action}/${item}`),
      );
  });
  return errors;
}
