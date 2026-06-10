import { test, expect } from "@playwright/test";

// Runs against the local stack with the seeded demo data; reset the local
// database (supabase db reset) before a full run so staff acks are pending.

async function quickLogin(page: import("@playwright/test").Page, label: string) {
  await page.goto("/login");
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForURL("**/dashboard");
}

test("delegations register renders for staff with acknowledgement state", async ({ page }) => {
  await quickLogin(page, "Staff");
  await page.goto("/delegations/register");
  await expect(
    page.getByRole("heading", { name: "Delegations register" })
  ).toBeVisible();
  // Seeded register has 35 rows; at least one acknowledged badge proves
  // member-wide ack visibility for the staff role
  await expect(page.getByText("Acknowledged").first()).toBeVisible();
});

test("staff acknowledges a pending delegation end to end", async ({ page }) => {
  await quickLogin(page, "Staff");
  await page.goto("/delegations/mine");

  const pendingHeading = page.getByText(/Awaiting your acknowledgement/);
  await expect(pendingHeading).toBeVisible();
  const before = await page.getByRole("button", { name: "Acknowledge" }).count();
  expect(before).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Acknowledge" }).first().click();
  await expect(page.getByText("Delegation acknowledged")).toBeVisible();
  await expect(page.getByRole("button", { name: "Acknowledge" })).toHaveCount(before - 1);
});

test("register CSV export downloads with BOM and quoted fields", async ({ page }) => {
  await quickLogin(page, "Governance officer");
  const response = await page.request.get("/delegations/register/export?by=position");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");

  const body = await response.text();
  expect(body.charCodeAt(0)).toBe(0xfeff); // Excel-friendly BOM
  expect(body).toContain("Position,Position code,Org unit");
  // conditions_limitations contains commas, so quoted fields must appear
  expect(body).toContain('"');
});

test("policies register lists seeded policies and exports CSV", async ({ page }) => {
  await quickLogin(page, "Staff");
  await page.goto("/policies");
  await expect(page.getByText("Code of Conduct")).toBeVisible();
  await expect(page.getByText("under review")).toBeVisible();

  const response = await page.request.get("/policies/export");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
});

test("staff acknowledges a pending policy", async ({ page }) => {
  await quickLogin(page, "Staff");
  await page.goto("/policies/mine");

  const before = await page.getByRole("button", { name: "Acknowledge" }).count();
  expect(before).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Acknowledge" }).first().click();
  await expect(page.getByText("Policy acknowledged")).toBeVisible();
  await expect(page.getByRole("button", { name: "Acknowledge" })).toHaveCount(before - 1);
});

test("reviews page shows the seeded scheduled review", async ({ page }) => {
  await quickLogin(page, "Governance officer");
  await page.goto("/reviews");
  await expect(
    page.getByText("Scheduled review: Media and Communications Policy")
  ).toBeVisible();
});
