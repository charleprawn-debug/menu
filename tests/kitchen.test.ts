import assert from "node:assert/strict";
import test from "node:test";
import { deriveTicketStatus, groupItemsByStation } from "../src/lib/services/kitchen";

test("routes products to an allowed station and falls back when assignment is missing or stale", () => {
  const groups = groupItemsByStation(
    [
      { id: "pizza", stationId: null, product: { defaultStationId: "grill" } },
      { id: "drink", stationId: null, product: { defaultStationId: "bar" } },
      { id: "legacy", stationId: null, product: null },
      { id: "stale", stationId: "deleted", product: null },
    ],
    new Set(["kitchen", "bar", "grill"]),
    "kitchen",
  );
  assert.deepEqual([...groups.entries()].map(([key, items]) => [key, items.map((item) => item.id)]), [
    ["grill", ["pizza"]],
    ["bar", ["drink"]],
    ["kitchen", ["legacy", "stale"]],
  ]);
});

test("a station is ready only when every item is ready or served", () => {
  assert.equal(deriveTicketStatus(["READY", "SERVED"]), "READY");
  assert.equal(deriveTicketStatus(["PREPARING", "READY"]), "PREPARING");
  assert.equal(deriveTicketStatus(["DELAYED", "QUEUED"]), "DELAYED");
  assert.equal(deriveTicketStatus(["CANCELLED", "CANCELLED"]), "CANCELLED");
  assert.equal(deriveTicketStatus(["QUEUED"]), "QUEUED");
});
