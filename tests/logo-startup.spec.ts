import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const ecommerce = JSON.parse(
  readFileSync(
    new URL("../examples/ecommerce.cmmf.json", import.meta.url),
    "utf8",
  ),
);

for (const theme of ["light", "dark"] as const) {
  for (const width of [1440, 1000, 700, 390]) {
    test(`header logo precedes model loading and keeps its position: ${theme} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      // Deliberately oppose the saved preference to catch use of system theme.
      await page.emulateMedia({
        colorScheme: theme === "dark" ? "light" : "dark",
      });
      await page.addInitScript(
        ({ theme, ecommerce }) => {
          localStorage.setItem("cmmf-theme", theme);
          localStorage.setItem("cmmf-studio", JSON.stringify(ecommerce));
        },
        { theme, ecommerce },
      );
      let releaseApp!: () => void;
      const appGate = new Promise<void>((resolve) => {
        releaseApp = resolve;
      });
      await page.route("**/*", async (route) => {
        if (route.request().resourceType() === "script") await appGate;
        await route.continue();
      });
      let before: {
        x: number;
        y: number;
        width: number;
        height: number;
      } | null = null;
      let source = "";
      try {
        await page.goto("/", { waitUntil: "commit" });
        const logo = page.locator(`.startup-logo-${theme} img`);
        await expect(logo).toBeVisible();
        await expect
          .poll(() =>
            logo.evaluate(
              (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
            ),
          )
          .toBe(true);
        await expect(
          page.getByRole("img", { name: "CMMF Studio", exact: true }),
        ).toHaveCount(1);
        await expect(page.locator(".studio")).toHaveCount(0);
        before = await logo.boundingBox();
        source = await logo.evaluate((img: HTMLImageElement) => img.currentSrc);
        expect(source).toContain(width <= 750 ? "compact" : "horizontal");
        expect(source).toContain(`gradient-${theme}`);
        await page.screenshot({
          path: `artifacts/startup-logo-${theme}-${width}.png`,
        });
      } finally {
        releaseApp();
      }
      await expect(page.getByLabel("Workspace name")).toHaveValue(
        "Large ecommerce store",
      );
      await expect(page.locator(".react-flow__node")).toHaveCount(34);
      await expect(page.locator(".startup-header")).toHaveCount(0);
      const logo = page.locator(".studio-logo");
      await expect(logo).toBeVisible();
      expect(
        await logo.evaluate((img: HTMLImageElement) => img.currentSrc),
      ).toBe(source);
      const after = await logo.boundingBox();
      for (const key of ["x", "y", "width", "height"] as const) {
        expect(after![key]).toBeCloseTo(before![key], 1);
      }
    });
  }
}
