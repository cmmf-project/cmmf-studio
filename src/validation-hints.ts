// Declaration vocabulary from CMMF v1.3.0-beta.1, section 12.
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type Scalar = null | boolean | number | string;
export const hintOperators = [
  "equals",
  "notEquals",
  "in",
  "notIn",
  "isEmpty",
  "isNotEmpty",
  "matches",
  "gt",
  "gte",
  "lt",
  "lte",
] as const;
export type HintOperator = (typeof hintOperators)[number];
export type Predicate = { field: string } & Partial<
  Record<HintOperator, Scalar | Scalar[]>
>;
export type Condition =
  | Predicate
  | { allOf: Condition[] }
  | { anyOf: Condition[] }
  | { not: Condition };
export const hintActions = [
  "require",
  "forbid",
  "atLeastOneOf",
  "atMostOneOf",
  "exactlyOneOf",
] as const;
export type HintAction = (typeof hintActions)[number];
export type HintActions = Partial<Record<HintAction, string[]>>;
export type ValidationHint = {
  id: string;
  description: string;
  severity?: "error" | "warning" | "info";
  when?: Condition;
  then?: HintActions;
  expression?: { dialect: string; rule: JsonValue };
};
export type DeclarationIssue = { code: string; path: string; message: string };
