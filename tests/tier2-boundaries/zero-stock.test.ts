import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";
import { getMaxBorrowable } from "../tier1-features/borrow-limits.test";

describe("Tier 2: Boundary & Corner Cases — Zero Stock & Quantity Limits", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("strictly returns 0 for depleted or negative stock levels", () => {
    // Feature #17 in PROJECT.md: getMaxBorrowable(0) returning 1 was the bug
    expect(getMaxBorrowable(0)).toBe(0);
    expect(getMaxBorrowable(-1)).toBe(0);
    expect(getMaxBorrowable(-100)).toBe(0);
  });

  it("rejects borrow request validation when quantity requested exceeds max allowed", () => {
    const validateBorrowQuantity = (requestedQty: number, stockQty: number) => {
      const maxAllowed = getMaxBorrowable(stockQty);
      if (requestedQty < 1) {
        return { valid: false, error: "Quantity must be at least 1" };
      }
      if (requestedQty > maxAllowed) {
        return {
          valid: false,
          error: `Quantity exceeds limit. Max allowed is ${maxAllowed} (half of ${stockQty} in stock).`,
        };
      }
      return { valid: true, error: null };
    };

    // Case 1: stock is 0, user requests 1 -> maxAllowed is 0 -> 1 > 0 -> REJECTED
    const zeroStockResult = validateBorrowQuantity(1, 0);
    expect(zeroStockResult.valid).toBe(false);
    expect(zeroStockResult.error).toContain("Quantity exceeds limit. Max allowed is 0");

    // Case 2: stock is 10, user requests 6 -> maxAllowed is 5 -> 6 > 5 -> REJECTED
    const exceedResult = validateBorrowQuantity(6, 10);
    expect(exceedResult.valid).toBe(false);
    expect(exceedResult.error).toContain("Max allowed is 5");

    // Case 3: stock is 10, user requests 0 -> REJECTED
    const zeroReqResult = validateBorrowQuantity(0, 10);
    expect(zeroReqResult.valid).toBe(false);
    expect(zeroReqResult.error).toBe("Quantity must be at least 1");

    // Case 4: stock is 10, user requests -1 -> REJECTED
    const negReqResult = validateBorrowQuantity(-1, 10);
    expect(negReqResult.valid).toBe(false);
    expect(negReqResult.error).toBe("Quantity must be at least 1");

    // Case 5: stock is 10, user requests 5 -> ALLOWED
    const validResult = validateBorrowQuantity(5, 10);
    expect(validResult.valid).toBe(true);
    expect(validResult.error).toBeNull();
  });

  it("rejects kiosk checkout when item is depleted (current_quantity = 0)", async () => {
    const outOfStockItemId = "33333333-3333-3333-3333-333333333333"; // Spectrophotometer has 0 stock

    // Direct kiosk RPC check
    const rpcRes = await mockSupabase.rpc("kiosk_checkout", {
      p_item_id: outOfStockItemId,
      p_due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    });

    expect(rpcRes.data.success).toBe(false);
    expect(rpcRes.data.error).toBe("Item out of stock");

    // Verify item quantity remained 0
    const item = mockSupabase.db.items.find((i) => i.id === outOfStockItemId);
    expect(item?.current_quantity).toBe(0);

    // Verify no issued_items record was created
    const issued = mockSupabase.db.issued_items.filter((i) => i.item_id === outOfStockItemId);
    expect(issued.length).toBe(0);
  });
});
