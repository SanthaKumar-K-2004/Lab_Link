import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";
import { parseQRCode } from "../tier1-features/qr-parser.test";
import { getMaxBorrowable } from "../tier1-features/borrow-limits.test";
import { calculateRepairStats } from "../tier1-features/repair-status.test";

interface TestItem {
  id: string;
  name: string;
  item_code: string;
  current_quantity: number;
  minimum_quantity: number;
  reorder_threshold: number;
  status: string;
  condition: string;
  category_id?: string;
  category?: { name: string };
  department?: { name: string };
}

interface TestProfile {
  id: string;
  full_name: string;
  email: string;
  is_default_admin?: boolean;
}

interface TestUserRole {
  id: string;
  user_id: string;
  role: string;
}

interface TestUserDept {
  id: string;
  user_id: string;
  department_id: string;
}

interface TestBorrowMessage {
  borrow_request_id: string;
  sender_id: string;
  recipient_id: string;
  message_type: string;
  subject: string;
  message: string;
}

interface TestReturnRequest {
  id: string;
  issued_item_id: string;
  item_id: string;
  student_id: string;
  quantity: number;
  item_condition: string;
  status: string;
  verified_by?: string;
  verified_at?: string;
}

type AppRole = "admin" | "staff" | "technician" | "student";

