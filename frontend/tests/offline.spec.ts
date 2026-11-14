import { test, expect } from "@playwright/test";

// No backend needed: the forecast API is blocked, so the app must fall back to
// the offline screen with the product demo instead of a blank page.
test("offline screen shows the demo and the API error", async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.goto("/");

  await expect(page.getByText("Could not reach the forecast API")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".ss-stage")).toBeVisible();
  await expect(page.locator(".ss-stage").getByText("AtmosFusion blend")).toBeVisible();
});
