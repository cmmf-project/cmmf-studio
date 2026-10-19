import type { Model } from "./model";
import { uniqueId } from "./model";
import { ValueEditor } from "./config-controls";
import { validateBetaModel } from "./beta-validation";
import { canUseHintForm } from "./hint-form";
import {
  hintActions,
  hintOperators,
  type Condition,
  type HintActions,
  type HintOperator,
  type Predicate,
  type Scalar,
  type ValidationHint,
  type JsonValue,
} from "./validation-hints";

const actionLabels = {
  require: "Require every field",
  forbid: "Keep every field empty",
  atLeastOneOf: "At least one field",
  atMostOneOf: "At most one field",
  exactlyOneOf: "Exactly one field",
};
const operatorLabels: Record<HintOperator, string> = {
  equals: "Equals",
  notEquals: "Does not equal",
  in: "Is in a set",
  notIn: "Is not in a set",
  isEmpty: "Is empty",
  isNotEmpty: "Is not empty",
  matches: "Matches a pattern",
  gt: "Greater than",
  gte: "Greater than or equal",
  lt: "Less than",
  lte: "Less than or equal",
};
const numericOperators = new Set(["gt", "gte", "lt", "lte"]);
const defaultScalar = (field?: Model["fields"][number]): Scalar =>
  field?.type === "number" ? 0 : field?.type === "boolean" ? false : "";
const predicate = (model: Model): Predicate => ({
  field: model.fields[0]?.id || "",
  isNotEmpty: true,
});

