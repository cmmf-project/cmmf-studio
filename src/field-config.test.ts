import { describe, it, expect } from "vitest";
import {
  changeFieldType,
  supportedValidations,
  updateReferenceConstraint,
} from "./field-config";
import { ecommerce } from "./ecommerce";
import {
  fieldTypes,
  modelKinds,
  labels,
  issues,
  parseBoard,
  cardinality,
  type Field,
} from "./model";
import schema from "./model.schema.json";
describe("CMMF configuration coverage", () => {
  it("covers every canonical field and model kind, with readable labels", () => {
    expect(fieldTypes).toEqual(schema.definitions.field.properties.type.enum);
    expect(modelKinds).toEqual(schema.properties.kind.enum);
    expect(Object.keys(labels).sort()).toEqual([...fieldTypes].sort());
  });
  it("offers validation controls appropriate to field categories and lists", () => {
    expect(supportedValidations("string")).toEqual([
      "minLength",
      "maxLength",
      "regex",
    ]);
    expect(supportedValidations("number")).toEqual([
      "min",
      "max",
      "integerOnly",
    ]);
    expect(supportedValidations("boolean")).toEqual([]);
    expect(supportedValidations("asset")).toEqual([
      "mimeTypes",
      "dimensions",
      "fileSize",
    ]);
    expect(supportedValidations("object", true)).toEqual([
      "minItems",
      "maxItems",
      "uniqueItems",
    ]);
  });
  it("removes obsolete type configuration but preserves shared and unknown metadata", () => {
    const field: Field = {
      id: "field",
      type: "richText",
      default: { blocks: [] },
      required: true,
      richTextConfig: { marks: ["bold"] },
      validations: { maxLength: 20, customRule: "keep" },
      translationHints: { preferredRepresentation: "embedded" },
    };
    const result = changeFieldType(field, "number");
    expect(result.richTextConfig).toBeUndefined();
    expect(result.default).toBeUndefined();
    expect(result.validations).toEqual({ customRule: "keep" });
    expect(result.translationHints).toEqual(field.translationHints);
    expect(result.required).toBe(true);
  });
  it("preserves legacy repeatability when changing field types", () => {
    const f: Field = {
      id: "links",
      type: "reference",
      targets: ["product"],
      relation: {
        cardinality: "many",
        minItems: 1,
        maxItems: 4,
        uniqueItems: true,
      },
    };
    const result = changeFieldType(f, "string");
    expect(result.list).toBe(true);
    expect(result.relation).toBeUndefined();
    expect(result.validations).toEqual({
      minItems: 1,
      maxItems: 4,
      uniqueItems: true,
    });
  });
  it("normalises edited reference bounds without two conflicting sources", () => {
    const f: Field = {
      id: "links",
      type: "reference",
      list: true,
      targets: ["product"],
      validations: { minItems: 2, maxItems: 5, custom: "keep" },
    };
    expect(cardinality(f)).toBe("2..5");
    const patch = updateReferenceConstraint(f, "minItems", 3);
    expect(patch.validations).toEqual({ maxItems: 5, custom: "keep" });
    expect(cardinality({ ...f, ...patch })).toBe("3..5");
  });
  it("ships a substantial valid model with every field type and kind", () => {
    expect(ecommerce.models).toHaveLength(34);
    expect(ecommerce.models.flatMap((m) => m.fields)).toHaveLength(201);
    expect(issues(ecommerce.models)).toEqual([]);
    expect(
      new Set(ecommerce.models.flatMap((m) => m.fields.map((f) => f.type))),
    ).toEqual(new Set(fieldTypes));
    expect(new Set(ecommerce.models.map((m) => m.kind))).toEqual(
      new Set(modelKinds),
    );
    expect(parseBoard(JSON.parse(JSON.stringify(ecommerce)))).toEqual(
      ecommerce,
    );
  });
  it("positions the large model without overlapping containers", () => {
    for (const a of ecommerce.models)
      for (const b of ecommerce.models) {
        if (a.id === b.id) continue;
        const x = ecommerce.positions[a.id],
          y = ecommerce.positions[b.id];
        const overlap =
          x.x < y.x + 310 &&
          x.x + 310 > y.x &&
          x.y < y.y + 120 + b.fields.length * 43 &&
          x.y + 120 + a.fields.length * 43 > y.y;
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
      }
  });
  it("detects broken rich text embeds and contradictory text/list rules", () => {
    const m = structuredClone(
      ecommerce.models.find((m) => m.id === "product")!,
    );
    m.fields.find((f) => f.type === "richText")!.richTextConfig = {
      embeds: [{ kind: "reference", targets: ["missing"] }],
    };
    m.fields[0].validations = { minLength: 20, maxLength: 10, minItems: -2 };
    const errors = issues([
      m,
      ...ecommerce.models.filter((m) => m.id !== "product"),
    ]);
    expect(errors.some((e) => e.includes("missing target missing"))).toBe(true);
    expect(errors.some((e) => e.includes("minLength exceeds maxLength"))).toBe(
      true,
    );
    expect(errors.some((e) => e.includes("non-negative integer"))).toBe(true);
  });
});
