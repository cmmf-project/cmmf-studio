import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const ecommerce = JSON.parse(
  readFileSync(
    new URL("../examples/ecommerce.cmmf.json", import.meta.url),
    "utf8",
  ),
);
const empty = {
  version: 1,
  name: "Empty workspace",
  models: [],
  positions: {},
};
const scenarios = [
  {
    name: "large saved model in light mode",
    saved: JSON.stringify(ecommerce),
    theme: "light",
    expectedName: ecommerce.name,
    models: 34,
  },
  {
    name: "large saved model in dark mode on mobile",
    saved: JSON.stringify(ecommerce),
    theme: "dark",
    expectedName: ecommerce.name,
    models: 34,
    mobile: true,
  },
  {
    name: "fresh session",
    saved: null,
    theme: "light",
    expectedName: "Customer stories",
    models: 3,
  },
  {
    name: "corrupt saved data",
    saved: "{invalid",
    theme: "light",
    expectedName: "Customer stories",
    models: 3,
  },
  {
    name: "unavailable storage",
    saved: null,
    theme: "dark",
    expectedName: "Customer stories",
    models: 3,
    blocked: true,
  },
  {
    name: "saved empty workspace",
    saved: JSON.stringify(empty),
    theme: "dark",
    expectedName: empty.name,
    models: 0,
  },
] as const;

for (const scenario of scenarios) {
  test(`full interface paints before workspace restoration: ${scenario.name}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if ("mobile" in scenario)
      await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      ({ saved, theme, blocked }) => {
        localStorage.setItem("cmmf-theme", theme);
        if (saved !== null) localStorage.setItem("cmmf-studio", saved);
        const read = Storage.prototype.getItem;
        const write = Storage.prototype.setItem;
        const trace = {
          paintedFrames: 0,
          reads: [] as unknown[],
          writes: [] as unknown[],
        };
        (window as any).startupTrace = trace;
        const recordFrame = () => {
          if (trace.reads.length) return;
          if (document.querySelector(".studio")) trace.paintedFrames++;
          requestAnimationFrame(recordFrame);
        };
        requestAnimationFrame(recordFrame);
        Storage.prototype.getItem = function (key) {
          if (key === "cmmf-studio") {
            const visible = (selector: string) => {
              const rect = document
                .querySelector(selector)
                ?.getBoundingClientRect();
              return !!rect?.width && !!rect.height;
            };
            trace.reads.push({
              paintedFrames: trace.paintedFrames,
              header: visible(".topbar"),
              sidebar: visible(".sidebar"),
              palette: visible(".palette"),
              canvas: visible(".react-flow"),
              tools: visible(".canvas-tools"),
              loader: visible(".loading-card"),
              theme: document.documentElement.dataset.theme,
              models: document.querySelectorAll(".react-flow__node").length,
              saved: read.call(this, key),
            });
            if (blocked)
              throw new DOMException("Storage blocked", "SecurityError");
          }
          return read.call(this, key);
        };
        Storage.prototype.setItem = function (key, value) {
          if (key === "cmmf-studio") {
            trace.writes.push(JSON.parse(value));
            if (blocked)
              throw new DOMException("Storage blocked", "SecurityError");
          }
          return write.call(this, key, value);
        };
      },
      {
        saved: scenario.saved,
        theme: scenario.theme,
        blocked: "blocked" in scenario,
      },
    );
    await page.goto("/");
    await expect(page.getByLabel("Workspace name")).toHaveValue(
      scenario.expectedName,
    );
    await expect(page.locator(".loading-overlay")).toHaveCount(0);
    await expect(page.locator(".react-flow__node")).toHaveCount(
      scenario.models,
    );
    const trace = await page.evaluate(() => (window as any).startupTrace);
    expect(trace.reads).toHaveLength(1);
    expect(trace.reads[0]).toMatchObject({
      header: true,
      sidebar: true,
      palette: true,
      canvas: true,
      tools: true,
      loader: true,
      theme: scenario.theme,
      models: 0,
      saved: scenario.saved,
    });
    expect(trace.reads[0].paintedFrames).toBeGreaterThan(0);
    if (scenario.name === "corrupt saved data") {
      expect(trace.writes).toEqual([]);
      await expect(
        page.getByRole("alert", {
          name: "Saved workspace could not be opened",
        }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => localStorage.getItem("cmmf-studio")),
      ).toBe(scenario.saved);
    } else expect(trace.writes.length).toBeGreaterThan(0);
    for (const saved of trace.writes) {
      expect(saved.name).toBe(scenario.expectedName);
      expect(saved.models).toHaveLength(scenario.models);
    }
    await expect(page.getByTitle("Undo (⌘Z)")).toBeDisabled();
    await expect(page.locator(".studio")).not.toHaveAttribute("inert");
    if ("blocked" in scenario) {
      await expect(
        page.getByText("Storage full · export a backup"),
      ).toBeVisible();
    }
    if (scenario.models === 34 && !("mobile" in scenario)) {
      const before = await page
        .locator('.react-flow__node[data-id="product"]')
        .boundingBox();
      const canvas = await page.locator(".canvas").boundingBox();
      expect(before!.x).toBeGreaterThanOrEqual(canvas!.x);
      expect(before!.x + before!.width).toBeLessThanOrEqual(
        canvas!.x + canvas!.width,
      );
      await page.getByLabel("Workspace name").fill("Edited workspace");
      await page.getByTitle("Undo (⌘Z)").click();
      await expect(page.getByLabel("Workspace name")).toHaveValue(
        scenario.expectedName,
      );
      await expect(page.getByTitle("Undo (⌘Z)")).toBeDisabled();
      await expect(page.locator(".react-flow__node")).toHaveCount(34);
    }
    expect(errors).toEqual([]);
  });
}
