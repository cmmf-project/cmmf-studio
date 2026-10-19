import { describe, it, expect } from "vitest";
import { example, issues, parseBoard, uniqueId } from "./model";

describe("CMMF model boundary", () => {
  it("round trips an empty Studio workspace", () => {
    const empty = {
      version: 1 as const,
      name: "Empty",
      models: [],
      positions: {},
    };
    expect(parseBoard(empty)).toEqual(empty);
  });
  it("exports a valid example", () =>
    expect(issues(example.models)).toEqual([]));
  it("round trips a workspace with metadata and layout", () =>
    expect(parseBoard(JSON.parse(JSON.stringify(example)))).toEqual(example));
  it("imports a single CMMF model and gives it a position", () => {
    const result = parseBoard(example.models[1]);
    expect(result.models).toEqual([example.models[1]]);
    expect(result.positions.organisation).toEqual({ x: 0, y: 0 });
  });
  it("rejects malformed models before replacing the board", () =>
    expect(() =>
      parseBoard({
        models: [
          {
            id: "bad",
            name: "Bad",
            kind: "entry",
            fields: [{ id: "broken", type: "not-a-type" }],
          },
        ],
      }),
    ).toThrow());
  it("finds dangling and unconnected references", () => {
    const b = structuredClone(example);
    b.models[0].fields[4].targets = ["missing"];
    b.models[0].fields[5].targets = [];
    expect(issues(b.models).some((x) => x.includes("missing target"))).toBe(
      true,
    );
    expect(issues(b.models).some((x) => x.includes("connect a target"))).toBe(
      true,
    );
  });
  it("flags contradictory repeatability and invalid bounds", () => {
    const b = structuredClone(example);
    b.models[0].fields[4].relation = {
      cardinality: "many",
      minItems: 5,
      maxItems: 2,
    };
    expect(issues(b.models).length).toBeGreaterThan(1);
  });
  it("preserves advanced metadata during import", () => {
    const m = {
      ...example.models[1],
      translationHints: { sanity: { type: "document" } },
      governance: { owner: "Content team" },
    };
    expect(parseBoard(m).models[0]).toEqual(m);
  });
  it("generates safe distinct IDs", () =>
    expect(uniqueId("Content Type", ["content-type", "content-type-2"])).toBe(
      "content-type-3",
    ));
  it("defaults to the stable CMMF version", () => {
    expect(parseBoard(example.models[1]).cmmfVersion).toBeUndefined();
    expect(issues(example.models)).toEqual([]);
  });
  it("reads and validates a beta workspace version", () => {
    const workspace = {
      version: 1,
      cmmfVersion: "1.3.0-beta.1",
      name: "Beta workspace",
      models: [
        {
          ...example.models[1],
          validationHints: [
            {
              id: "test-hint",
              description: "Test hint",
              then: { atLeastOneOf: ["name"] },
            },
          ],
        },
      ],
      positions: {},
    };
    const result = parseBoard(workspace);
    expect(result.cmmfVersion).toBe("1.3.0-beta.1");
    expect(issues(result.models, "1.3.0-beta.1")).toEqual([]);
  });
  it("preserves validation hints under the stable schema", () => {
    const m = {
      ...example.models[1],
      validationHints: [{ description: "Stable ignores this" }],
    };
    const result = parseBoard({
      version: 1,
      cmmfVersion: "1.2.0",
      name: "Stable workspace",
      models: [m],
      positions: {},
    });
    expect(result.models[0].validationHints).toEqual([
      { description: "Stable ignores this" },
    ]);
    expect(issues(result.models, "1.2.0").join(" ")).toContain(
      "require CMMF 1.3.0-beta.1",
    );
  });
});

it("pins the experimental shorthand and keeps explicit stable versions", () => {
  expect(
    parseBoard({ ...example, cmmfVersion: "1.3.0-beta" }).cmmfVersion,
  ).toBe("1.3.0-beta.1");
  expect(parseBoard({ ...example, cmmfVersion: "1.2.0" }).cmmfVersion).toBe(
    "1.2.0",
  );
});
it.each(["1.3", "1.3.0", "1.3.0-beta.2", 1, null])(
  "rejects unsupported explicit version %s",
  (version) => {
    expect(() => parseBoard({ ...example, cmmfVersion: version })).toThrow(
      /Unsupported CMMF version/,
    );
    expect(() => parseBoard({ ...example, specVersion: version })).toThrow(
      /Unsupported CMMF version/,
    );
  },
);
it("rejects conflicting version declarations", () => {
  expect(() =>
    parseBoard({
      ...example,
      specVersion: "1.2.0",
      cmmfVersion: "1.3.0-beta.1",
    }),
  ).toThrow(/Conflicting/);
});
it("does not infer a beta from permissive stable-schema acceptance", () => {
  const model = {
    ...example.models[1],
    validationHints: [{ id: "manual", description: "Review manually" }],
  };
  const stable = parseBoard(model);
  expect(stable.cmmfVersion).toBeUndefined();
  expect(issues(stable.models).join(" ")).toContain("require CMMF");
  const beta = parseBoard(model, "1.3.0-beta.1");
  expect(beta.cmmfVersion).toBe("1.3.0-beta.1");
  expect(issues(beta.models, beta.cmmfVersion)).toEqual([]);
});
it("preserves namespace, exact version, unknown dialect JSON, severity omission, and model metadata", () => {
  const model = {
    ...example.models[1],
    validationHints: [
      {
        id: "expression",
        description: "Unknown vendor assertion",
        expression: {
          dialect: "vendor-rules-v2",
          rule: { nested: [false, 0, null, "", [], {}, " "] },
        },
      },
    ],
    customMetadata: { keep: true },
  };
  const board = {
    ...example,
    cmmfVersion: "1.3.0-beta.1",
    namespace: "test.beta",
    models: [model],
  };
  const parsed = parseBoard(JSON.parse(JSON.stringify(board)));
  expect(parsed.models).toEqual(board.models);
  expect(parsed.namespace).toBe("test.beta");
  expect(parsed.models[0].validationHints?.[0]).not.toHaveProperty("severity");
});
it("rejects malformed and semantically invalid beta hints before importing", () => {
  for (const hint of [
    {
      id: "missing",
      description: "Missing field",
      then: { require: ["no-field"] },
    },
    {
      id: "prose",
      description: "Invalid trigger",
      when: { field: "name", isEmpty: true },
    },
    { id: "empty", description: " " },
  ])
    expect(() =>
      parseBoard({
        ...example,
        cmmfVersion: "1.3.0-beta.1",
        models: [{ ...example.models[1], validationHints: [hint] }],
      }),
    ).toThrow(/Invalid CMMF model/);
});
