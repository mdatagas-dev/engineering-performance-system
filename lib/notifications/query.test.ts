import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildNotificationQuery } from "./query";

describe("buildNotificationQuery", () => {
  it("default: page=1, perPage=20, hanya recipientId non-arsip", () => {
    const q = buildNotificationQuery({ recipientId: "user-1" });
    assert.deepEqual(q.where, { recipientId: "user-1", isArchived: false });
    assert.equal(q.page, 1);
    assert.equal(q.perPage, 20);
    assert.equal(q.skip, 0);
    assert.equal(q.take, 20);
  });

  it("archived=true menampilkan arsip", () => {
    assert.deepEqual(
      buildNotificationQuery({ recipientId: "u", archived: "true" }).where,
      { recipientId: "u", isArchived: true }
    );
  });

  it("archived=false tetap non-arsip", () => {
    assert.deepEqual(
      buildNotificationQuery({ recipientId: "u", archived: "false" }).where,
      { recipientId: "u", isArchived: false }
    );
  });

  it("isRead true/false menjadi filter boolean", () => {
    assert.deepEqual(buildNotificationQuery({ recipientId: "u", isRead: "true" }).where, {
      recipientId: "u",
      isArchived: false,
      isRead: true,
    });
    assert.deepEqual(buildNotificationQuery({ recipientId: "u", isRead: "false" }).where, {
      recipientId: "u",
      isArchived: false,
      isRead: false,
    });
  });

  it("isRead nilai tidak valid diabaikan", () => {
    assert.deepEqual(
      buildNotificationQuery({ recipientId: "u", isRead: "yes" }).where,
      { recipientId: "u", isArchived: false }
    );
  });

  it("type enum valid dipasang", () => {
    assert.deepEqual(
      buildNotificationQuery({ recipientId: "u", type: "KPI_ALERT" }).where,
      { recipientId: "u", isArchived: false, type: "KPI_ALERT" }
    );
  });

  it("type tidak dikenal diabaikan", () => {
    assert.deepEqual(
      buildNotificationQuery({ recipientId: "u", type: "BOGUS" }).where,
      { recipientId: "u", isArchived: false }
    );
  });

  it("page/perPage diklem ke rentang aman", () => {
    const q = buildNotificationQuery({ recipientId: "u", page: 0, perPage: 500 });
    assert.equal(q.page, 1);
    assert.equal(q.perPage, 100);
    const q2 = buildNotificationQuery({ recipientId: "u", page: 3, perPage: 10 });
    assert.equal(q2.skip, 20);
    assert.equal(q2.take, 10);
  });
});
