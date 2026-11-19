import assert from "node:assert/strict";
import test from "node:test";
import { branchIdsForPermission, branchScopeWhere, branchScopesWhere, branchRelationWhere, canAccessBranch, hasRestaurantWideScope, ownedOrderWhere } from "../src/lib/auth/scope";

const membership = {
  id: "member-1",
  userId: "user-1",
  isOwner: false,
  branchId: "branch-a",
  branchAccessIds: ["branch-b"],
  permissionScopes: new Map<string, "RESTAURANT" | "BRANCH" | "OWNED">([
    ["orders.view", "BRANCH"],
    ["orders.change_status", "OWNED"],
    ["tables.view", "RESTAURANT"],
  ]),
};

test("branch scope includes assigned primary and additional branches", () => {
  assert.deepEqual(branchIdsForPermission(membership, "orders.view"), ["branch-a", "branch-b"]);
  assert.deepEqual(branchScopeWhere(membership, "orders.view"), { branchId: { in: ["branch-a", "branch-b"] } });
});

test("restaurant scope does not add a branch filter", () => {
  assert.deepEqual(branchScopeWhere(membership, "tables.view"), {});
  assert.equal(canAccessBranch(membership, "tables.view", null), true);
  assert.equal(hasRestaurantWideScope(membership, "tables.view"), true);
});

test("combined views retain the narrow branch filter when another permission is restaurant-wide", () => {
  assert.deepEqual(branchScopesWhere(membership, ["orders.view", "tables.view"]), {
    branchId: { in: ["branch-a", "branch-b"] },
  });
});

test("branch scope denies branchless and unassigned resources", () => {
  assert.equal(canAccessBranch(membership, "orders.view", "branch-a"), true);
  assert.equal(canAccessBranch(membership, "orders.view", "branch-b"), true);
  assert.equal(canAccessBranch(membership, "orders.view", "branch-c"), false);
  assert.equal(canAccessBranch(membership, "orders.view", null), false);
  assert.equal(hasRestaurantWideScope(membership, "orders.view"), false);
});

test("owned scope is not branch-wide access", () => {
  assert.equal(canAccessBranch(membership, "orders.change_status", "branch-a"), false);
});

test("owned scope filters order reads to creator, delivery driver or explicit assignee", () => {
  assert.deepEqual(ownedOrderWhere(membership, "orders.change_status"), {
    OR: [
      { createdById: "user-1" },
      { driverId: "user-1" },
      { assignments: { some: { memberId: "member-1" } } },
    ],
  });
});

test("relation-based records are filtered through their table branch", () => {
  assert.deepEqual(branchRelationWhere(membership, "orders.view", "table"), {
    table: { branchId: { in: ["branch-a", "branch-b"] } },
  });
});
