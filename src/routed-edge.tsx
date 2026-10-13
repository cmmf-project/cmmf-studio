import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import type { Route } from "./layout";
export type ConnectionEdge = Edge<{
  route: Route;
  muted: boolean;
  emphasis: boolean;
  open: () => void;
}>;
export function RoutedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  label,
  data,
}: EdgeProps<ConnectionEdge>) {
  const points = data!.route.points.map((p) => ({ ...p }));
  points[0] = { x: sourceX, y: sourceY };
  points[points.length - 1] = { x: targetX, y: targetY };
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i],
      next = points[i + 1],
      previous = points[i - 1];
    if (!next) {
      path += ` L ${p.x} ${p.y}`;
      continue;
    }
    const distance = Math.min(
      10,
      Math.hypot(p.x - previous.x, p.y - previous.y) / 2,
      Math.hypot(next.x - p.x, next.y - p.y) / 2,
    );
    const aLen = Math.hypot(p.x - previous.x, p.y - previous.y) || 1,
      bLen = Math.hypot(next.x - p.x, next.y - p.y) || 1;
    const a = {
        x: p.x + ((previous.x - p.x) * distance) / aLen,
        y: p.y + ((previous.y - p.y) * distance) / aLen,
      },
      b = {
        x: p.x + ((next.x - p.x) * distance) / bLen,
        y: p.y + ((next.y - p.y) * distance) / bLen,
      };
    path += ` L ${a.x} ${a.y} Q ${p.x} ${p.y} ${b.x} ${b.y}`;
  }
  const location = data!.route.label || points[Math.floor(points.length / 2)];
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <button
          className={`connection-label nodrag nopan ${data!.muted ? "muted" : ""} ${data!.emphasis ? "emphasis" : ""}`}
          style={{
            transform: `translate(-50%, -50%) translate(${location.x}px,${location.y}px)`,
          }}
          onClick={data!.open}
        >
          {label}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
