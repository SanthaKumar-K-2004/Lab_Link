import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";

describe("Tier 2: Boundary & Corner Cases — Unauthenticated & Unauthorized Guards", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("blocks kiosk checkout when user session is null", async () => {
    mockSupabase.setCurrentUser(null);
    expect(mockSupabase.currentUser).toBeNull();

    const rpcRes = await mockSupabase.rpc("kiosk_checkout", {
      p_item_id: "11111111-1111-1111-1111-111111111111",
      p_due_date: new Date().toISOString(),
    });

    expect(rpcRes.data.success).toBe(false);
    expect(rpcRes.data.error).toBe("Unauthenticated");
  });

  it("blocks user creation from edge function when required fields are missing", async () => {
    const res = await mockSupabase.functions.invoke("create-user", {
      body: {
        email: "incomplete@university.edu",
        // missing password & full_name
      },
    });

    expect(res.data.success).toBe(false);
    expect(res.data.error).toBe("Email, password, and full name are required");
  });

  it("prevents deletion of the default admin account", async () => {
    const res = await mockSupabase.functions.invoke("delete-user", {
      body: {
        user_id: "user-admin-1", // is_default_admin: true
      },
    });

    expect(res.data.success).toBe(false);
    expect(res.data.error).toContain("Cannot delete the default admin account");

    // Verify admin profile still exists
    const admin = mockSupabase.db.profiles.find((p) => p.id === "user-admin-1");
    expect(admin).toBeDefined();
  });

  it("blocks non-existent records on return operations", async () => {
    mockSupabase.setCurrentUser("user-student-1");

    const rpcRes = await mockSupabase.rpc("kiosk_return", {
      p_issued_item_id: "non-existent-issued-id",
    });

    expect(rpcRes.data.success).toBe(false);
    expect(rpcRes.data.error).toBe("Record not found");
  });

  it("rejects repair ticket status update for invalid item id", async () => {
    const rpcRes = await mockSupabase.rpc("update_item_repair_status", {
      p_item_id: "invalid-uuid-0000",
      p_status: "under_maintenance",
    });

    expect(rpcRes.data).toBe(false);
    expect(rpcRes.error?.message).toBe("Item not found");
  });
});
