import assert from "node:assert/strict";
import test from "node:test";
import type { NavGroup } from "../src/lib/navigation";
import { filterNav } from "../src/lib/navigation";

const groups: NavGroup[] = [{
  key: "reports",
  labelKey: "nav.reports",
  items: [
    { labelKey: "nav.orders", href: "/orders", icon: "list", permission: "reports.view" },
    { labelKey: "nav.staff", href: "/staff-report", icon: "users", permission: "reports.view", allPermissions: ["staff.view"] },
  ],
}];

test("navigation hides staff reports unless every required capability is present", () => {
  assert.deepEqual(filterNav(groups, new Set(["reports.view"]), false)[0].items.map((item) => item.href), ["/orders"]);
  assert.deepEqual(filterNav(groups, new Set(["reports.view", "staff.view"]), false)[0].items.map((item) => item.href), ["/orders", "/staff-report"]);
  assert.equal(filterNav(groups, new Set(), true)[0].items.length, 2);
});
