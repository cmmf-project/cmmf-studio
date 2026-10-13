import type { ElkNode } from "elkjs/lib/elk-api";
import type { Board, Model, Field } from "./model";
export type LayoutMode = "grid" | "connections";
export type Point = { x: number; y: number };
export type Route = { points: Point[]; label?: Point };
export type Measurements = Record<string, { width: number; height: number }>;
export const modelSize = (m: Model, sizes: Measurements = {}) =>
  sizes[m.id] || { width: 310, height: 124 + m.fields.length * 43 };
export const targets = (f: Field) =>
  f.type === "reference"
    ? f.targets || []
    : f.type === "object" && f.objectType
      ? [f.objectType]
      : [];
export function links(models: Model[]) {
  const ids = new Set(models.map((m) => m.id));
  return models.flatMap((m) =>
    m.fields.flatMap((f, index) =>
      targets(f)
        .filter((id) => ids.has(id))
        .map((target) => ({
          id: `${m.id}/${f.id}/${target}`,
          source: m.id,
          target,
          field: f,
          index,
        })),
    ),
  );
}
export const topology = (models: Model[]) =>
  JSON.stringify(
    models.map((m) => [m.id, m.fields.map((f) => [f.id, f.type, targets(f)])]),
  );
function adjacent(models: Model[]) {
  const graph = new Map(models.map((m) => [m.id, new Set<string>()]));
  for (const e of links(models)) {
    if (e.source !== e.target) {
      graph.get(e.source)!.add(e.target);
      graph.get(e.target)!.add(e.source);
    }
  }
  return graph;
}
function grid(models: Model[], sizes: Measurements) {
  const graph = adjacent(models);
  const unseen = new Set([...graph.keys()].sort());
  const order: string[] = [];
  while (unseen.size) {
    const root = [...unseen].sort(
      (a, b) => graph.get(b)!.size - graph.get(a)!.size || a.localeCompare(b),
    )[0];
    const queue = [root];
    unseen.delete(root);
    while (queue.length) {
      const id = queue.shift()!;
      order.push(id);
      for (const next of [...graph.get(id)!].sort(
        (a, b) => graph.get(b)!.size - graph.get(a)!.size || a.localeCompare(b),
      ))
        if (unseen.delete(next)) queue.push(next);
    }
  }
  const columns = Math.max(1, Math.ceil(Math.sqrt(models.length)));
  const edges = links(models).filter((e) => e.source !== e.target);
  const map = new Map(models.map((m) => [m.id, m]));
  const pack = (list: string[]) => {
    const positions: Board["positions"] = {};
    let y = 40;
    for (let i = 0; i < list.length; i += columns) {
      const row = list.slice(i, i + columns);
      let x = 40;
      for (const id of row) {
        positions[id] = { x, y };
        x += modelSize(map.get(id)!, sizes).width + 120;
      }
      y +=
        Math.max(...row.map((id) => modelSize(map.get(id)!, sizes).height)) +
        110;
    }
    return positions;
  };
  const cost = (list: string[]) => {
    const positions = pack(list);
    return edges.reduce((sum, e) => {
      const a = positions[e.source],
        b = positions[e.target];
      return sum + Math.hypot(a.x - b.x, a.y - b.y);
    }, 0);
  };
  // Deterministic local improvement keeps directly linked types closer on the grid.
  let score = cost(order);
  for (let pass = 0; pass < (models.length > 100 ? 0 : 8); pass++) {
    let improved = false;
    for (let i = 0; i < order.length; i++)
      for (let j = i + 1; j < order.length; j++) {
        [order[i], order[j]] = [order[j], order[i]];
        const next = cost(order);
        if (next < score) {
          score = next;
          improved = true;
        } else [order[i], order[j]] = [order[j], order[i]];
      }
    if (!improved) break;
  }
  return pack(order);
}
export async function autoLayout(
  board: Board,
  mode: LayoutMode,
  sizes: Measurements = {},
): Promise<Board> {
  if (!board.models.length)
    return { ...board, positions: {}, layout: mode, routes: undefined };
  if (mode === "grid")
    return {
      ...board,
      positions: grid(board.models, sizes),
      layout: mode,
      routes: undefined,
    };
  const { default: ELK } = await import("elkjs/lib/elk.bundled.js");
  const elk = new ELK();
  const edges = links(board.models);
  const graph = await elk.layout<ElkNode>({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "100",
      "elk.layered.spacing.nodeNodeBetweenLayers": "260",
      "elk.spacing.edgeNode": "35",
      "elk.spacing.edgeEdge": "24",
      "elk.layered.spacing.edgeEdgeBetweenLayers": "24",
      "elk.spacing.componentComponent": "160",
      "elk.padding": "[top=50,left=50,bottom=50,right=50]",
      "elk.randomSeed": "1",
    },
    children: board.models.map((m) => {
      const size = modelSize(m, sizes);
      return {
        id: m.id,
        ...size,
        layoutOptions: { "elk.portConstraints": "FIXED_POS" },
        ports: [
          {
            id: `${m.id}:target`,
            x: 0,
            y: 35,
            width: 0,
            height: 0,
            layoutOptions: { "elk.port.side": "WEST" },
          },
          ...m.fields.flatMap((f, index) =>
            targets(f).length
              ? [
                  {
                    id: `${m.id}:${f.id}`,
                    x: size.width,
                    y: 97 + index * 43,
                    width: 0,
                    height: 0,
                    layoutOptions: { "elk.port.side": "EAST" },
                  },
                ]
              : [],
          ),
        ],
      };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [`${e.source}:${e.field.id}`],
      targets: [`${e.target}:target`],
      labels: [
        {
          text: e.field.name || e.field.id,
          width: Math.max(80, (e.field.name || e.field.id).length * 7 + 60),
          height: 24,
        },
      ],
    })),
  });
  const positions = Object.fromEntries(
    (graph.children || []).map((n) => [n.id, { x: n.x || 0, y: n.y || 0 }]),
  );
  const routes: Record<string, Route> = {};
  for (const e of graph.edges || []) {
    const section = e.sections?.[0];
    if (section)
      routes[e.id] = {
        points: [
          section.startPoint,
          ...(section.bendPoints || []),
          section.endPoint,
        ],
        label:
          e.labels?.[0]?.x !== undefined
            ? {
                x: e.labels[0].x + e.labels[0].width! / 2,
                y: e.labels[0].y! + 12,
              }
            : undefined,
      };
  }
  return { ...board, positions, layout: mode, routes };
}
export function overlaps(
  a: Point,
  as: { width: number; height: number },
  b: Point,
  bs: { width: number; height: number },
  gap = 36,
) {
  return (
    a.x < b.x + bs.width + gap &&
    a.x + as.width + gap > b.x &&
    a.y < b.y + bs.height + gap &&
    a.y + as.height + gap > b.y
  );
}
export function openPosition(
  board: Board,
  preferred: Point,
  size = { width: 310, height: 124 },
  sizes: Measurements = {},
): Point {
  const free = (p: Point) =>
    board.models.every(
      (m) =>
        !overlaps(
          p,
          size,
          board.positions[m.id] || { x: 0, y: 0 },
          modelSize(m, sizes),
        ),
    );
  if (free(preferred)) return preferred;
  // Search the nearest available perimeter, with enough spacing for an empty type.
  for (let ring = 1; ring <= 100; ring++) {
    const candidates: Point[] = [];
    for (let x = -ring; x <= ring; x++)
      for (const y of [-ring, ring])
        candidates.push({ x: preferred.x + x * 90, y: preferred.y + y * 70 });
    for (let y = -ring + 1; y < ring; y++)
      for (const x of [-ring, ring])
        candidates.push({ x: preferred.x + x * 90, y: preferred.y + y * 70 });
    candidates.sort(
      (a, b) =>
        Math.hypot(a.x - preferred.x, a.y - preferred.y) -
        Math.hypot(b.x - preferred.x, b.y - preferred.y),
    );
    const found = candidates.find(free);
    if (found) return found;
  }
  return {
    x:
      Math.max(
        ...board.models.map(
          (m) => (board.positions[m.id]?.x || 0) + modelSize(m, sizes).width,
        ),
      ) + 100,
    y: preferred.y,
  };
}
