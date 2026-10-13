import { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import type { Field, Model } from "./model";
import { isList } from "./model";
import { textTypes, tokens, supportedValidations } from "./field-config";
export function TokenInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[] | undefined;
  onChange: (v: string[] | undefined) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(value?.join(", ") || "");
  const focused = useRef(false);
  const serial = value?.join(", ") || "";
  useEffect(() => {
    if (!focused.current) setText(serial);
  }, [serial]);
  return (
    <label>
      {label}
      <input
        placeholder={placeholder}
        value={text}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          setText(serial);
        }}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.trim() ? tokens(e.target.value) : undefined);
        }}
      />
    </label>
  );
}
export function ValueEditor({
  value,
  onChange,
  label,
  objectOnly = false,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  label: string;
  objectOnly?: boolean;
}) {
  const [newKey, setNewKey] = useState("");
  const kind =
    value === null
      ? "null"
      : Array.isArray(value)
        ? "array"
        : typeof value === "object"
          ? "object"
          : typeof value;
  return (
    <div className="value-editor">
      <div className="value-kind">
        <span>{label}</span>
        <select
          aria-label={`${label} value type`}
          value={kind}
          onChange={(e) =>
            onChange(
              (
                {
                  string: "",
                  number: 0,
                  boolean: false,
                  object: {},
                  array: [],
                  null: null,
                } as Record<string, unknown>
              )[e.target.value],
            )
          }
        >
          {(objectOnly
            ? ["object"]
            : ["string", "number", "boolean", "object", "array", "null"]
          ).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      {kind === "string" && (
        <input
          aria-label={label}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {kind === "number" && (
        <input
          aria-label={label}
          type="number"
          step="any"
          value={value as number}
          onChange={(e) =>
            onChange(e.target.value === "" ? 0 : Number(e.target.value))
          }
        />
      )}
      {kind === "boolean" && (
        <select
          aria-label={label}
          value={String(value)}
          onChange={(e) => onChange(e.target.value === "true")}
        >
          <option value="false">False</option>
          <option value="true">True</option>
        </select>
      )}
      {(kind === "object" || kind === "array") && (
        <div className="value-children">
          {Object.entries(value as object).map(([key, v]) => (
            <div className="value-child" key={key}>
              <ValueEditor
                label={
                  kind === "array" ? `${label} item ${Number(key) + 1}` : key
                }
                value={v}
                onChange={(next) => {
                  if (Array.isArray(value)) {
                    const copy = [...value];
                    copy[Number(key)] = next;
                    onChange(copy);
                  } else onChange({ ...(value as object), [key]: next });
                }}
              />
              <button
                className="icon-button"
                aria-label={`Remove ${key}`}
                onClick={() => {
                  if (Array.isArray(value))
                    onChange(value.filter((_, i) => i !== Number(key)));
                  else {
                    const copy = { ...(value as Record<string, unknown>) };
                    delete copy[key];
                    onChange(copy);
                  }
                }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {kind === "array" ? (
            <button
              className="plain-button"
              onClick={() => onChange([...(value as unknown[]), ""])}
            >
              <Plus size={13} />
              Add item
            </button>
          ) : (
            <div className="add-property">
              <input
                aria-label={`New ${label} property`}
                placeholder="Property name"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <button
                className="icon-button"
                aria-label={`Add ${label} property`}
                disabled={
                  !newKey.trim() ||
                  Object.hasOwn(value as object, newKey.trim())
                }
                onClick={() => {
                  onChange({ ...(value as object), [newKey.trim()]: "" });
                  setNewKey("");
                }}
              >
                <Plus size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function Numeric({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: unknown;
  onChange: (v: number | undefined) => void;
  min?: number;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        step="any"
        min={min}
        value={typeof value === "number" ? value : ""}
        placeholder="No limit"
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : Number(e.target.value))
        }
      />
    </label>
  );
}
export function FieldRules({
  f,
  models,
  patch,
}: {
  f: Field;
  models: Model[];
  patch: (v: Partial<Field>) => void;
}) {
  const v = f.validations || {};
  const set = (key: string, value: unknown) => {
    const next = { ...v };
    if (value === undefined) delete next[key];
    else next[key] = value;
    patch({ validations: Object.keys(next).length ? next : undefined });
  };
  const rich = f.richTextConfig || {};
  function richPatch(change: Partial<NonNullable<Field["richTextConfig"]>>) {
    const next = { ...rich, ...change };
    for (const k of Object.keys(next))
      if (next[k as keyof typeof next] === undefined)
        delete next[k as keyof typeof next];
    patch({ richTextConfig: Object.keys(next).length ? next : undefined });
  }
  const advanced = Object.fromEntries(
    Object.entries(v).filter(
      ([key]) => !supportedValidations(f.type, isList(f)).includes(key),
    ),
  );
  return (
    <>
      {textTypes.includes(f.type) && (
        <fieldset>
          <legend>Text constraints</legend>
          <div className="two-cols">
            <Numeric
              label="Minimum characters"
              min={0}
              value={v.minLength}
              onChange={(n) => set("minLength", n)}
            />
            <Numeric
              label="Maximum characters"
              min={0}
              value={v.maxLength}
              onChange={(n) => set("maxLength", n)}
            />
          </div>
          <label>
            Pattern (regular expression)
            <input
              placeholder="e.g. ^[a-z0-9-]+$"
              value={typeof v.regex === "string" ? v.regex : ""}
              onChange={(e) => set("regex", e.target.value || undefined)}
            />
          </label>
        </fieldset>
      )}
      {f.type === "number" && (
        <fieldset>
          <legend>Number constraints</legend>
          <div className="two-cols">
            <Numeric
              label="Minimum value"
              value={v.min}
              onChange={(n) => set("min", n)}
            />
            <Numeric
              label="Maximum value"
              value={v.max}
              onChange={(n) => set("max", n)}
            />
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={!!v.integerOnly}
              onChange={(e) => set("integerOnly", e.target.checked)}
            />
            Whole numbers only
          </label>
        </fieldset>
      )}
      {isList(f) && f.type !== "reference" && (
        <fieldset>
          <legend>List constraints</legend>
          <div className="two-cols">
            <Numeric
              label="Minimum items"
              min={0}
              value={v.minItems}
              onChange={(n) => set("minItems", n)}
            />
            <Numeric
              label="Maximum items"
              min={0}
              value={v.maxItems}
              onChange={(n) => set("maxItems", n)}
            />
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={!!v.uniqueItems}
              onChange={(e) => set("uniqueItems", e.target.checked)}
            />
            Unique list values
          </label>
        </fieldset>
      )}
      {f.type === "asset" && (
        <fieldset>
          <legend>Asset constraints</legend>
          <TokenInput
            label="Allowed MIME types"
            placeholder="image/jpeg, image/png"
            value={
              Array.isArray(v.mimeTypes) ? (v.mimeTypes as string[]) : undefined
            }
            onChange={(types) => set("mimeTypes", types)}
          />
          <Numeric
            label="File size limit"
            min={0}
            value={v.fileSize}
            onChange={(n) => set("fileSize", n)}
          />
          <p className="hint">
            CMMF leaves file-size units and dimension keys to your translator.
            Agree those conventions before setting limits.
          </p>
          <label className="toggle">
            <input
              type="checkbox"
              checked={v.dimensions !== undefined}
              onChange={(e) =>
                set("dimensions", e.target.checked ? {} : undefined)
              }
            />
            Set image dimensions
          </label>
          {v.dimensions !== undefined && (
            <ValueEditor
              label="Dimensions"
              value={v.dimensions}
              onChange={(value) => set("dimensions", value)}
            />
          )}
        </fieldset>
      )}
      {f.type === "richText" && (
        <fieldset>
          <legend>Rich-text capabilities</legend>
          <p className="hint">
            Leave a capability blank to use translator defaults. Tokens are
            translator-recognised names, not a fixed CMMF list.
          </p>
          <TokenInput
            label="Allowed marks"
            placeholder="bold, italic, link"
            value={rich.marks}
            onChange={(marks) => richPatch({ marks })}
          />
          <TokenInput
            label="Allowed blocks"
            placeholder="paragraph, heading-1, quote"
            value={rich.blocks}
            onChange={(blocks) => richPatch({ blocks })}
          />
          <label className="toggle">
            <input
              type="checkbox"
              checked={!!rich.embeds?.some((e) => e.kind === "asset")}
              onChange={(e) => {
                const embeds = (rich.embeds || []).filter(
                  (e) => e.kind !== "asset",
                );
                if (e.target.checked) embeds.push({ kind: "asset" });
                richPatch({ embeds: embeds.length ? embeds : undefined });
              }}
            />
            Allow asset embeds
          </label>
          <label>
            Reference embed targets
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                const targets =
                  rich.embeds
                    ?.filter((e) => e.kind === "reference")
                    .flatMap((e) => e.targets || []) || [];
                const embeds = (rich.embeds || []).filter(
                  (e) => e.kind !== "reference",
                );
                embeds.push({
                  kind: "reference",
                  targets: [...new Set([...targets, e.target.value])],
                });
                richPatch({ embeds });
              }}
            >
              <option value="">Add a model…</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <div className="target-chips">
            {rich.embeds
              ?.filter((e) => e.kind === "reference")
              .flatMap((e) => e.targets || [])
              .map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    const embeds = rich
                      .embeds!.map((e) =>
                        e.kind === "reference"
                          ? {
                              ...e,
                              targets: e.targets?.filter((t) => t !== id),
                            }
                          : e,
                      )
                      .filter(
                        (e) => e.kind !== "reference" || e.targets?.length,
                      );
                    richPatch({ embeds: embeds.length ? embeds : undefined });
                  }}
                >
                  {models.find((m) => m.id === id)?.name || id}
                  <X size={12} />
                </button>
              ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend>Default value</legend>
        <label className="toggle">
          <input
            type="checkbox"
            checked={f.default !== undefined}
            onChange={(e) =>
              patch({
                default: e.target.checked
                  ? isList(f)
                    ? []
                    : f.type === "number"
                      ? 0
                      : f.type === "boolean"
                        ? false
                        : f.type === "object" || f.type === "json"
                          ? {}
                          : f.type === "enum"
                            ? f.values?.[0] || ""
                            : ""
                  : undefined,
              })
            }
          />
          Set a default
        </label>
        {f.default !== undefined &&
          (isList(f) ||
          ["object", "json", "asset", "reference", "richText"].includes(
            f.type,
          ) ? (
            <ValueEditor
              label="Default"
              value={f.default}
              onChange={(value) => patch({ default: value })}
            />
          ) : f.type === "boolean" ? (
            <label>
              Default
              <select
                value={String(f.default)}
                onChange={(e) => patch({ default: e.target.value === "true" })}
              >
                <option value="false">False</option>
                <option value="true">True</option>
              </select>
            </label>
          ) : f.type === "enum" ? (
            <label>
              Default
              <select
                value={String(f.default)}
                onChange={(e) => patch({ default: e.target.value })}
              >
                <option value="">Choose an option</option>
                {f.values?.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Default
              <input
                type={
                  f.type === "number"
                    ? "number"
                    : f.type === "date"
                      ? "date"
                      : "text"
                }
                step="any"
                value={String(f.default)}
                onChange={(e) =>
                  patch({
                    default:
                      f.type === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
              />
            </label>
          ))}
      </fieldset>
      {[
        "boolean",
        "date",
        "datetime",
        "enum",
        "json",
        "object",
        "reference",
        "richText",
      ].includes(f.type) &&
        !isList(f) && (
          <p className="hint">
            CMMF 1.2.0 defines no additional scalar validation controls for this
            type. Requiredness, localisation and defaults still apply.
          </p>
        )}
      {Object.keys(advanced).length > 0 && (
        <details className="advanced">
          <summary>
            Other imported validation rules ({Object.keys(advanced).length})
          </summary>
          <p className="hint">
            Preserved from your file. These may need a translator-specific
            interpretation.
          </p>
          <ValueEditor
            label="Other validations"
            objectOnly
            value={advanced}
            onChange={(next) => {
              const known = Object.fromEntries(
                Object.entries(v).filter(([key]) =>
                  supportedValidations(f.type, isList(f)).includes(key),
                ),
              );
              patch({ validations: { ...known, ...(next as object) } });
            }}
          />
        </details>
      )}
    </>
  );
}
