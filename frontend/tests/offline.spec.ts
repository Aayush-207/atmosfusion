import { test, expect } from "@playwright/test";

// No backend needed: the forecast API is blocked, so the app must fall back to
// the offline status card instead of a blank page.
test("offline screen shows the API error", async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.goto("/");

  await expect(page.getByText("Could not reach the forecast API")).toBeVisible({ timeout: 20_000 });
});
