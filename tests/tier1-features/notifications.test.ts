import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";

export function resolveNotificationUrl(notification: {
  link?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
}): string | null {
  return (
    notification.link ||
    (notification.related_entity_type === "borrow_request"
      ? "/my-requests"
      : notification.related_entity_type === "item" && notification.related_entity_id
      ? `/items/${notification.related_entity_id}`
      : null)
  );
}

describe("Tier 1: Notifications Management & Deep Link Resolution", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("fetches user notifications ordered by created_at descending", async () => {
    const studentId = "user-student-1";
    const { data: notifs, error } = await mockSupabase
      .from("notifications")
      .select("*")
      .eq("user_id", studentId)
      .order("created_at", { ascending: false });

    expect(error).toBeNull();
    expect(notifs.length).toBe(2);
    expect(notifs[0].id).toBe("notif-1");
  });

  it("marks a single notification as read", async () => {
    const notifId = "notif-1";
    const { error } = await mockSupabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notifId);

    expect(error).toBeNull();
    const updated = mockSupabase.db.notifications.find((n) => n.id === notifId);
    expect(updated?.is_read).toBe(true);
  });

  it("marks all unread notifications as read for current user", async () => {
    const studentId = "user-student-1";
    const { error } = await mockSupabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", studentId)
      .eq("is_read", false);

    expect(error).toBeNull();
    const studentNotifs = mockSupabase.db.notifications.filter((n) => n.user_id === studentId);
    expect(studentNotifs.every((n) => n.is_read)).toBe(true);
  });

  it("deletes a notification permanently", async () => {
    const notifId = "notif-1";
    const { error } = await mockSupabase.from("notifications").delete().eq("id", notifId);

    expect(error).toBeNull();
    const remaining = mockSupabase.db.notifications.find((n) => n.id === notifId);
    expect(remaining).toBeUndefined();
  });

  it("resolves appropriate deep links according to notification metadata", () => {
    // 1. Direct explicit link takes precedence
    const directNotif = {
      link: "/custom-page",
      related_entity_type: "item",
      related_entity_id: "123",
    };
    expect(resolveNotificationUrl(directNotif)).toBe("/custom-page");

    // 2. Borrow request related entity routes to /my-requests
    const borrowNotif = {
      link: null,
      related_entity_type: "borrow_request",
      related_entity_id: "req-999",
    };
    expect(resolveNotificationUrl(borrowNotif)).toBe("/my-requests");

    // 3. Item related entity routes to /items/:id
    const itemNotif = {
      link: null,
      related_entity_type: "item",
      related_entity_id: "item-555",
    };
    expect(resolveNotificationUrl(itemNotif)).toBe("/items/item-555");

    // 4. Unknown entity with no link resolves to null
    const unknownNotif = {
      link: null,
      related_entity_type: "system",
      related_entity_id: null,
    };
    expect(resolveNotificationUrl(unknownNotif)).toBeNull();
  });
});