function ScalarControl({
  value,
  change,
  label,
  numeric = false,
}: {
  value: Scalar;
  change: (value: Scalar) => void;
  label: string;
  numeric?: boolean;
}) {
  const kind = value === null ? "null" : typeof value;
  return (
    <div className="hint-scalar">
      {!numeric && (
        <label>
          Value type
          <select
            aria-label={`${label} type`}
            value={kind}
            onChange={(e) =>
              change(
                (
                  {
                    string: "",
                    number: 0,
                    boolean: false,
                    null: null,
                  } as Record<string, Scalar>
                )[e.target.value],
              )
            }
          >
            <option value="string">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="null">Null</option>
          </select>
        </label>
      )}
      {kind !== "null" && (
        <label>
          {label}
          {kind === "boolean" ? (
            <select
              aria-label={label}
              value={String(value)}
              onChange={(e) => change(e.target.value === "true")}
            >
              <option value="false">False</option>
              <option value="true">True</option>
            </select>
          ) : (
            <input
              aria-label={label}
              type={numeric || kind === "number" ? "number" : "text"}
              step="any"
              value={String(value)}
              onChange={(e) =>
                change(
                  numeric || kind === "number"
                    ? Number(e.target.value)
                    : e.target.value,
                )
              }
            />
          )}
        </label>
      )}
    </div>
  );
}
function ConditionControl({
  value,
  change,
  model,
  label = "Condition",
}: {
  value: Condition;
  change: (value: Condition) => void;
  model: Model;
  label?: string;
}) {
  const kind =
    "allOf" in value
      ? "allOf"
      : "anyOf" in value
        ? "anyOf"
        : "not" in value
          ? "not"
          : "predicate";
  const leaf = kind === "predicate" ? (value as Predicate) : undefined;
  const operator: HintOperator = leaf
    ? (Object.keys(leaf).find((key) => key !== "field") as HintOperator)
    : "isNotEmpty";
  const children =
    "allOf" in value ? value.allOf : "anyOf" in value ? value.anyOf : [];
  const changeChildren = (children: Condition[]) =>
    change(kind === "allOf" ? { allOf: children } : { anyOf: children });
  return (
    <fieldset className="hint-condition">
      <legend>{label}</legend>
      <label>
        Condition form
        <select
          aria-label={`${label} form`}
          value={kind}
          onChange={(e) => {
            const child = predicate(model);
            change(
              e.target.value === "predicate"
                ? child
                : e.target.value === "not"
                  ? { not: child }
                  : e.target.value === "allOf"
                    ? { allOf: [child] }
                    : { anyOf: [child] },
            );
          }}
        >
          <option value="predicate">Field condition</option>
          <option value="allOf">All conditions</option>
          <option value="anyOf">Any condition</option>
          <option value="not">Not</option>
        </select>
      </label>
      {leaf && (
        <>
          <label>
            Field
            <select
              aria-label={`${label} field`}
              value={leaf.field}
              onChange={(e) => change({ ...leaf, field: e.target.value })}
            >
              {!model.fields.some((f) => f.id === leaf.field) && (
                <option value={leaf.field}>
                  {leaf.field
                    ? `Missing field: ${leaf.field}`
                    : "Choose a field"}
                </option>
              )}
              {model.fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name || f.id} ({f.id})
                </option>
              ))}
            </select>
          </label>
          <label>
            Operator
            <select
              aria-label={`${label} operator`}
              value={operator}
              onChange={(e) => {
                const op = e.target.value as HintOperator;
                const scalar = defaultScalar(
                  model.fields.find((f) => f.id === leaf.field),
                );
                const operand =
                  op === "isEmpty" || op === "isNotEmpty"
                    ? true
                    : op === "matches"
                      ? ""
                      : numericOperators.has(op)
                        ? 0
                        : op === "in" || op === "notIn"
                          ? [scalar]
                          : scalar;
                change({ field: leaf.field, [op]: operand });
              }}
            >
              {hintOperators.map((op) => (
                <option key={op} value={op}>
                  {operatorLabels[op]}
                </option>
              ))}
            </select>
          </label>
          {operator === "matches" ? (
            <label>
              Pattern
              <input
                aria-label={`${label} pattern`}
                value={leaf.matches as string}
                onChange={(e) => change({ ...leaf, matches: e.target.value })}
              />
              <small>
                ECMAScript pattern without delimiters or flags; anchor it for a
                full match.
              </small>
            </label>
          ) : operator === "isEmpty" || operator === "isNotEmpty" ? (
            <p className="hint">
              Empty means absent, null, an empty string, or an empty list.
              False, 0, whitespace, and objects are non-empty.
            </p>
          ) : operator === "in" || operator === "notIn" ? (
            <div>
              {(leaf[operator] as Scalar[]).map((item, index, values) => (
                <div className="hint-set-item" key={index}>
                  <ScalarControl
                    label={`${label} set value ${index + 1}`}
                    value={item}
                    change={(next) =>
                      change({
                        ...leaf,
                        [operator]: values.map((v, i) =>
                          i === index ? next : v,
                        ),
                      })
                    }
                  />
                  <button
                    className="plain-button"
                    onClick={() =>
                      change({
                        ...leaf,
                        [operator]: values.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remove value {index + 1}
                  </button>
                </div>
              ))}
              <button
                className="plain-button"
                onClick={() =>
                  change({
                    ...leaf,
                    [operator]: [
                      ...(leaf[operator] as Scalar[]),
                      defaultScalar(
                        model.fields.find((f) => f.id === leaf.field),
                      ),
                    ],
                  })
                }
              >
                Add set value
              </button>
            </div>
          ) : (
            <ScalarControl
              label={`${label} value`}
              value={leaf[operator] as Scalar}
              numeric={numericOperators.has(operator)}
              change={(next) => change({ ...leaf, [operator]: next })}
            />
          )}
          <p className="hint">
            Comparisons use singular scalar fields with no type coercion. An
            absent field makes comparisons false, including negative
            comparisons. Use an emptiness test for lists and absence.
          </p>
        </>
      )}
      {"not" in value && (
        <ConditionControl
          label={`${label} negated`}
          model={model}
          value={value.not}
          change={(not) => change({ not })}
        />
      )}
      {(kind === "allOf" || kind === "anyOf") && (
        <>
          {children.map((child, index) => (
            <div key={index}>
              <ConditionControl
                label={`${label} ${index + 1}`}
                model={model}
                value={child}
                change={(next) =>
                  changeChildren(
                    children.map((v, i) => (i === index ? next : v)),
                  )
                }
              />
              <button
                className="plain-button"
                onClick={() =>
                  changeChildren(children.filter((_, i) => i !== index))
                }
              >
                Remove condition {index + 1}
              </button>
            </div>
          ))}
          <button
            className="plain-button"
            onClick={() => changeChildren([...children, predicate(model)])}
          >
            Add condition
          </button>
        </>
      )}
    </fieldset>
  );
}
function ActionControl({
  value,
  change,
  model,
}: {
  value: HintActions;
  change: (value: HintActions) => void;
  model: Model;
}) {
  return (
    <fieldset className="hint-actions">
      <legend>Then</legend>
      {hintActions.map((action) => {
        const ids = value[action];
        const choices = [
          ...model.fields.map((f) => f.id),
          ...(ids || []).filter((id) => !model.fields.some((f) => f.id === id)),
        ];
        return (
          <div className="hint-action" key={action}>
            <label className="toggle">
              <input
                type="checkbox"
                checked={!!ids}
                onChange={(e) => {
                  const next = { ...value };
                  if (e.target.checked)
                    next[action] = model.fields[0] ? [model.fields[0].id] : [];
                  else delete next[action];
                  change(next);
                }}
              />
              {actionLabels[action]}
            </label>
            {ids && (
              <div className="hint-field-choices">
                {choices.map((id) => (
                  <label className="toggle" key={id}>
                    <input
                      type="checkbox"
                      checked={ids.includes(id)}
                      onChange={(e) =>
                        change({
                          ...value,
                          [action]: e.target.checked
                            ? [...ids, id]
                            : ids.filter((v) => v !== id),
                        })
                      }
                    />
                    {model.fields.find((f) => f.id === id)?.name || id}
                    <small>{id}</small>
                  </label>
                ))}
                {!choices.length && (
                  <p className="hint">
                    Add a field to this content type first.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
      <p className="hint">
        All enabled actions apply together. “Keep empty” expresses intent; it
        never deletes content. Field-level rules still apply.
      </p>
    </fieldset>
  );
}
export function ValidationHints({
  model,
  enabled,
  change,
}: {
  model: Model;
  enabled: boolean;
  change: (hints: ValidationHint[] | undefined) => void;
}) {
  const hints = Array.isArray(model.validationHints)
    ? model.validationHints
    : [];
  const problems = enabled
    ? validateBetaModel(model).filter((e) =>
        e.path.startsWith("/validationHints"),
      )
    : [];
  const patch = (index: number, next: ValidationHint) =>
    change(hints.map((hint, i) => (i === index ? next : hint)));
  if (!enabled)
    return (
      <section className="validation-hints">
        <p className="hint">
          These hints are preserved, but stable CMMF 1.2.0 does not support or
          check them. Select CMMF 1.3.0-beta.1 in the version selector to edit
          and check their declarations.
        </p>
        <pre className="hint-preserved">
          {JSON.stringify(model.validationHints, null, 2)}
        </pre>
      </section>
    );
  if (
    model.validationHints !== undefined &&
    !Array.isArray(model.validationHints)
  )
    return (
      <section className="validation-hints">
        <p className="hint">
          This preserved hint collection is malformed. Repair its JSON structure
          or remove it; it has not been converted or discarded.
        </p>
        <ValueEditor
          label="Preserved hint collection"
          value={model.validationHints}
          onChange={(value) => change(value as ValidationHint[])}
        />
        <button className="plain-button" onClick={() => change(undefined)}>
          Remove invalid hint collection
        </button>
      </section>
    );
  const add = (kind: "structured" | "expression" | "prose") => {
    const hint: ValidationHint = {
      id: uniqueId(
        "hint",
        hints.map((h) => h.id),
      ),
      description: "",
    };
    if (kind === "structured")
      hint.then = { require: model.fields[0] ? [model.fields[0].id] : [] };
    if (kind === "expression") hint.expression = { dialect: "", rule: null };
    change([...hints, hint]);
  };
  return (
    <section className="validation-hints">
      <p className="hint">
        CMMF 1.3.0-beta.1 · Document-level intent. Studio checks declarations
        and field references, not content. Expressions are preserved without
        execution.
      </p>
      {!hints.length && (
        <p className="hint">
          No hints yet. Describe a dependency between fields, preserve an
          expression, or record a manual check.
        </p>
      )}
      {hints.map((hint, index) => {
        if (!canUseHintForm(hint))
          return (
            <article
              className="validation-hint"
              key={index}
              aria-label={`Validation hint ${index + 1}`}
            >
              <div className="hint-heading">
                <strong>Hint {index + 1} needs repair</strong>
                <button
                  className="plain-button"
                  aria-label={`Remove hint ${index + 1}`}
                  onClick={() => {
                    const next = hints.filter((_, i) => i !== index);
                    change(next.length ? next : undefined);
                  }}
                >
                  Remove
                </button>
              </div>
              <p className="hint">
                The preserved declaration cannot use the guided form yet. Repair
                its JSON structure here; every value remains intact until you
                edit or remove it.
              </p>
              <ValueEditor
                label={`Hint ${index + 1} declaration`}
                value={hint}
                onChange={(value) => patch(index, value as ValidationHint)}
              />
              <ul
                className="hint-diagnostics"
                aria-label={`Hint ${index + 1} declaration issues`}
              >
                {problems
                  .filter((e) => e.path.startsWith(`/validationHints/${index}`))
                  .map((e, i) => (
                    <li key={i}>
                      {e.path}: {e.message}
                    </li>
                  ))}
              </ul>
            </article>
          );
        const kind = hint.expression
          ? "expression"
          : hint.then
            ? "structured"
            : "prose";
        return (
          <article
            className="validation-hint"
            key={index}
            aria-label={`Validation hint ${index + 1}`}
          >
            <div className="hint-heading">
              <strong>Hint {index + 1}</strong>
              <button
                className="plain-button"
                aria-label={`Remove hint ${index + 1}`}
                onClick={() => {
                  const next = hints.filter((_, i) => i !== index);
                  change(next.length ? next : undefined);
                }}
              >
                Remove
              </button>
            </div>
            <label>
              Hint ID
              <input
                aria-label={`Hint ${index + 1} ID`}
                value={hint.id}
                onChange={(e) => patch(index, { ...hint, id: e.target.value })}
              />
              <small>
                Stable within this model; changing the description keeps this
                ID.
              </small>
            </label>
            <label>
              Description
              <textarea
                aria-label={`Hint ${index + 1} description`}
                rows={3}
                value={hint.description}
                onChange={(e) =>
                  patch(index, { ...hint, description: e.target.value })
                }
              />
            </label>
            <label>
              Severity
              <select
                aria-label={`Hint ${index + 1} severity`}
                value={hint.severity || "default"}
                onChange={(e) =>
                  patch(index, {
                    ...hint,
                    severity:
                      e.target.value === "default"
                        ? undefined
                        : (e.target.value as ValidationHint["severity"]),
                  })
                }
              >
                <option value="default">Error (default)</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <small>
                Intended severity if content violates the hint. Malformed
                declarations are always errors.
              </small>
            </label>
            <label>
              Representation
              <select
                aria-label={`Hint ${index + 1} representation`}
                value={kind}
                onChange={(e) => {
                  const {
                    when: _when,
                    then: _then,
                    expression: _expression,
                    ...base
                  } = hint;
                  patch(
                    index,
                    e.target.value === "structured"
                      ? {
                          ...base,
                          then: {
                            require: model.fields[0]
                              ? [model.fields[0].id]
                              : [],
                          },
                        }
                      : e.target.value === "expression"
                        ? { ...base, expression: { dialect: "", rule: null } }
                        : base,
                  );
                }}
              >
                <option value="structured">Structured</option>
                <option value="expression">Expression</option>
                <option value="prose">Prose</option>
              </select>
              <small>
                Changing representation replaces its condition/actions or
                expression. Undo restores it.
              </small>
            </label>
            {kind === "structured" && (
              <>
                <label className="toggle">
                  <input
                    aria-label={`Hint ${index + 1} conditional`}
                    type="checkbox"
                    checked={!!hint.when}
                    onChange={(e) =>
                      patch(index, {
                        ...hint,
                        when: e.target.checked ? predicate(model) : undefined,
                      })
                    }
                  />
                  Apply only when a condition holds
                </label>
                {hint.when && (
                  <ConditionControl
                    value={hint.when}
                    model={model}
                    change={(when) => patch(index, { ...hint, when })}
                  />
                )}
                <ActionControl
                  value={hint.then!}
                  model={model}
                  change={(then) => patch(index, { ...hint, then })}
                />
              </>
            )}
            {kind === "expression" && (
              <>
                <label>
                  Dialect
                  <input
                    aria-label={`Hint ${index + 1} dialect`}
                    placeholder="Name the existing expression language"
                    value={hint.expression!.dialect}
                    onChange={(e) =>
                      patch(index, {
                        ...hint,
                        expression: {
                          ...hint.expression!,
                          dialect: e.target.value,
                        },
                      })
                    }
                  />
                </label>
                <ValueEditor
                  label={`Hint ${index + 1} expression rule`}
                  value={hint.expression!.rule}
                  onChange={(rule) =>
                    patch(index, {
                      ...hint,
                      expression: {
                        ...hint.expression!,
                        rule: rule as JsonValue,
                      },
                    })
                  }
                />
                <p className="hint">
                  Non-portable, best-effort assertion for this document. Unknown
                  dialects remain intact; Studio does not execute or validate
                  the dialect-specific rule.
                </p>
              </>
            )}
            {kind === "prose" && (
              <p className="hint">
                A manual or editorial check. Its ID, description, and severity
                travel with the model.
              </p>
            )}
            {problems.filter(
              (e) =>
                e.path === `/validationHints/${index}` ||
                e.path.startsWith(`/validationHints/${index}/`),
            ).length > 0 && (
              <ul
                className="hint-diagnostics"
                aria-label={`Hint ${index + 1} declaration issues`}
              >
                {problems
                  .filter(
                    (e) =>
                      e.path === `/validationHints/${index}` ||
                      e.path.startsWith(`/validationHints/${index}/`),
                  )
                  .map((e, i) => (
                    <li key={i}>
                      {e.path}: {e.message}
                    </li>
                  ))}
              </ul>
            )}
          </article>
        );
      })}
      <div className="hint-add-actions">
        <button className="plain-button" onClick={() => add("structured")}>
          Add structured hint
        </button>
        <button className="plain-button" onClick={() => add("expression")}>
          Add expression hint
        </button>
        <button className="plain-button" onClick={() => add("prose")}>
          Add prose hint
        </button>
      </div>
      <p className="hint">
        Hints use fields from this model only. Nested paths, list-element
        checks, cross-document queries, and field-to-field comparisons are
        outside the structured vocabulary.
      </p>
    </section>
  );
}
