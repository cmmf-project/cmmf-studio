import { test, expect } from "@playwright/test";

for (const mobile of [false, true]) {
  test(`new canvas is undoable, persistent and ready to edit (${mobile ? "mobile dark" : "desktop light"})`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(
      (theme) => localStorage.setItem("cmmf-theme", theme),
      mobile ? "dark" : "light",
    );
    await page.goto("/");
    await expect(page.locator(".loading-overlay")).toHaveCount(0);
    await page
      .getByLabel("CMMF version", { exact: true })
      .selectOption("1.3.0-beta.1");
    await page
      .getByLabel("Export namespace", { exact: true })
      .fill("test.clean.canvas");
    await page.getByLabel("Search field types").fill("reference");
    await page.getByTitle("Edit Customer story details").click();
    const before = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cmmf-studio")!),
    );
    const action = page.getByRole("button", {
      name: "New canvas",
      exact: true,
    });
    await expect(action).toBeInViewport();
    const bounds = await action.boundingBox();
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(mobile ? 390 : 1440);
    const logo = await page.locator(".studio-logo").boundingBox();
    const actions = await page.locator(".top-actions").boundingBox();
    expect(actions!.x).toBeGreaterThanOrEqual(logo!.x + logo!.width);
    await action.click();
    await expect(page.locator(".loading-overlay")).toHaveCount(0);
    await expect(page.getByLabel("Workspace name")).toHaveValue(
      "Untitled model",
    );
    await expect(page.locator(".react-flow__node")).toHaveCount(0);
    await expect(page.locator(".react-flow__edge")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByLabel("Search field types")).toHaveValue("");
    const empty = {
      version: 1,
      cmmfVersion: "1.3.0-beta.1",
      namespace: "test.clean.canvas",
      name: "Untitled model",
      models: [],
      positions: {},
    };
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("cmmf-studio")!)),
      )
      .toEqual(empty);
    await expect(page.locator(".react-flow__viewport")).toHaveCSS(
      "transform",
      "matrix(1, 0, 0, 1, 0, 0)",
    );
    await page.screenshot({
      path: `artifacts/new-canvas-${mobile ? "mobile-dark" : "desktop-light"}.png`,
    });
    // Keyboard undo is also available where the mobile header hides history buttons.
    await action.focus();
    await page.keyboard.press("Control+z");
    await expect(page.locator(".react-flow__node")).toHaveCount(
      before.models.length,
    );
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem("cmmf-studio")!)),
      )
      .toEqual(before);
    await page.keyboard.press("Control+Shift+z");
    await expect(page.locator(".react-flow__node")).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".loading-overlay")).toHaveCount(0);
    await expect(page.getByLabel("Workspace name")).toHaveValue(
      "Untitled model",
    );
    await expect(page.locator(".react-flow__node")).toHaveCount(0);
    const data = await page.evaluateHandle(() => new DataTransfer());
    await page
      .locator(".new-type")
      .dispatchEvent("dragstart", { dataTransfer: data });
    await page.locator(".canvas").dispatchEvent("drop", {
      dataTransfer: data,
      clientX: mobile ? 280 : 800,
      clientY: 350,
    });
    await expect(page.getByLabel("Name of Untitled type")).toBeVisible();
  });
}
