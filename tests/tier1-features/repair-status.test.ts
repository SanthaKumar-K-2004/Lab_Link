import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";

export function calculateRepairStats(records: any[], technicianId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const myRecords = records.filter((r) => r.assigned_to === technicianId);
  const assigned = myRecords.filter((r) => r.status === "pending").length;
  const inProgress = myRecords.filter((r) => r.status === "in_progress").length;

  const completedRecords = myRecords.filter((r) => r.status === "completed" && r.actual_completion);
  const completedToday = completedRecords.filter((r) => {
    const completedDate = new Date(r.actual_completion!);
    return completedDate >= today;
  }).length;

  const completedThisWeek = completedRecords.filter((r) => {
    const completedDate = new Date(r.actual_completion!);
    return completedDate >= weekAgo;
  }).length;

  let avgRepairTime = 0;
  const repairsWithTime = completedRecords.filter((r) => r.start_date && r.actual_completion);
  if (repairsWithTime.length > 0) {
    const totalDays = repairsWithTime.reduce((sum, r) => {
      const days = Math.round(
        (new Date(r.actual_completion).getTime() - new Date(r.start_date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);
    avgRepairTime = Math.round(totalDays / repairsWithTime.length);
  }

  return { assigned, inProgress, completedToday, completedThisWeek, avgRepairTime };
}

describe("Tier 1: Repair Status Transitions & Maintenance Metrics", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("claims repair ticket assigning technician ID", async () => {
    const recordId = "maint-rec-new";
    mockSupabase.db.maintenance_records.push({
      id: recordId,
      item_id: "11111111-1111-1111-1111-111111111111",
      assigned_to: null,
      status: "pending",
      start_date: null,
      actual_completion: null,
      repair_notes: null,
    });

    const techId = "user-tech-1";
    const { error } = await mockSupabase
      .from("maintenance_records")
      .update({ assigned_to: techId })
      .eq("id", recordId);

    expect(error).toBeNull();
    const updated = mockSupabase.db.maintenance_records.find((r) => r.id === recordId);
    expect(updated?.assigned_to).toBe(techId);
  });

  it("transitions status to in_progress, sets start_date, and marks item under_maintenance", async () => {
    const recordId = "maint-rec-1";
    const itemId = "44444444-4444-4444-4444-444444444444";

    const nowIso = new Date().toISOString();
    await mockSupabase
      .from("maintenance_records")
      .update({ status: "in_progress", start_date: nowIso })
      .eq("id", recordId);

    await mockSupabase
      .from("items")
      .update({ status: "under_maintenance" })
      .eq("id", itemId);

    const record = mockSupabase.db.maintenance_records.find((r) => r.id === recordId);
    expect(record?.status).toBe("in_progress");
    expect(record?.start_date).toBe(nowIso);

    const item = mockSupabase.db.items.find((i) => i.id === itemId);
    expect(item?.status).toBe("under_maintenance");
  });

  it("transitions status to completed, sets actual_completion, and restores item to available", async () => {
    const recordId = "maint-rec-1";
    const itemId = "44444444-4444-4444-4444-444444444444";

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

    const record = mockSupabase.db.maintenance_records.find((r) => r.id === recordId);
    expect(record?.status).toBe("completed");
    expect(record?.actual_completion).toBe(completionIso);

    const item = mockSupabase.db.items.find((i) => i.id === itemId);
    expect(item?.status).toBe("available");
  });

  it("calculates technician repair statistics and average turnaround time accurately", async () => {
    const techId = "user-tech-1";
    const { data: records } = await mockSupabase.from("maintenance_records").select("*");

    const stats = calculateRepairStats(records, techId);

    // Initial mock db has:
    // maint-rec-1: in_progress
    // maint-rec-2: completed (2 days)
    // maint-rec-3: completed (4 days)
    expect(stats.inProgress).toBe(1);
    expect(stats.assigned).toBe(0);
    expect(stats.completedThisWeek).toBe(1); // maint-rec-3 is within 7 days, maint-rec-2 was 8 days ago
    // Average days: (2 + 4) / 2 = 3 days
    expect(stats.avgRepairTime).toBe(3);
  });
});
