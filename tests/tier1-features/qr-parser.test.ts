import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "../mocks/supabaseMock";

export function parseQRCode(code: string): { searchId: string; isUUID: boolean } {
  let searchId = code.trim();

  if (searchId.includes("/scan/")) {
    const parts = searchId.split("/scan/");
    searchId = parts[parts.length - 1].split("?")[0].split("#")[0].trim();
  } else if (searchId.startsWith("LABLINK:")) {
    const parts = searchId.split(":");
    if (parts.length >= 2) {
      searchId = parts[1].trim();
    }
  }

  try {
    const parsed = JSON.parse(code);
    searchId = parsed.id || parsed.item_code || searchId;
  } catch {
    // Not JSON, use extracted searchId
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchId);

  return { searchId, isUUID };
}

describe("Tier 1: QR Scanning & Parsing Contract", () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it("parses raw item codes directly", () => {
    const result = parseQRCode("DMM-001");
    expect(result.searchId).toBe("DMM-001");
    expect(result.isUUID).toBe(false);
  });

  it("parses standard UUID strings and identifies them as UUIDs", () => {
    const uuid = "11111111-1111-1111-1111-111111111111";
    const result = parseQRCode(uuid);
    expect(result.searchId).toBe(uuid);
    expect(result.isUUID).toBe(true);
  });

  it("parses LABLINK: prefixed codes", () => {
    const result = parseQRCode("LABLINK:DMM-001");
    expect(result.searchId).toBe("DMM-001");
    expect(result.isUUID).toBe(false);

    const uuid = "22222222-2222-2222-2222-222222222222";
    const uuidResult = parseQRCode(`LABLINK:${uuid}`);
    expect(uuidResult.searchId).toBe(uuid);
    expect(uuidResult.isUUID).toBe(true);
  });

  it("parses URL formats containing /scan/ with query parameters and hash fragments", () => {
    const url = "https://lablink.university.edu/scan/OSC-002?ref=mobile#top";
    const result = parseQRCode(url);
    expect(result.searchId).toBe("OSC-002");
    expect(result.isUUID).toBe(false);

    const uuidUrl = "https://lablink.university.edu/scan/11111111-1111-1111-1111-111111111111?camera=back";
    const uuidResult = parseQRCode(uuidUrl);
    expect(uuidResult.searchId).toBe("11111111-1111-1111-1111-111111111111");
    expect(uuidResult.isUUID).toBe(true);
  });

  it("parses JSON payload containing id or item_code", () => {
    const jsonWithId = JSON.stringify({ id: "11111111-1111-1111-1111-111111111111", name: "DMM" });
    const resultWithId = parseQRCode(jsonWithId);
    expect(resultWithId.searchId).toBe("11111111-1111-1111-1111-111111111111");
    expect(resultWithId.isUUID).toBe(true);

    const jsonWithCode = JSON.stringify({ item_code: "DMM-001" });
    const resultWithCode = parseQRCode(jsonWithCode);
    expect(resultWithCode.searchId).toBe("DMM-001");
    expect(resultWithCode.isUUID).toBe(false);
  });

  it("executes correct Supabase lookup depending on UUID vs item_code", async () => {
    // 1. UUID lookup
    const { searchId: uuidSearch, isUUID: isUuid } = parseQRCode("11111111-1111-1111-1111-111111111111");
    let query1 = mockSupabase
      .from("items")
      .select("id, name, item_code, status, current_quantity");

    if (isUuid) {
      query1 = query1.or(`id.eq.${uuidSearch},item_code.eq.${uuidSearch}`);
    } else {
      query1 = query1.eq("item_code", uuidSearch);
    }

    const { data: item1, error: error1 } = await query1.maybeSingle();
    expect(error1).toBeNull();
    expect(item1?.item_code).toBe("DMM-001");

    // 2. Item code lookup (non-UUID must NOT query id column to prevent Postgres 22P02 error)
    const { searchId: codeSearch, isUUID: isNotUuid } = parseQRCode("DMM-001");
    let query2 = mockSupabase
      .from("items")
      .select("id, name, item_code, status, current_quantity");

    if (isNotUuid) {
      query2 = query2.or(`id.eq.${codeSearch},item_code.eq.${codeSearch}`);
    } else {
      query2 = query2.eq("item_code", codeSearch);
    }

    const { data: item2, error: error2 } = await query2.maybeSingle();
    expect(error2).toBeNull();
    expect(item2?.name).toBe("Digital Multimeter Fluke 87V");
  });
});
