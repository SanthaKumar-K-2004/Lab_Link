import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";
import { parseQRCode } from "../tier1-features/qr-parser.test";
import { getMaxBorrowable } from "../tier1-features/borrow-limits.test";

describe("Tier 4: Real-World Application Workflows — Full Item Lifecycle & Audit Trail", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("executes full item lifecycle: creation -> QR generation -> request -> approval -> checkout -> return -> audit logging", async () => {
    const adminId = "user-admin-1";
    const studentId = "user-student-1";

    // -------------------------------------------------------------
    // STAGE 1: Item Creation by Admin
    // -------------------------------------------------------------
    mockSupabase.setCurrentUser(adminId);

    const newItemData = {
      id: "99999999-9999-9999-9999-999999999999",
      name: "3D Printer Creality Ender 3 V2",
      item_code: "3DP-005",
      category_id: "cat-electronics",
      department_id: "dept-ece",
      current_quantity: 4,
      minimum_quantity: 1,
      reorder_threshold: 1,
      status: "available",
      condition: "excellent",
      is_borrowable: true,
      storage_location: "FabLab Room 105",
    };

    const { data: createdItems, error: createError } = await mockSupabase
      .from("items")
      .insert(newItemData);

    expect(createError).toBeNull();
    const createdItem = mockSupabase.db.items.find((i) => i.id === newItemData.id);
    expect(createdItem).toBeDefined();
    expect(createdItem?.name).toBe("3D Printer Creality Ender 3 V2");

    // Record Audit Log for Creation
    await mockSupabase.from("audit_logs").insert({
      user_id: adminId,
      action: "item_created",
      entity_type: "item",
      entity_id: newItemData.id,
      details: { item_code: newItemData.item_code, name: newItemData.name },
      created_at: new Date().toISOString(),
    });

    // -------------------------------------------------------------
    // STAGE 2: Barcode & QR Code Payload Generation
    // -------------------------------------------------------------
    const lablinkQrString = `LABLINK:${newItemData.item_code}`;
    const scanUrlQrString = `https://lablink.university.edu/scan/${newItemData.id}?source=label`;
    const jsonQrString = JSON.stringify({ id: newItemData.id, code: newItemData.item_code });

    // Verify all generated QR formats parse accurately back to the item
    const parsedLablink = parseQRCode(lablinkQrString);
    expect(parsedLablink.searchId).toBe(newItemData.item_code);

    const parsedUrl = parseQRCode(scanUrlQrString);
    expect(parsedUrl.searchId).toBe(newItemData.id);
    expect(parsedUrl.isUUID).toBe(true);

    const parsedJson = parseQRCode(jsonQrString);
    expect(parsedJson.searchId).toBe(newItemData.id);

    // -------------------------------------------------------------
    // STAGE 3: Student Borrow Request Submission
    // -------------------------------------------------------------
    mockSupabase.setCurrentUser(studentId);

    // Validate request quantity against half-stock borrow limit
    const maxAllowed = getMaxBorrowable(createdItem!.current_quantity);
    expect(maxAllowed).toBe(2); // Half of 4 is 2

    const requestedQuantity = 2;
    expect(requestedQuantity).toBeLessThanOrEqual(maxAllowed);

    const requestId = "req-lifecycle-001";
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + 5 * 86400000).toISOString();

    const { error: requestError } = await mockSupabase.from("borrow_requests").insert({
      id: requestId,
      student_id: studentId,
      item_id: newItemData.id,
      quantity: requestedQuantity,
      requested_start_date: startDate,
      requested_end_date: endDate,
      purpose: "Robotics club chassis prototyping",
      status: "pending",
      created_at: new Date().toISOString(),
    });

    expect(requestError).toBeNull();
    const requestRow = mockSupabase.db.borrow_requests.find((r) => r.id === requestId);
    expect(requestRow?.status).toBe("pending");

    // Record Audit Log for Borrow Request
    await mockSupabase.from("audit_logs").insert({
      user_id: studentId,
      action: "borrow_requested",
      entity_type: "borrow_request",
      entity_id: requestId,
      details: { quantity: requestedQuantity },
      created_at: new Date().toISOString(),
    });

    // -------------------------------------------------------------
    // STAGE 4: Staff / Admin Approval
    // -------------------------------------------------------------
    mockSupabase.setCurrentUser(adminId);

    await mockSupabase
      .from("borrow_requests")
      .update({ status: "approved" })
      .eq("id", requestId);

    const approvedRow = mockSupabase.db.borrow_requests.find((r) => r.id === requestId);
    expect(approvedRow?.status).toBe("approved");

    // Record Audit Log for Approval
    await mockSupabase.from("audit_logs").insert({
      user_id: adminId,
      action: "borrow_approved",
      entity_type: "borrow_request",
      entity_id: requestId,
      details: { approved_by: adminId },
      created_at: new Date().toISOString(),
    });

    // -------------------------------------------------------------
    // STAGE 5: Student Kiosk Checkout via QR Code
    // -------------------------------------------------------------
    mockSupabase.setCurrentUser(studentId);

    const checkoutRes = await mockSupabase.rpc("kiosk_checkout", {
      p_item_id: parsedUrl.searchId,
      p_due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    });

    expect(checkoutRes.data.success).toBe(true);
    const issuedItemId = checkoutRes.data.issued_item_id;

    // Verify stock decremented from 4 to 3
    const itemAfterCheckout = mockSupabase.db.items.find((i) => i.id === newItemData.id);
    expect(itemAfterCheckout?.current_quantity).toBe(3);

    // Record Audit Log for Checkout
    await mockSupabase.from("audit_logs").insert({
      user_id: studentId,
      action: "item_checked_out",
      entity_type: "issued_items",
      entity_id: issuedItemId,
      details: { item_id: newItemData.id },
      created_at: new Date().toISOString(),
    });

    // -------------------------------------------------------------
    // STAGE 6: Student Return via Kiosk
    // -------------------------------------------------------------
    const returnRes = await mockSupabase.rpc("kiosk_return", {
      p_issued_item_id: issuedItemId,
    });

    expect(returnRes.data.success).toBe(true);

    // Verify stock restored from 3 to 4
    const itemAfterReturn = mockSupabase.db.items.find((i) => i.id === newItemData.id);
    expect(itemAfterReturn?.current_quantity).toBe(4);
    expect(itemAfterReturn?.status).toBe("available");

    // Record Audit Log for Return
    await mockSupabase.from("audit_logs").insert({
      user_id: studentId,
      action: "item_returned",
      entity_type: "issued_items",
      entity_id: issuedItemId,
      details: { item_id: newItemData.id },
      created_at: new Date().toISOString(),
    });

    // -------------------------------------------------------------
    // STAGE 7: Audit Trail Integrity Verification
    // -------------------------------------------------------------
    const { data: auditLogs } = await mockSupabase.from("audit_logs").select("*");

    expect(auditLogs.length).toBe(5);
    const actions = auditLogs.map((l: any) => l.action);
    expect(actions).toEqual([
      "item_created",
      "borrow_requested",
      "borrow_approved",
      "item_checked_out",
      "item_returned",
    ]);
  });
});
