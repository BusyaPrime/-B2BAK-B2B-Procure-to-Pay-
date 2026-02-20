import { expect, test } from "@playwright/test";

test("buyer login and workflow smoke", async ({ page }: { page: any }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("buyer@demo.local");
  await page.getByLabel("Password").fill("Demo12345!");
  await page.locator("form").getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/cabinet\/buyer/);

  await page.goto("/cabinet/new-request");
  await page.getByPlaceholder("Example: Website redesign for B2B marketplace").fill("Playwright Smoke Request");
  await page.getByPlaceholder("Example: Build responsive frontend with role-based cabinets.").fill("Automated smoke request task.");
  await page.getByPlaceholder("Detailed requirements, stack, integrations, acceptance criteria...").fill("Include RBAC, auditability, and stable pages router UX.");
  await page.getByPlaceholder("Context, goals, expected outcomes, constraints...").fill("Need delivery fast with high confidence.");
  await page.getByPlaceholder("15000").fill("2500");
  await page.locator("input[type='date']").fill("2026-12-31");
  await page.getByRole("button", { name: "Create Precise Request" }).click();
  await expect(page).toHaveURL(/\/marketplace\/requests\/.+/);
  const requestUrl = page.url();

  await page.getByRole("button", { name: "Publish" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Reviews" }).click();
  await page.getByRole("button", { name: "Get Suggestions" }).click();
  await expect(page.getByText("Review suggestions manually.")).toBeVisible();
  await page.getByRole("link", { name: "<- Back to requests" }).click();
  await page.getByRole("button", { name: "Emit lint notification" }).click();
  await expect(page.getByText("LINT job completed")).toBeVisible();
  await page.getByRole("link", { name: "Switch Account" }).click();

  await page.goto("/login");
  await page.getByLabel("Email").fill("vendor@demo.local");
  await page.getByLabel("Password").fill("Demo12345!");
  await page.locator("form").getByRole("button", { name: "Log In" }).click();
  await page.goto(requestUrl);
  await page.getByRole("button", { name: "Overview" }).click();
  await page.getByPlaceholder("Amount (USD)").fill("19000");
  await page.getByRole("button", { name: "Submit Quote" }).click();
  await page.getByRole("link", { name: "<- Back to requests" }).click();
  await page.getByRole("link", { name: "Switch Account" }).click();

  await page.goto("/login");
  await page.getByLabel("Email").fill("buyer@demo.local");
  await page.getByLabel("Password").fill("Demo12345!");
  await page.locator("form").getByRole("button", { name: "Log In" }).click();
  await page.goto(requestUrl);
  await page.getByRole("button", { name: "Shortlist" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByRole("button", { name: "Award Winner" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.goto("/marketplace/deals");
  await page.getByRole("button", { name: "Create Invoice" }).first().click();
  await page.getByRole("button", { name: "Mark Paid" }).first().click();
  await page.getByRole("button", { name: "Confirm" }).click();
});
