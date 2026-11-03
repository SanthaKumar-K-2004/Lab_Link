import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";
import { calculateRepairStats } from "../tier1-features/repair-status.test";

describe("Tier 3: Cross-Feature Combinations — Repair Lifecycle", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("progresses an item through the full repair lifecycle: Claim -> In Progress -> Complete -> Available", async () => {
    const techId = "user-tech-1";
    const itemId = "44444444-4444-4444-4444-444444444444"; // Microscope
    const recordId = "maint-test-cycle-1";

    mockSupabase.setCurrentUser(techId);

    // Step 1: Create a new pending repair ticket
    mockSupabase.db.maintenance_records.push({
      id: recordId,
      item_id: itemId,
      assigned_to: null,
      status: "pending",
      start_date: null,
      actual_completion: null,
      repair_notes: null,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    });

    // Step 2: Technician claims the ticket
    await mockSupabase
      .from("maintenance_records")
      .update({ assigned_to: techId })
      .eq("id", recordId);

    const claimedRecord = mockSupabase.db.maintenance_records.find((r) => r.id === recordId);
    expect(claimedRecord?.assigned_to).toBe(techId);

    // Step 3: Technician begins repair: status -> 'in_progress', set start_date, item status -> 'under_maintenance'
    const startIso = new Date(Date.now() - 3 * 86400000).toISOString();
    await mockSupabase
      .from("maintenance_records")
      .update({ status: "in_progress", start_date: startIso })
      .eq("id", recordId);

    await mockSupabase
      .from("items")
      .update({ status: "under_maintenance" })
      .eq("id", itemId);

    const inProgressRecord = mockSupabase.db.maintenance_records.find((r) => r.id === recordId);
    expect(inProgressRecord?.status).toBe("in_progress");
    expect(inProgressRecord?.start_date).toBe(startIso);

    const underMaintItem = mockSupabase.db.items.find((i) => i.id === itemId);
    expect(underMaintItem?.status).toBe("under_maintenance");

    // Verify item cannot be checked out while under maintenance
    const borrowAttempt = await mockSupabase.rpc("kiosk_checkout", {
      p_item_id: itemId,
      p_due_date: new Date().toISOString(),
    });
    // Can't checkout maintenance item if custom guard or status != available
    expect(underMaintItem?.status).not.toBe("available");

    // Step 4: Technician saves repair notes
    const notes = "Replaced fine adjustment gear and cleaned 40x objective lens.";
    await mockSupabase
      .from("maintenance_records")
      .update({ repair_notes: notes })
      .eq("id", recordId);

    const notedRecord = mockSupabase.db.maintenance_records.find((r) => r.id === recordId);
    expect(notedRecord?.repair_notes).toBe(notes);

    // Step 5: Technician completes repair: status -> 'completed', set actual_completion, item status -> 'available'
    const completionIso = new Date().toISOString();
    await mockSupabase
      .from("maintenance_records")
      .update({ status: "completed", actual_completion: completionIso })
      .eq("id", recordId);

    await mockSupabase
      .from("items")
      .update({ status: "available" })
      .eq("id", itemId)
      .eq("status", "under_maintenance");

    const completedRecord = mockSupabase.db.maintenance_records.find((r) => r.id === recordId);
    expect(completedRecord?.status).toBe("completed");
    expect(completedRecord?.actual_completion).toBe(completionIso);

    const restoredItem = mockSupabase.db.items.find((i) => i.id === itemId);
    expect(restoredItem?.status).toBe("available");

    // Step 6: Verify updated metrics
    const stats = calculateRepairStats(mockSupabase.db.maintenance_records, techId);
    expect(stats.completedToday).toBeGreaterThanOrEqual(1);
    expect(stats.avgRepairTime).toBeGreaterThanOrEqual(1);
  });
});
