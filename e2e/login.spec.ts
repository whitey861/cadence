import { test, expect } from "@playwright/test";

test("login page renders with quick-login buttons in development", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Cadence" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByText("Test accounts")).toBeVisible();
});

test("quick login signs in as admin and lands on the dashboard", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Casuarina Shire Council").first()).toBeVisible();
});

test("unauthenticated visits are redirected to login", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForURL("**/login");
});
