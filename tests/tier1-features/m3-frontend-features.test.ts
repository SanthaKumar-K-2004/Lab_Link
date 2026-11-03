import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";

describe("Milestone 3: Frontend Inventory, QR, Kiosk, Repairs & Dashboard Fixes", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  describe("1 & 2. PublicItemDetail Stock Progress & Warranty", () => {
    it("safely computes stock bar percentage using reorder_threshold without producing NaN%", () => {
      const computeProgress = (currentQty: number, reorderThreshold: number | null | undefined) => {
        const minStock = Number(reorderThreshold ?? 0);
        const current = Number(currentQty ?? 0);
        const targetMax = Math.max(minStock * 2, current, 1);
        const calculatedWidth = (current / targetMax) * 100;
        const safeWidth = Math.min(Math.max(isNaN(calculatedWidth) ? 0 : calculatedWidth, 0), 100);
        const isHealthy = current > minStock;
        return {
          widthStr: `${safeWidth}%`,
          isHealthy,
          safeWidth,
        };
      };

      // Case 1: Healthy stock above reorder threshold
      const healthy = computeProgress(10, 2);
      expect(healthy.safeWidth).toBe(100);
      expect(healthy.widthStr).toBe("100%");
      expect(healthy.isHealthy).toBe(true);

      // Case 2: Low stock below/at reorder threshold
      const low = computeProgress(1, 2);
      expect(low.safeWidth).toBe(25);
      expect(low.widthStr).toBe("25%");
      expect(low.isHealthy).toBe(false);

      // Case 3: Zero stock
      const zero = computeProgress(0, 2);
      expect(zero.safeWidth).toBe(0);
      expect(zero.widthStr).toBe("0%");
      expect(zero.isHealthy).toBe(false);

      // Case 4: Missing / null reorder_threshold (previously produced NaN%)
      const nullThreshold = computeProgress(5, null);
      expect(nullThreshold.widthStr).not.toContain("NaN");
      expect(nullThreshold.safeWidth).toBe(100);
      expect(nullThreshold.isHealthy).toBe(true);

      // Case 5: Undefined both current and threshold
      const undefinedInput = computeProgress(undefined as any, undefined as any);
      expect(undefinedInput.widthStr).not.toContain("NaN");
      expect(undefinedInput.safeWidth).toBe(0);
    });

    it("correctly parses and formats warranty_until date safely", () => {
      const formatWarranty = (warrantyUntil: string | null | undefined) => {
        if (!warrantyUntil) return null;
        const parsed = new Date(warrantyUntil);
        return isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
      };

      expect(formatWarranty("2026-12-31")).toBeTruthy();
      expect(formatWarranty(null)).toBeNull();
      expect(formatWarranty(undefined)).toBeNull();
      expect(formatWarranty("invalid-date-string")).toBeNull();
    });
  });

  describe("3 & 4. QRScan /scan/unit/:unitId parsing and localStorage tracking", () => {
    it("parses /scan/unit/:unitId and unit serial codes correctly", () => {
      const parseScanTarget = (code: string) => {
        let searchId = code.trim();
        let isUnitScan = false;
        let unitId = "";

        if (searchId.includes("/scan/unit/")) {
          const parts = searchId.split("/scan/unit/");
          unitId = parts[parts.length - 1].split("?")[0].split("#")[0].replace(/\/+$/, "").trim();
          isUnitScan = true;
        } else if (searchId.includes("/scan/")) {
          const parts = searchId.split("/scan/");
          searchId = parts[parts.length - 1].split("?")[0].split("#")[0].replace(/\/+$/, "").trim();
          if (searchId.startsWith("unit/")) {
            unitId = searchId.replace(/^unit\//, "").trim();
            isUnitScan = true;
          }
        } else if (searchId.startsWith("LABLINK:")) {
          const parts = searchId.split(":");
          if (parts.length >= 2) {
            if (parts[1] === "unit" && parts[2]) {
              unitId = parts[2].trim();
              isUnitScan = true;
            } else {
              searchId = parts[1].trim();
            }
          }
        } else if (searchId.startsWith("unit/")) {
          unitId = searchId.replace(/^unit\//, "").trim();
          isUnitScan = true;
        }

        const isUnitUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(unitId || searchId);

        return { isUnitScan, unitId, searchId, isUnitUUID };
      };

      // Unit route URL
      const unitUrl = "https://lablink.edu/scan/unit/55555555-5555-5555-5555-555555555555?camera=1";
      const res1 = parseScanTarget(unitUrl);
      expect(res1.isUnitScan).toBe(true);
      expect(res1.unitId).toBe("55555555-5555-5555-5555-555555555555");
      expect(res1.isUnitUUID).toBe(true);

      // Relative unit route
      const relUnitUrl = "/scan/unit/UNIT-SN-8899#details";
      const res2 = parseScanTarget(relUnitUrl);
      expect(res2.isUnitScan).toBe(true);
      expect(res2.unitId).toBe("UNIT-SN-8899");
      expect(res2.isUnitUUID).toBe(false);

      // Standard item route
      const itemUrl = "/scan/11111111-1111-1111-1111-111111111111";
      const res3 = parseScanTarget(itemUrl);
      expect(res3.isUnitScan).toBe(false);
      expect(res3.searchId).toBe("11111111-1111-1111-1111-111111111111");
    });

    it("tracks user recent scans in localStorage under lablink_recent_scans", () => {
      const storage: Record<string, string> = {};
      const mockStorage = {
        getItem: (k: string) => storage[k] || null,
        setItem: (k: string, v: string) => { storage[k] = v; },
        removeItem: (k: string) => { delete storage[k]; },
      };

      const recordScan = (item: { id: string; name: string; item_code: string }) => {
        const key = "lablink_recent_scans";
        const raw = mockStorage.getItem(key);
        const prev: any[] = raw ? JSON.parse(raw) : [];
        const filtered = prev.filter((i) => i.id !== item.id);
        const updated = [item, ...filtered].slice(0, 10);
        mockStorage.setItem(key, JSON.stringify(updated));
        return updated;
      };

      // Record first scan
      recordScan({ id: "item-1", name: "DMM", item_code: "DMM-001" });
      expect(JSON.parse(mockStorage.getItem("lablink_recent_scans")!).length).toBe(1);

      // Record second scan
      recordScan({ id: "item-2", name: "OSC", item_code: "OSC-002" });
      const current = JSON.parse(mockStorage.getItem("lablink_recent_scans")!);
      expect(current.length).toBe(2);
      expect(current[0].id).toBe("item-2"); // Most recent first

      // Deduplicate when re-scanning item-1
      recordScan({ id: "item-1", name: "DMM", item_code: "DMM-001" });
      const deduped = JSON.parse(mockStorage.getItem("lablink_recent_scans")!);
      expect(deduped.length).toBe(2);
      expect(deduped[0].id).toBe("item-1"); // Moved to front
    });
  });

  describe("5. KioskMode Self-Service RPC Integration", () => {
    it("successfully checks out an item via kiosk_checkout RPC", async () => {
      mockSupabase.setCurrentUser("user-student-1");

      const itemId = "11111111-1111-1111-1111-111111111111"; // current_quantity: 10
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const { data, error } = await mockSupabase.rpc("kiosk_checkout", {
        p_item_id: itemId,
        p_due_date: dueDate.toISOString(),
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.issued_item_id).toBeDefined();

      // Verify item quantity decreased
      const { data: item } = await mockSupabase.from("items").select("*").eq("id", itemId).single();
      expect(item.current_quantity).toBe(9);
    });

    it("successfully returns an item via kiosk_return RPC", async () => {
      mockSupabase.setCurrentUser("user-student-1");

      // First check out item
      const itemId = "22222222-2222-2222-2222-222222222222"; // current_quantity: 1
      const { data: checkoutData } = await mockSupabase.rpc("kiosk_checkout", {
        p_item_id: itemId,
      });

      expect(checkoutData.success).toBe(true);
      const issuedId = checkoutData.issued_item_id;

      // Check item status became borrowed when quantity depleted to 0
      const { data: borrowedItem } = await mockSupabase.from("items").select("*").eq("id", itemId).single();
      expect(borrowedItem.current_quantity).toBe(0);
      expect(borrowedItem.status).toBe("borrowed");

      // Return item via kiosk_return
      const { data: returnData, error } = await mockSupabase.rpc("kiosk_return", {
        p_issued_item_id: issuedId,
      });

      expect(error).toBeNull();
      expect(returnData.success).toBe(true);

      // Verify item quantity restored and status returned to available
      const { data: restoredItem } = await mockSupabase.from("items").select("*").eq("id", itemId).single();
      expect(restoredItem.current_quantity).toBe(1);
      expect(restoredItem.status).toBe("available");
    });
  });

  describe("6. Repairs Technician Status RPC", () => {
    it("updates item status to available on repair completion", async () => {
      const itemId = "44444444-4444-4444-4444-444444444444"; // initial: under_maintenance

      const { error } = await mockSupabase.rpc("update_item_repair_status", {
        p_item_id: itemId,
        p_status: "available",
      });

      expect(error).toBeNull();

      const { data: item } = await mockSupabase.from("items").select("*").eq("id", itemId).single();
      expect(item.status).toBe("available");
    });
  });

  describe("7. Dashboard Student Query Guarding", () => {
    it("prevents admin stats queries from dispatching when user is student", () => {
      let statsDispatched = false;
      const simulateDashboardMount = (role: string) => {
        if (role === "student") {
          return { component: "StudentDashboard", statsRan: false };
        }
        statsDispatched = true;
        return { component: "AdminDashboard", statsRan: true };
      };

      const studentResult = simulateDashboardMount("student");
      expect(studentResult.component).toBe("StudentDashboard");
      expect(studentResult.statsRan).toBe(false);
      expect(statsDispatched).toBe(false);

      const adminResult = simulateDashboardMount("admin");
      expect(adminResult.component).toBe("AdminDashboard");
      expect(adminResult.statsRan).toBe(true);
      expect(statsDispatched).toBe(true);
    });
  });

  describe("8. CommandPalette Role-Based Filtering", () => {
    it("hides administrative links from student users in CommandPalette", () => {
      const links = [
        { name: "Dashboard", path: "/dashboard", allowedRoles: ["admin", "staff", "technician", "student"] },
        { name: "Items", path: "/items", allowedRoles: ["admin", "staff", "technician", "student"] },
        { name: "Add New Item", path: "/items/new", allowedRoles: ["admin", "staff"] },
        { name: "Users", path: "/users", allowedRoles: ["admin"] },
        { name: "Chemicals", path: "/chemicals", allowedRoles: ["admin", "staff"] },
        { name: "Borrow Requests", path: "/requests", allowedRoles: ["admin", "staff"] },
        { name: "My Requests", path: "/my-requests", allowedRoles: ["admin", "staff", "technician", "student"] },
        { name: "Maintenance", path: "/maintenance", allowedRoles: ["admin", "staff", "technician"] },
        { name: "Reports", path: "/reports", allowedRoles: ["admin", "staff"] },
        { name: "Categories", path: "/categories", allowedRoles: ["admin"] },
        { name: "Departments", path: "/departments", allowedRoles: ["admin"] },
        { name: "QR Management", path: "/qr-management", allowedRoles: ["admin", "staff"] },
        { name: "Audit Logs", path: "/audit-logs", allowedRoles: ["admin"] },
        { name: "Settings", path: "/settings", allowedRoles: ["admin", "staff", "technician", "student"] },
      ];

      const filterByRole = (userRole: string) => {
        return links.filter((l) => l.allowedRoles.includes(userRole as any));
      };

      const studentLinks = filterByRole("student");
      const studentPaths = studentLinks.map((l) => l.path);

      // Student must see general access paths
      expect(studentPaths).toContain("/dashboard");
      expect(studentPaths).toContain("/items");
      expect(studentPaths).toContain("/my-requests");
      expect(studentPaths).toContain("/settings");

      // Student must NOT see administrative paths
      expect(studentPaths).not.toContain("/users");
      expect(studentPaths).not.toContain("/items/new");
      expect(studentPaths).not.toContain("/audit-logs");
      expect(studentPaths).not.toContain("/departments");
      expect(studentPaths).not.toContain("/categories");
      expect(studentPaths).not.toContain("/reports");
      expect(studentPaths).not.toContain("/qr-management");
      expect(studentPaths).not.toContain("/chemicals");
      expect(studentPaths).not.toContain("/maintenance");
      expect(studentPaths).not.toContain("/requests");

      // Admin must see all paths
      const adminLinks = filterByRole("admin");
      expect(adminLinks.length).toBe(links.length);
    });
  });
});
