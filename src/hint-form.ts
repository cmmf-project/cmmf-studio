import {
  hintActions,
  hintOperators,
  type ValidationHint,
} from "./validation-hints";

// UI shape guards only. These deliberately allow incomplete drafts (blank text,
// empty groups/actions); validateBetaModel remains the declaration authority.
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const only = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).every((key) => keys.includes(key));
const scalar = (value: unknown) =>
  value === null || ["string", "number", "boolean"].includes(typeof value);
function condition(value: unknown): boolean {
  if (!object(value)) return false;
  for (const key of ["allOf", "anyOf"]) {
    if (key in value)
      return (
        only(value, [key]) &&
        Array.isArray(value[key]) &&
        value[key].every(condition)
      );
  }
  if ("not" in value) return only(value, ["not"]) && condition(value.not);
  const keys = Object.keys(value).filter((key) => key !== "field");
  if (
    typeof value.field !== "string" ||
    keys.length !== 1 ||
    !(hintOperators as readonly string[]).includes(keys[0])
  )
    return false;
  const op = keys[0],
    operand = value[op];
  if (op === "isEmpty" || op === "isNotEmpty") return operand === true;
  if (op === "in" || op === "notIn")
    return Array.isArray(operand) && operand.every(scalar);
  if (op === "matches") return typeof operand === "string";
  if (["gt", "gte", "lt", "lte"].includes(op))
    return typeof operand === "number";
  return scalar(operand);
}
export function canUseHintForm(value: unknown): value is ValidationHint {
  if (
    !object(value) ||
    !only(value, [
      "id",
      "description",
      "severity",
      "when",
      "then",
      "expression",
    ])
  )
    return false;
  if (typeof value.id !== "string" || typeof value.description !== "string")
    return false;
  if (
    value.severity !== undefined &&
    !["error", "warning", "info"].includes(String(value.severity))
  )
    return false;
  if (
    value.when !== undefined &&
    (!condition(value.when) || value.then === undefined)
  )
    return false;
  if (
    value.then !== undefined &&
    (!object(value.then) ||
      !only(value.then, hintActions) ||
      !Object.values(value.then).every(
        (ids) =>
          Array.isArray(ids) && ids.every((id) => typeof id === "string"),
      ))
  )
    return false;
  if (value.expression !== undefined) {
    if (
      value.when !== undefined ||
      value.then !== undefined ||
      !object(value.expression)
    )
      return false;
    if (
      !only(value.expression, ["dialect", "rule"]) ||
      typeof value.expression.dialect !== "string" ||
      !Object.hasOwn(value.expression, "rule")
    )
      return false;
  }
  return true;
}
