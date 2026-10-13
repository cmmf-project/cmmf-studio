import { describe, it, expect } from "vitest";
import {
  autoLayout,
  links,
  modelSize,
  openPosition,
  overlaps,
  topology,
} from "./layout";
import { ecommerce } from "./ecommerce";
import { example, parseBoard, type Board } from "./model";
function noOverlap(board: Board) {
  for (const a of board.models)
    for (const b of board.models) {
      if (a.id === b.id) continue;
      expect(
        overlaps(
          board.positions[a.id],
          modelSize(a),
          board.positions[b.id],
          modelSize(b),
          0,
        ),
        `${a.id} overlaps ${b.id}`,
      ).toBe(false);
    }
}
describe("relationship-aware layouts", () => {
  it.each(["grid", "connections"] as const)(
    "keeps every model and relationship with no overlaps in %s",
    async (mode) => {
      const input = structuredClone(ecommerce);
      const result = await autoLayout(input, mode);
      expect(result.models).toEqual(input.models);
      expect(links(result.models)).toEqual(links(input.models));
      expect(Object.keys(result.positions)).toHaveLength(34);
      noOverlap(result);
      expect(result.layout).toBe(mode);
      if (mode === "connections") {
        expect(Object.keys(result.routes!)).toHaveLength(
          links(result.models).length,
        );
        expect(parseBoard(JSON.parse(JSON.stringify(result)))).toEqual(result);
      }
    },
  );
  it("is deterministic for the same grid and graph input", async () => {
    for (const mode of ["grid", "connections"] as const) {
      const a = await autoLayout(example, mode);
      const b = await autoLayout(example, mode);
      expect(b).toEqual(a);
    }
  });
  it("puts linked models together despite unrelated input ordering", async () => {
    const board: Board = {
      version: 1,
      name: "Groups",
      positions: {},
      models: [
        {
          id: "a",
          name: "A",
          kind: "entry",
          fields: [{ id: "link", type: "reference", targets: ["b"] }],
        },
        { id: "isolated", name: "Isolated", kind: "entry", fields: [] },
        { id: "b", name: "B", kind: "entry", fields: [] },
      ],
    };
    const result = await autoLayout(board, "grid");
    const distance = (a: string, b: string) =>
      Math.hypot(
        result.positions[a].x - result.positions[b].x,
        result.positions[a].y - result.positions[b].y,
      );
    expect(distance("a", "b")).toBeLessThan(distance("a", "isolated"));
  });
  it("handles empty boards, isolated nodes, self references and cycles", async () => {
    expect(
      (
        await autoLayout(
          { version: 1, name: "Empty", models: [], positions: {} },
          "connections",
        )
      ).positions,
    ).toEqual({});
    const models = structuredClone(example.models);
    models[1].fields.push({
      id: "back",
      type: "reference",
      targets: ["customer-story", "organisation"],
    });
    const result = await autoLayout({ ...example, models }, "connections");
    noOverlap(result);
    expect(Object.keys(result.routes!)).toHaveLength(4);
  });
  it("finds open placement around a crowded preferred position using measured sizes", () => {
    const measured = { "customer-story": { width: 500, height: 1000 } };
    const p = openPosition(example, { x: 80, y: 100 }, undefined, measured);
    for (const m of example.models)
      expect(
        overlaps(
          p,
          { width: 310, height: 124 },
          example.positions[m.id],
          modelSize(m, measured),
        ),
      ).toBe(false);
    expect(openPosition(example, { x: 2000, y: 2000 })).toEqual({
      x: 2000,
      y: 2000,
    });
  });
  it("invalidates topology only for structural edits, not labels or descriptions", () => {
    const models = structuredClone(example.models);
    models[0].name = "Renamed";
    expect(topology(models)).toBe(topology(example.models));
    models[0].fields.reverse();
    expect(topology(models)).not.toBe(topology(example.models));
  });
});

it("routes connection lines around unrelated model containers", async () => {
  const board = await autoLayout(ecommerce, "connections");
  const allLinks = links(board.models);
  for (const edge of allLinks) {
    const route = board.routes![edge.id];
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1],
        b = route.points[i];
      for (const m of board.models) {
        if (m.id === edge.source || m.id === edge.target) continue;
        const p = board.positions[m.id],
          size = modelSize(m);
        const crosses =
          a.x === b.x
            ? a.x > p.x &&
              a.x < p.x + size.width &&
              Math.max(a.y, b.y) > p.y &&
              Math.min(a.y, b.y) < p.y + size.height
            : a.y === b.y
              ? a.y > p.y &&
                a.y < p.y + size.height &&
                Math.max(a.x, b.x) > p.x &&
                Math.min(a.x, b.x) < p.x + size.width
              : false;
        expect(crosses, `${edge.id} crosses ${m.id}`).toBe(false);
      }
    }
  }
});
