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
});
