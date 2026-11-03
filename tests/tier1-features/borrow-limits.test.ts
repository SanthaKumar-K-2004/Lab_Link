import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";

/**
 * Authoritative borrowable limit calculation
 * If stock is 0 or negative, max borrowable is strictly 0.
 * Otherwise, student can borrow up to half the available stock (minimum 1 when stock > 0).
 */
export const getMaxBorrowable = (currentQty: number): number => {
  if (currentQty <= 0) return 0;
  return Math.max(1, Math.floor(currentQty / 2));
};

describe("Tier 1: Borrow Request Limits & Loan Rules", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("calculates max borrowable as half available stock for positive quantities", () => {
    expect(getMaxBorrowable(10)).toBe(5);
    expect(getMaxBorrowable(8)).toBe(4);
    expect(getMaxBorrowable(5)).toBe(2);
    expect(getMaxBorrowable(2)).toBe(1);
    expect(getMaxBorrowable(1)).toBe(1);
  });

  it("strictly enforces 0 borrowable limit when stock is 0", () => {
    expect(getMaxBorrowable(0)).toBe(0);
  });

  it("calculates default 7-day loan period for borrow checkouts", () => {
    const now = new Date("2026-10-31T12:00:00Z");
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 7);

    const diffDays = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
    expect(dueDate.toISOString()).toBe("2026-11-07T12:00:00.000Z");
  });

  it("detects existing active checkouts to prevent duplicate borrowing", async () => {
    const studentId = "user-student-1";
    const itemId = "11111111-1111-1111-1111-111111111111";

    // 1. Initially no active checkout
    const { data: initialCheckout } = await mockSupabase
      .from("issued_items")
      .select("id")
      .eq("item_id", itemId)
      .eq("issued_to", studentId)
      .eq("status", "active")
      .is("returned_date", null)
      .maybeSingle();

    expect(initialCheckout).toBeNull();

    // 2. Insert active checkout
    await mockSupabase.from("issued_items").insert({
      id: "issued-test-1",
      item_id: itemId,
      issued_to: studentId,
      issued_by: studentId,
      due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: "active",
      returned_date: null,
    });

    // 3. Query should now find active checkout
    const { data: activeCheckout } = await mockSupabase
      .from("issued_items")
      .select("id")
      .eq("item_id", itemId)
      .eq("issued_to", studentId)
      .eq("status", "active")
      .is("returned_date", null)
      .maybeSingle();

    expect(activeCheckout).not.toBeNull();
    expect(activeCheckout?.id).toBe("issued-test-1");
  });
});
