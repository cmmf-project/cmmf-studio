import { test, expect } from "@playwright/test";

const scenarios = [
  {
    name: "saved dark overrides light system",
    saved: "dark",
    system: "light",
    expected: "dark",
  },
  {
    name: "saved light overrides dark system",
    saved: "light",
    system: "dark",
    expected: "light",
  },
  {
    name: "system dark without a saved preference",
    saved: null,
    system: "dark",
    expected: "dark",
  },
  {
    name: "system light without a saved preference",
    saved: null,
    system: "light",
    expected: "light",
  },
  {
    name: "invalid preference falls back to system",
    saved: "invalid",
    system: "dark",
    expected: "dark",
  },
  {
    name: "unavailable storage falls back to system",
    saved: null,
    system: "dark",
    expected: "dark",
    blocked: true,
  },
] as const;

for (const scenario of scenarios) {
  test(`theme is ready before app loading: ${scenario.name}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scenario.system });
    await page.addInitScript(
      ({ saved, blocked }) => {
        if (saved !== null) localStorage.setItem("cmmf-theme", saved);
        if (blocked) {
          Storage.prototype.getItem = () => {
            throw new DOMException("Storage blocked", "SecurityError");
          };
          Storage.prototype.setItem = () => {
            throw new DOMException("Storage blocked", "SecurityError");
          };
        }
      },
      { saved: scenario.saved, blocked: "blocked" in scenario },
    );

    let releaseApp!: () => void;
    const appGate = new Promise<void>((resolve) => {
      releaseApp = resolve;
    });
    // Hold external scripts AND styles to check the first HTML paint independently
    // of bundle download, React startup, and saved-model parsing.
    await page.route("**/*", async (route) => {
      if (["script", "stylesheet"].includes(route.request().resourceType()))
        await appGate;
      await route.continue();
    });
    try {
      await page.goto("/", { waitUntil: "commit" });
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        scenario.expected,
      );
      await expect(page.locator("html")).toHaveCSS(
        "color-scheme",
        scenario.expected,
      );
      await expect(page.locator("html")).toHaveCSS(
        "background-color",
        scenario.expected === "dark" ? "rgb(25, 35, 41)" : "rgb(246, 247, 243)",
      );
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
        "content",
        scenario.expected === "dark" ? "#192329" : "#F6F7F3",
      );
      await expect(page.locator("#root")).toBeEmpty();
    } finally {
      releaseApp();
    }
    await expect(page.getByLabel("Workspace name")).toHaveValue(
      "Customer stories",
    );
    await expect(
      page.getByRole("button", {
        name:
          scenario.expected === "dark"
            ? "Switch to light mode"
            : "Switch to dark mode",
      }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      scenario.expected,
    );
  });
}