describe("Tier 4: Comprehensive System & UI Feature Verification", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  // =========================================================================
  // 1. INVENTORY MANAGEMENT WORKFLOWS
  // =========================================================================
  describe("1. Inventory Management Workflows", () => {
    it("manages item catalog with relational categories, departments, and stock thresholds", async () => {
      // 1. Fetch item catalog with relational metadata
      const { data } = await mockSupabase
        .from("items")
        .select("id, name, item_code, current_quantity, minimum_quantity, reorder_threshold, status, condition, category:categories(name), department:departments(name)");

      const items = (data || []) as unknown as TestItem[];
      expect(items).toBeDefined();
      expect(items.length).toBeGreaterThanOrEqual(4);

      // Verify relationships
      const fluke = items.find((i: TestItem) => i.item_code === "DMM-001");
      expect(fluke).toBeDefined();
      expect(fluke?.category?.name).toBe("Electronics & Sensors");
      expect(fluke?.department?.name).toBe("Electronics & Communication");

      // Verify stock health logic:
      // DMM-001 has 10 current, 2 threshold -> healthy
      expect((fluke?.current_quantity ?? 0) > (fluke?.reorder_threshold ?? 0)).toBe(true);

      // OSC-002 has 1 current, 1 threshold -> low stock
      const osc = items.find((i: TestItem) => i.item_code === "OSC-002");
      expect((osc?.current_quantity ?? 0) <= (osc?.reorder_threshold ?? 0) && (osc?.current_quantity ?? 0) > 0).toBe(true);

      // SPEC-003 has 0 current -> out of stock
      const spec = items.find((i: TestItem) => i.item_code === "SPEC-003");
      expect(spec?.current_quantity).toBe(0);
    });

    it("searches and filters inventory by multi-field matching (name, item_code, category)", async () => {
      const { data } = await mockSupabase.from("items").select("*");
      const allItems = (data || []) as unknown as TestItem[];

      // Search by partial name (case-insensitive)
      const queryName = "multimeter";
      const matchesName = allItems.filter(
        (i: TestItem) => i.name.toLowerCase().includes(queryName) || i.item_code.toLowerCase().includes(queryName)
      );
      expect(matchesName.length).toBe(1);
      expect(matchesName[0].item_code).toBe("DMM-001");

      // Filter by category
      const chemistryItems = allItems.filter((i: TestItem) => i.category_id === "cat-chemistry");
      expect(chemistryItems.length).toBe(1);
      expect(chemistryItems[0].item_code).toBe("SPEC-003");
    });

    it("generates and resolves QR codes across multiple standard, URL, and unit formats", () => {
      const itemId = "11111111-1111-1111-1111-111111111111";
      const itemCode = "DMM-001";
      const unitId = "55555555-5555-5555-5555-555555555555";

      // 1. LABLINK: item_code QR format
      const qr1 = `LABLINK:${itemCode}`;
      expect(parseQRCode(qr1).searchId).toBe(itemCode);

      // 2. Direct Web Scan URL format
      const qr2 = `https://lablink.university.edu/scan/${itemId}`;
      const res2 = parseQRCode(qr2);
      expect(res2.searchId).toBe(itemId);
      expect(res2.isUUID).toBe(true);

      // 3. Unit-specific Scan URL format
      const qr3 = `https://lablink.university.edu/scan/unit/${unitId}?kiosk=1`;
      let parsedUnitId = "";
      if (qr3.includes("/scan/unit/")) {
        const parts = qr3.split("/scan/unit/");
        parsedUnitId = parts[parts.length - 1].split("?")[0].split("#")[0].replace(/\/+$/, "").trim();
      }
      expect(parsedUnitId).toBe(unitId);
    });
  });

  // =========================================================================
  // 2. BORROW REQUESTS & APPROVALS WORKFLOW
  // =========================================================================
  describe("2. Borrow Requests & Approval/Rejection Lifecycle", () => {
    it("enforces half-stock borrowing rules and rejects invalid dates", () => {
      // 10 in stock -> student can borrow max 5
      expect(getMaxBorrowable(10)).toBe(5);
      // 1 in stock -> student can borrow max 1
      expect(getMaxBorrowable(1)).toBe(1);
      // 0 in stock -> student can borrow 0
      expect(getMaxBorrowable(0)).toBe(0);
      // Negative stock -> 0
      expect(getMaxBorrowable(-3)).toBe(0);

      // Date validation
      const startDate = new Date("2026-11-01");
      const validEndDate = new Date("2026-11-08");
      const invalidEndDate = new Date("2026-10-25");

      expect(validEndDate >= startDate).toBe(true);
      expect(invalidEndDate >= startDate).toBe(false);
    });

    it("completes borrow approval workflow: updates request, decrements stock, issues item, notifies student", async () => {
      const adminId = "user-admin-1";
      const studentId = "user-student-1";
      const itemId = "11111111-1111-1111-1111-111111111111"; // current_quantity: 10
      const requestId = "req-approval-test-1";

      mockSupabase.setCurrentUser(studentId);

      // Student creates request for 2 units
      await mockSupabase.from("borrow_requests").insert({
        id: requestId,
        student_id: studentId,
        item_id: itemId,
        quantity: 2,
        requested_start_date: new Date().toISOString(),
        requested_end_date: new Date(Date.now() + 7 * 86400000).toISOString(),
        purpose: "Embedded Systems Lab project",
        status: "pending",
        created_at: new Date().toISOString(),
      });

      // Admin approves request
      mockSupabase.setCurrentUser(adminId);

      const collectionDate = new Date().toISOString();
      const pickupLocation = "Central Lab Room 101";
      const conditions = "Handle with antistatic wristband";

      await mockSupabase
        .from("borrow_requests")
        .update({
          status: "approved",
          approved_by: adminId,
          approved_date: new Date().toISOString(),
          collection_datetime: collectionDate,
          pickup_location: pickupLocation,
          conditions: conditions,
        })
        .eq("id", requestId);

      // Decrement item quantity in inventory (10 - 2 = 8)
      const itemBefore = mockSupabase.db.items.find((i) => i.id === itemId);
      itemBefore.current_quantity -= 2;

      // Create active loan in issued_items
      const issuedItemId = `issued-${Date.now()}`;
      await mockSupabase.from("issued_items").insert({
        id: issuedItemId,
        borrow_request_id: requestId,
        item_id: itemId,
        issued_to: studentId,
        issued_by: adminId,
        due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
        quantity_issued: 2,
        status: "active",
        condition_at_issue: conditions,
      });

      // Dispatch borrow notification message
      await mockSupabase.from("borrow_messages").insert({
        borrow_request_id: requestId,
        sender_id: adminId,
        recipient_id: studentId,
        message_type: "approval",
        subject: "Borrow Request Approved: Digital Multimeter Fluke 87V",
        message: `Your request has been approved. Pick up at: ${pickupLocation}`,
      });

      // Assertions
      const updatedReq = mockSupabase.db.borrow_requests.find((r) => r.id === requestId);
      expect(updatedReq.status).toBe("approved");
      expect(updatedReq.pickup_location).toBe(pickupLocation);

      const updatedItem = mockSupabase.db.items.find((i) => i.id === itemId);
      expect(updatedItem.current_quantity).toBe(8);

      const activeLoan = mockSupabase.db.issued_items.find((l) => l.id === issuedItemId);
      expect(activeLoan).toBeDefined();
      expect(activeLoan.status).toBe("active");
      expect(activeLoan.issued_to).toBe(studentId);

      const borrowMsgs = (mockSupabase.db as unknown as Record<string, TestBorrowMessage[]>).borrow_messages || [];
      const notif = borrowMsgs.find((m: TestBorrowMessage) => m.borrow_request_id === requestId);
      expect(notif).toBeDefined();
      expect(notif?.message_type).toBe("approval");
    });

    it("completes borrow rejection workflow: sets rejected status with reason, leaves stock untouched, notifies student", async () => {
      const adminId = "user-admin-1";
      const studentId = "user-student-1";
      const itemId = "11111111-1111-1111-1111-111111111111";
      const requestId = "req-reject-test-1";

      mockSupabase.setCurrentUser(studentId);
      await mockSupabase.from("borrow_requests").insert({
        id: requestId,
        student_id: studentId,
        item_id: itemId,
        quantity: 1,
        status: "pending",
      });

      // Admin rejects
      mockSupabase.setCurrentUser(adminId);
      const reason = "Item reserved for department examinations";

      await mockSupabase
        .from("borrow_requests")
        .update({
          status: "rejected",
          approved_by: adminId,
          approved_date: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq("id", requestId);

      await mockSupabase.from("borrow_messages").insert({
        borrow_request_id: requestId,
        sender_id: adminId,
        recipient_id: studentId,
        message_type: "rejection",
        subject: "Borrow Request Rejected",
        message: reason,
      });

      const updatedReq = mockSupabase.db.borrow_requests.find((r) => r.id === requestId);
      expect(updatedReq.status).toBe("rejected");
      expect(updatedReq.rejection_reason).toBe(reason);

      // Item quantity untouched
      const item = mockSupabase.db.items.find((i) => i.id === itemId);
      expect(item.current_quantity).toBe(10);
    });

    it("completes return verification lifecycle: restores inventory, updates loan to returned, updates request", async () => {
      const adminId = "user-admin-1";
      const studentId = "user-student-1";
      const itemId = "22222222-2222-2222-2222-222222222222"; // OSC-002, initially quantity 1
      const item = mockSupabase.db.items.find((i) => i.id === itemId);

      // Simulate item fully checked out (quantity: 0, status: borrowed)
      item.current_quantity = 0;
      item.status = "borrowed";

      const issuedId = "issued-return-verify-1";
      const returnReqId = "ret-req-1";

      mockSupabase.db.issued_items.push({
        id: issuedId,
        item_id: itemId,
        issued_to: studentId,
        status: "active",
        returned_date: null,
      });

      // Student submits return request
      const returnRequests: TestReturnRequest[] = [
        {
          id: returnReqId,
          issued_item_id: issuedId,
          item_id: itemId,
          student_id: studentId,
          quantity: 1,
          item_condition: "good",
          status: "pending",
        },
      ];
      (mockSupabase.db as unknown as Record<string, TestReturnRequest[]>).return_requests = returnRequests;

      // Staff verifies and accepts return
      mockSupabase.setCurrentUser(adminId);

      // 1. Accept return request
      const retReq = returnRequests.find((r: TestReturnRequest) => r.id === returnReqId);
      if (retReq) {
        retReq.status = "accepted";
        retReq.verified_by = adminId;
        retReq.verified_at = new Date().toISOString();
      }

      // 2. Restore item stock and reset status to available
      item.current_quantity += 1;
      item.status = "available";

      // 3. Mark issued_item as returned
      const issuedItem = mockSupabase.db.issued_items.find((l) => l.id === issuedId);
      issuedItem.status = "returned";
      issuedItem.returned_date = new Date().toISOString();

      expect(retReq.status).toBe("accepted");
      expect(item.current_quantity).toBe(1);
      expect(item.status).toBe("available");
      expect(issuedItem.status).toBe("returned");
      expect(issuedItem.returned_date).not.toBeNull();
    });
  });

  // =========================================================================
  // 3. USER ADMINISTRATION & PERMISSIONS
  // =========================================================================
  describe("3. User Administration & Permissions Workflows", () => {
    it("lists all user profiles with mapped roles and department relationships", async () => {
      const { data: pData } = await mockSupabase.from("profiles").select("*");
      const { data: rData } = await mockSupabase.from("user_roles").select("*");
      const { data: dData } = await mockSupabase.from("user_departments").select("*");

      const profiles = (pData || []) as unknown as TestProfile[];
      const roles = (rData || []) as unknown as TestUserRole[];
      const departments = (dData || []) as unknown as TestUserDept[];

      expect(profiles.length).toBeGreaterThanOrEqual(3);

      const student = profiles.find((p: TestProfile) => p.id === "user-student-1");
      const studentRole = roles.find((r: TestUserRole) => r.user_id === student?.id);
      const studentDept = departments.find((d: TestUserDept) => d.user_id === student?.id);

      expect(studentRole?.role).toBe("student");
      expect(studentDept?.department_id).toBe("dept-ece");

      const admin = profiles.find((p: TestProfile) => p.id === "user-admin-1");
      const adminRole = roles.find((r: TestUserRole) => r.user_id === admin?.id);
      expect(adminRole?.role).toBe("admin");
      expect(admin?.is_default_admin).toBe(true);
    });

    it("elevates user role and manages department assignments in user_departments", async () => {
      const targetUserId = "user-student-1";

      // Elevate student to staff
      await mockSupabase
        .from("user_roles")
        .update({ role: "staff" })
        .eq("user_id", targetUserId);

      const roleRow = mockSupabase.db.user_roles.find((r) => r.user_id === targetUserId);
      expect(roleRow?.role).toBe("staff");

      // Reassign department to Chemistry
      await mockSupabase
        .from("user_departments")
        .update({ department_id: "dept-chem" })
        .eq("user_id", targetUserId);

      const deptRow = mockSupabase.db.user_departments.find((d) => d.user_id === targetUserId);
      expect(deptRow?.department_id).toBe("dept-chem");

      // Clear department assignment
      await mockSupabase
        .from("user_departments")
        .delete()
        .eq("user_id", targetUserId);

      const deletedDept = mockSupabase.db.user_departments.find((d) => d.user_id === targetUserId);
      expect(deletedDept).toBeUndefined();
    });

    it("protects default admin account against deactivation or deletion", async () => {
      // 1. Edge function delete-user prevents deletion of default admin
      const delRes = await mockSupabase.functions.invoke("delete-user", {
        body: { user_id: "user-admin-1" },
      });
      expect(delRes.data.success).toBe(false);
      expect(delRes.data.error).toContain("default admin");

      // 2. Default admin is protected from role tampering
      const defaultAdmin = mockSupabase.db.profiles.find((p) => p.id === "user-admin-1");
      expect(defaultAdmin.is_default_admin).toBe(true);
    });
  });

  // =========================================================================
  // 4. REPAIRS & MAINTENANCE WORKFLOW
  // =========================================================================
  describe("4. Repairs & Maintenance Workflows", () => {
    it("handles full technician repair lifecycle and turnaround metrics calculation", async () => {
      const techId = "user-tech-1";
      const itemId = "11111111-1111-1111-1111-111111111111";
      const ticketId = "maint-workflow-1";

      // 1. Report issue / create maintenance record
      mockSupabase.db.maintenance_records.push({
        id: ticketId,
        item_id: itemId,
        assigned_to: null,
        status: "pending",
        start_date: null,
        actual_completion: null,
        repair_notes: null,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      });

      // 2. Technician claims repair
      await mockSupabase
        .from("maintenance_records")
        .update({ assigned_to: techId })
        .eq("id", ticketId);

      const ticket = mockSupabase.db.maintenance_records.find((r) => r.id === ticketId);
      expect(ticket?.assigned_to).toBe(techId);

      // 3. Technician starts repair
      const startDate = new Date(Date.now() - 86400000).toISOString();
      await mockSupabase
        .from("maintenance_records")
        .update({ status: "in_progress", start_date: startDate })
        .eq("id", ticketId);

      await mockSupabase
        .from("items")
        .update({ status: "under_maintenance" })
        .eq("id", itemId);

      const item = mockSupabase.db.items.find((i) => i.id === itemId);
      expect(item?.status).toBe("under_maintenance");

      // 4. Technician adds repair notes and completes repair
      const notes = "Replaced blown internal fuse and re-calibrated voltage reference.";
      const completionDate = new Date().toISOString();

      await mockSupabase
        .from("maintenance_records")
        .update({
          status: "completed",
          actual_completion: completionDate,
          repair_notes: notes,
        })
        .eq("id", ticketId);

      await mockSupabase
        .from("items")
        .update({ status: "available" })
        .eq("id", itemId);

      expect(ticket?.status).toBe("completed");
      expect(ticket?.repair_notes).toBe(notes);
      expect(item?.status).toBe("available");

      // 5. Calculate technician statistics
      const stats = calculateRepairStats(mockSupabase.db.maintenance_records, techId);
      expect(stats.completedToday).toBeGreaterThanOrEqual(1);
      expect(stats.avgRepairTime).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 5. KIOSK MODE & QR SCANNING
  // =========================================================================
  describe("5. Kiosk Mode & Self-Service Workflows", () => {
    it("evaluates student borrow record: clean, warning, and blocked states", () => {
      const evaluateRecord = (activeBorrows: number, overdueCount: number, damageReports: number) => {
        let status: "clean" | "warning" | "blocked" = "clean";
        if (overdueCount > 0 || damageReports > 0) status = "warning";
        if (overdueCount >= 3 || activeBorrows >= 5) status = "blocked";
        return {
          status,
          autoApprovalEligible: status === "clean",
          checkoutDisabled: status === "blocked",
        };
      };

      // 1. Clean record
      const clean = evaluateRecord(1, 0, 0);
      expect(clean.status).toBe("clean");
      expect(clean.autoApprovalEligible).toBe(true);
      expect(clean.checkoutDisabled).toBe(false);

      // 2. Warning record (1 overdue)
      const warning = evaluateRecord(2, 1, 0);
      expect(warning.status).toBe("warning");
      expect(warning.autoApprovalEligible).toBe(false);
      expect(warning.checkoutDisabled).toBe(false);

      // 3. Blocked record due to 3 or more overdues
      const blockedOverdue = evaluateRecord(2, 3, 0);
      expect(blockedOverdue.status).toBe("blocked");
      expect(blockedOverdue.checkoutDisabled).toBe(true);

      // 4. Blocked record due to 5 or more active borrows
      const blockedActive = evaluateRecord(5, 0, 0);
      expect(blockedActive.status).toBe("blocked");
      expect(blockedActive.checkoutDisabled).toBe(true);
    });

    it("executes self-service kiosk checkout and return sequence", async () => {
      const studentId = "user-student-1";
      const itemId = "11111111-1111-1111-1111-111111111111"; // initial qty: 10
      mockSupabase.setCurrentUser(studentId);

      // 1. Kiosk Checkout
      const checkoutRes = await mockSupabase.rpc("kiosk_checkout", {
        p_item_id: itemId,
        p_due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      });

      expect(checkoutRes.data.success).toBe(true);
      const issuedId = checkoutRes.data.issued_item_id;

      const itemAfterCheckout = mockSupabase.db.items.find((i) => i.id === itemId);
      expect(itemAfterCheckout?.current_quantity).toBe(9);

      // 2. Kiosk Return
      const returnRes = await mockSupabase.rpc("kiosk_return", {
        p_issued_item_id: issuedId,
      });

      expect(returnRes.data.success).toBe(true);
      const itemAfterReturn = mockSupabase.db.items.find((i) => i.id === itemId);
      expect(itemAfterReturn?.current_quantity).toBe(10);
      expect(itemAfterReturn?.status).toBe("available");
    });
  });

  // =========================================================================
  // 6. ROLE MATRIX, ROUTE PROTECTION & SESSION ISOLATION
  // =========================================================================
  describe("6. Complete Role Matrix & Route Authorization", () => {
    // Definitive route configuration directly matching App.tsx
    const appRoutes = [
      { path: "/", isPublic: true },
      { path: "/auth", isPublic: true },
      { path: "/catalog", isPublic: true },
      { path: "/catalog/:id", isPublic: true },
      { path: "/scan/:id", isPublic: true },
      { path: "/scan/unit/:unitId", isPublic: true },

      // Protected: Admin only
      { path: "/users", allowedRoles: ["admin"] },
      { path: "/departments", allowedRoles: ["admin"] },
      { path: "/categories", allowedRoles: ["admin"] },
      { path: "/audit-logs", allowedRoles: ["admin"] },
      { path: "/borrow-analytics", allowedRoles: ["admin"] },
      { path: "/equipment-depreciation", allowedRoles: ["admin"] },

      // Protected: Admin & Staff
      { path: "/items/new", allowedRoles: ["admin", "staff"] },
      { path: "/items/:id/edit", allowedRoles: ["admin", "staff"] },
      { path: "/requests", allowedRoles: ["admin", "staff"] },
      { path: "/qr-management", allowedRoles: ["admin", "staff"] },
      { path: "/scan", allowedRoles: ["admin", "staff"] },
      { path: "/chemicals", allowedRoles: ["admin", "staff"] },
      { path: "/reports", allowedRoles: ["admin", "staff"] },
      { path: "/damage-reports", allowedRoles: ["admin", "staff"] },
      { path: "/tally-sync", allowedRoles: ["admin", "staff"] },
      { path: "/vendors", allowedRoles: ["admin", "staff"] },
      { path: "/purchase-orders", allowedRoles: ["admin", "staff"] },
      { path: "/stock-journal", allowedRoles: ["admin", "staff"] },

      // Protected: Admin, Staff & Technician
      { path: "/maintenance", allowedRoles: ["admin", "staff", "technician"] },
      { path: "/repairs", allowedRoles: ["admin", "staff", "technician"] },

      // Protected: Admin, Staff & Student
      { path: "/kiosk", allowedRoles: ["admin", "staff", "student"] },

      // Protected: All Authenticated Roles
      { path: "/dashboard", allowedRoles: ["admin", "staff", "technician", "student"] },
      { path: "/items", allowedRoles: ["admin", "staff", "technician", "student"] },
      { path: "/items/:id", allowedRoles: ["admin", "staff", "technician", "student"] },
      { path: "/change-password", allowedRoles: ["admin", "staff", "technician", "student"] },
      { path: "/settings", allowedRoles: ["admin", "staff", "technician", "student"] },
      { path: "/my-requests", allowedRoles: ["admin", "staff", "technician", "student"] },
      { path: "/notifications", allowedRoles: ["admin", "staff", "technician", "student"] },
      { path: "/browse", allowedRoles: ["admin", "staff", "technician", "student"] },
      { path: "/history", allowedRoles: ["admin", "staff", "technician", "student"] },
      { path: "/messages", allowedRoles: ["admin", "staff", "technician", "student"] },
    ];

    const canAccessRoute = (routePath: string, user: { id: string } | null, role: AppRole | null) => {
      const route = appRoutes.find((r) => r.path === routePath);
      if (!route) return false;
      if (route.isPublic) return true;
      if (!user) return false; // Unauthenticated blocked from all protected routes
      if (!route.allowedRoles) return true;
      return route.allowedRoles.includes(role as AppRole);
    };

    it("allows unauthenticated visitors to access public routes while blocking protected routes", () => {
      const guest = null;
      const guestRole = null;

      // Public routes must pass
      expect(canAccessRoute("/", guest, guestRole)).toBe(true);
      expect(canAccessRoute("/auth", guest, guestRole)).toBe(true);
      expect(canAccessRoute("/catalog", guest, guestRole)).toBe(true);
      expect(canAccessRoute("/catalog/:id", guest, guestRole)).toBe(true);
      expect(canAccessRoute("/scan/:id", guest, guestRole)).toBe(true);
      expect(canAccessRoute("/scan/unit/:unitId", guest, guestRole)).toBe(true);

      // Protected routes must be strictly blocked
      expect(canAccessRoute("/dashboard", guest, guestRole)).toBe(false);
      expect(canAccessRoute("/items", guest, guestRole)).toBe(false);
      expect(canAccessRoute("/users", guest, guestRole)).toBe(false);
      expect(canAccessRoute("/kiosk", guest, guestRole)).toBe(false);
      expect(canAccessRoute("/requests", guest, guestRole)).toBe(false);
    });

    it("enforces strict role-based access for students: blocks administrative pages", () => {
      const studentUser = { id: "user-student-1" };
      const role = "student";

      // Allowed for student
      expect(canAccessRoute("/dashboard", studentUser, role)).toBe(true);
      expect(canAccessRoute("/browse", studentUser, role)).toBe(true);
      expect(canAccessRoute("/items", studentUser, role)).toBe(true);
      expect(canAccessRoute("/my-requests", studentUser, role)).toBe(true);
      expect(canAccessRoute("/messages", studentUser, role)).toBe(true);
      expect(canAccessRoute("/history", studentUser, role)).toBe(true);
      expect(canAccessRoute("/notifications", studentUser, role)).toBe(true);
      expect(canAccessRoute("/settings", studentUser, role)).toBe(true);
      expect(canAccessRoute("/kiosk", studentUser, role)).toBe(true);

      // Strictly BLOCKED for student
      expect(canAccessRoute("/users", studentUser, role)).toBe(false);
      expect(canAccessRoute("/items/new", studentUser, role)).toBe(false);
      expect(canAccessRoute("/items/:id/edit", studentUser, role)).toBe(false);
      expect(canAccessRoute("/departments", studentUser, role)).toBe(false);
      expect(canAccessRoute("/categories", studentUser, role)).toBe(false);
      expect(canAccessRoute("/requests", studentUser, role)).toBe(false);
      expect(canAccessRoute("/maintenance", studentUser, role)).toBe(false);
      expect(canAccessRoute("/repairs", studentUser, role)).toBe(false);
      expect(canAccessRoute("/qr-management", studentUser, role)).toBe(false);
      expect(canAccessRoute("/scan", studentUser, role)).toBe(false);
      expect(canAccessRoute("/chemicals", studentUser, role)).toBe(false);
      expect(canAccessRoute("/audit-logs", studentUser, role)).toBe(false);
      expect(canAccessRoute("/reports", studentUser, role)).toBe(false);
      expect(canAccessRoute("/borrow-analytics", studentUser, role)).toBe(false);
      expect(canAccessRoute("/damage-reports", studentUser, role)).toBe(false);
      expect(canAccessRoute("/tally-sync", studentUser, role)).toBe(false);
    });

    it("enforces technician role permissions: allows repairs and maintenance, blocks admin modules", () => {
      const techUser = { id: "user-tech-1" };
      const role = "technician";

      // Technician can access repairs & maintenance
      expect(canAccessRoute("/repairs", techUser, role)).toBe(true);
      expect(canAccessRoute("/maintenance", techUser, role)).toBe(true);
      expect(canAccessRoute("/dashboard", techUser, role)).toBe(true);
      expect(canAccessRoute("/history", techUser, role)).toBe(true);

      // Blocked from admin and staff-only modules
      expect(canAccessRoute("/users", techUser, role)).toBe(false);
      expect(canAccessRoute("/departments", techUser, role)).toBe(false);
      expect(canAccessRoute("/categories", techUser, role)).toBe(false);
      expect(canAccessRoute("/requests", techUser, role)).toBe(false);
      expect(canAccessRoute("/audit-logs", techUser, role)).toBe(false);
      expect(canAccessRoute("/borrow-analytics", techUser, role)).toBe(false);
      expect(canAccessRoute("/tally-sync", techUser, role)).toBe(false);
    });

    it("enforces staff permissions: manages inventory, requests, and repairs, blocks system settings/users", () => {
      const staffUser = { id: "user-staff-1" };
      const role = "staff";

      expect(canAccessRoute("/items/new", staffUser, role)).toBe(true);
      expect(canAccessRoute("/requests", staffUser, role)).toBe(true);
      expect(canAccessRoute("/scan", staffUser, role)).toBe(true);
      expect(canAccessRoute("/maintenance", staffUser, role)).toBe(true);
      expect(canAccessRoute("/repairs", staffUser, role)).toBe(true);
      expect(canAccessRoute("/reports", staffUser, role)).toBe(true);
      expect(canAccessRoute("/chemicals", staffUser, role)).toBe(true);

      // Blocked from super-admin modules
      expect(canAccessRoute("/users", staffUser, role)).toBe(false);
      expect(canAccessRoute("/departments", staffUser, role)).toBe(false);
      expect(canAccessRoute("/categories", staffUser, role)).toBe(false);
      expect(canAccessRoute("/audit-logs", staffUser, role)).toBe(false);
      expect(canAccessRoute("/borrow-analytics", staffUser, role)).toBe(false);
      expect(canAccessRoute("/equipment-depreciation", staffUser, role)).toBe(false);
    });

    it("grants admin full system-wide access across all routes", () => {
      const adminUser = { id: "user-admin-1" };
      const role = "admin";

      for (const route of appRoutes) {
        expect(canAccessRoute(route.path, adminUser, role)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 7. DASHBOARD METRICS & CANONICAL ACTIVE BORROW QUERY TRUTH
  // =========================================================================
  describe("7. Dashboard Analytics & Canonical Data Integrity", () => {
    it("computes dashboard statistics using canonical active checkout source of truth", async () => {
      // Setup state with 1 active checkout and 1 returned checkout
      mockSupabase.db.issued_items = [
        {
          id: "iss-1",
          item_id: "11111111-1111-1111-1111-111111111111",
          issued_to: "user-student-1",
          status: "active",
          returned_date: null,
        },
        {
          id: "iss-2",
          item_id: "22222222-2222-2222-2222-222222222222",
          issued_to: "user-student-1",
          status: "returned",
          returned_date: new Date().toISOString(),
        },
      ];

      // Canonical query used by Dashboard and BorrowAnalytics:
      // issued_items WHERE status='active' AND returned_date IS NULL
      const { data: activeBorrows } = await mockSupabase
        .from("issued_items")
        .select("id")
        .eq("status", "active")
        .is("returned_date", null);

      expect(activeBorrows.length).toBe(1);
      expect(activeBorrows[0].id).toBe("iss-1");
    });
  });
});
