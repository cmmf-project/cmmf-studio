import {
  Box,
  Cog,
  FileText,
  Layers,
  Puzzle,
  Tags,
  type LucideIcon,
} from "lucide-react";
import type { Model } from "./model";

// One icon per CMMF model kind, mirroring the field-type `glyphs` map in
// model.ts. Typed as a full Record, so adding a kind to the schema fails to
// compile until it is given an icon here.
export const kindIcons: Record<Model["kind"], LucideIcon> = {
  entry: FileText,
  component: Puzzle,
  object: Box,
  taxonomy: Tags,
  settings: Cog,
};

export function KindIcon({
  kind,
  size = 17,
}: {
  kind: Model["kind"];
  size?: number;
}) {
  // Defensive fallback for a kind that arrived without schema validation.
  const Icon = kindIcons[kind] ?? Layers;
  return <Icon size={size} aria-hidden="true" />;
}
