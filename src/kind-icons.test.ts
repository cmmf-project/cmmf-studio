import { describe, it, expect } from "vitest";
import { kindIcons } from "./kind-icons";
import { modelKinds } from "./model";

describe("content type icons", () => {
  it("gives every model kind its own distinct icon", () => {
    expect(Object.keys(kindIcons).sort()).toEqual([...modelKinds].sort());
    expect(new Set(Object.values(kindIcons)).size).toBe(modelKinds.length);
  });
});
