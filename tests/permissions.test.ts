import assert from "node:assert/strict";
import test from "node:test";
import { effectiveAuthorization, ROLE_TEMPLATES, PERMISSION_KEYS } from "../src/lib/permissions";
import { PLATFORM_ROLE_DEFINITIONS, hasPlatformCapability, platformCapabilities } from "../src/lib/auth/platform";

test("seeds the fourteen requested restaurant role templates including owner", () => {
  assert.equal(ROLE_TEMPLATES.length, 14);
  assert.equal(ROLE_TEMPLATES[0].key, "owner");
  assert.equal(ROLE_TEMPLATES[0].permissions, "*");
  assert.ok(PERMISSION_KEYS.includes("orders.refund" as never));
  assert.ok(PERMISSION_KEYS.includes("staff.permissions.manage" as never));
});

test("role grants combine and the broadest role grant wins before explicit member overrides", () => {
  const result = effectiveAuthorization({
    roles: [
      { role: { permissions: [{ permission: { key: "orders.view" }, scope: "BRANCH" }] } },
      { role: { permissions: [{ permission: { key: "orders.view" }, scope: "RESTAURANT" }] } },
    ],
    permissions: [],
  });
  assert.ok(result.permissions.has("orders.view"));
  assert.equal(result.scopes.get("orders.view"), "RESTAURANT");
});

test("member DENY overrides role grants and member ALLOW overrides can carry a narrow scope", () => {
  const base = {
    roles: [{ role: { permissions: [
      { permission: { key: "orders.view" }, scope: "RESTAURANT" as const },
      { permission: { key: "menu.prices.update" }, scope: "BRANCH" as const },
    ] } }],
    permissions: [
      { effect: "DENY" as const, permission: { key: "orders.view" } },
      { effect: "ALLOW" as const, permission: { key: "reports.financial.view" }, scope: "OWNED" as const },
    ],
  };
  const result = effectiveAuthorization(base);
  assert.equal(result.permissions.has("orders.view"), false);
  assert.equal(result.scopes.get("reports.financial.view"), "OWNED");
  assert.equal(result.scopes.get("menu.prices.update"), "BRANCH");
});

test("platform roles enforce least-privilege separation", () => {
  assert.equal(PLATFORM_ROLE_DEFINITIONS.length, 7);
  assert.equal(hasPlatformCapability("FINANCE_ADMIN", "billing.manage"), true);
  assert.equal(hasPlatformCapability("FINANCE_ADMIN", "restaurants.manage"), false);
  assert.equal(hasPlatformCapability("SUPPORT_AGENT", "support.manage"), true);
  assert.equal(hasPlatformCapability("SUPPORT_AGENT", "billing.view"), false);
  assert.equal(hasPlatformCapability("READ_ONLY_ADMIN", "users.view"), true);
  assert.equal(hasPlatformCapability("READ_ONLY_ADMIN", "users.manage"), false);
  assert.equal(platformCapabilities(null).size, 0);
});
