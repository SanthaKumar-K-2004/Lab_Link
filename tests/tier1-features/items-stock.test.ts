import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";

describe("Tier 1: Item Stock Logic & Categorization", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("fetches items with relational category and department metadata", async () => {
    const { data: items, error } = await mockSupabase
      .from("items")
      .select("id, name, item_code, status, current_quantity, category:categories(name), department:departments(name)");

    expect(error).toBeNull();
    expect(items).toBeDefined();
    expect(items.length).toBeGreaterThan(0);

    const dmm = items.find((i: any) => i.item_code === "DMM-001");
    expect(dmm).toBeDefined();
    expect(dmm.name).toBe("Digital Multimeter Fluke 87V");
    expect(dmm.category?.name).toBe("Electronics & Sensors");
    expect(dmm.department?.name).toBe("Electronics & Communication");
  });

  it("filters items by search query matching name or item code", async () => {
    const { data: allItems } = await mockSupabase.from("items").select("*");

    const searchQuery = "fluke";
    const filtered = allItems.filter(
      (item: any) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].item_code).toBe("DMM-001");

    // Search by code prefix
    const codeQuery = "OSC-";
    const codeFiltered = allItems.filter(
      (item: any) =>
        item.name.toLowerCase().includes(codeQuery.toLowerCase()) ||
        item.item_code.toLowerCase().includes(codeQuery.toLowerCase())
    );
    expect(codeFiltered.length).toBe(1);
    expect(codeFiltered[0].item_code).toBe("OSC-002");
  });

  it("filters items by category correctly", async () => {
    const { data: allItems } = await mockSupabase.from("items").select("*");

    const electronics = allItems.filter((item: any) => item.category_id === "cat-electronics");
    expect(electronics.length).toBe(2);
    expect(electronics.map((i: any) => i.item_code)).toEqual(["DMM-001", "OSC-002"]);

    const chemistry = allItems.filter((item: any) => item.category_id === "cat-chemistry");
    expect(chemistry.length).toBe(1);
    expect(chemistry[0].item_code).toBe("SPEC-003");
  });

  it("computes stock availability levels against reorder thresholds", () => {
    const computeStockLevel = (currentQty: number, threshold: number) => {
      if (currentQty <= 0) return "out_of_stock";
      if (currentQty <= threshold) return "low_stock";
      return "in_stock";
    };

    // Item with 10 stock, threshold 2 -> in_stock
    expect(computeStockLevel(10, 2)).toBe("in_stock");
    // Item with 2 stock, threshold 2 -> low_stock
    expect(computeStockLevel(2, 2)).toBe("low_stock");
    // Item with 1 stock, threshold 2 -> low_stock
    expect(computeStockLevel(1, 2)).toBe("low_stock");
    // Item with 0 stock, threshold 1 -> out_of_stock
    expect(computeStockLevel(0, 1)).toBe("out_of_stock");
  });

  it("validates condition categories and status states", async () => {
    const { data: allItems } = await mockSupabase.from("items").select("*");

    const validConditions = ["excellent", "good", "fair", "poor"];
    const validStatuses = ["available", "borrowed", "under_maintenance", "reserved"];

    for (const item of allItems) {
      expect(validConditions).toContain(item.condition);
      expect(validStatuses).toContain(item.status);
    }
  });
});
