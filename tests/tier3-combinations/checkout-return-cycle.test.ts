import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";

describe("Tier 3: Cross-Feature Combinations — Checkout & Return Cycle", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("completes full checkout flow: decrements stock and creates active loan record", async () => {
    const studentId = "user-student-1";
    const itemId = "11111111-1111-1111-1111-111111111111"; // DMM-001 has 10 pieces

    mockSupabase.setCurrentUser(studentId);

    // 1. Initial State
    const initialItem = mockSupabase.db.items.find((i) => i.id === itemId);
    expect(initialItem?.current_quantity).toBe(10);
    expect(initialItem?.status).toBe("available");

    // 2. Perform Kiosk Checkout
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString();
    const checkoutRes = await mockSupabase.rpc("kiosk_checkout", {
      p_item_id: itemId,
      p_due_date: dueDate,
    });

    expect(checkoutRes.data.success).toBe(true);
    const issuedId = checkoutRes.data.issued_item_id;
    expect(issuedId).toBeDefined();

    // 3. Verify issued_items row created
    const issuedRow = mockSupabase.db.issued_items.find((r) => r.id === issuedId);
    expect(issuedRow).toBeDefined();
    expect(issuedRow.item_id).toBe(itemId);
    expect(issuedRow.issued_to).toBe(studentId);
    expect(issuedRow.status).toBe("active");
    expect(issuedRow.due_date).toBe(dueDate);

    // 4. Verify item quantity decremented from 10 to 9
    const updatedItem = mockSupabase.db.items.find((i) => i.id === itemId);
    expect(updatedItem?.current_quantity).toBe(9);
    expect(updatedItem?.status).toBe("available");
  });

  it("transitions item status to 'borrowed' when stock reaches 0 upon checkout", async () => {
    const studentId = "user-student-1";
    const itemId = "22222222-2222-2222-2222-222222222222"; // OSC-002 has exactly 1 piece

    mockSupabase.setCurrentUser(studentId);

    const initialItem = mockSupabase.db.items.find((i) => i.id === itemId);
    expect(initialItem?.current_quantity).toBe(1);
    expect(initialItem?.status).toBe("available");

    // Checkout the last piece
    const checkoutRes = await mockSupabase.rpc("kiosk_checkout", {
      p_item_id: itemId,
      p_due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    });

    expect(checkoutRes.data.success).toBe(true);

    // Quantity becomes 0 and status becomes 'borrowed'
    const depletedItem = mockSupabase.db.items.find((i) => i.id === itemId);
    expect(depletedItem?.current_quantity).toBe(0);
    expect(depletedItem?.status).toBe("borrowed");

    // Subsequent checkout attempt on depleted item fails
    const secondCheckoutRes = await mockSupabase.rpc("kiosk_checkout", {
      p_item_id: itemId,
      p_due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    expect(secondCheckoutRes.data.success).toBe(false);
    expect(secondCheckoutRes.data.error).toBe("Item out of stock");
  });

  it("completes full return cycle: marks record returned, increments stock, and restores 'available' status", async () => {
    const studentId = "user-student-1";
    const itemId = "22222222-2222-2222-2222-222222222222"; // OSC-002 (stock 1)

    mockSupabase.setCurrentUser(studentId);

    // 1. Check out item to deplete it
    const checkoutRes = await mockSupabase.rpc("kiosk_checkout", {
      p_item_id: itemId,
      p_due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    const issuedId = checkoutRes.data.issued_item_id;

    // Item is now at 0 stock, status borrowed
    expect(mockSupabase.db.items.find((i) => i.id === itemId)?.status).toBe("borrowed");

    // 2. Perform Return
    const returnRes = await mockSupabase.rpc("kiosk_return", {
      p_issued_item_id: issuedId,
    });
    expect(returnRes.data.success).toBe(true);

    // 3. Verify issued_items record updated
    const returnRow = mockSupabase.db.issued_items.find((r) => r.id === issuedId);
    expect(returnRow?.status).toBe("returned");
    expect(returnRow?.returned_date).not.toBeNull();

    // 4. Verify item quantity restored from 0 to 1 and status restored to 'available'
    const restoredItem = mockSupabase.db.items.find((i) => i.id === itemId);
    expect(restoredItem?.current_quantity).toBe(1);
    expect(restoredItem?.status).toBe("available");
  });
});
