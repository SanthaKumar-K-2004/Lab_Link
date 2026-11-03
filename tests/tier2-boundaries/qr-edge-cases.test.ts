import { describe, it, expect } from "vitest";
import { parseQRCode } from "../tier1-features/qr-parser.test";

describe("Tier 2: Boundary & Corner Cases — Adversarial QR Scan Inputs", () => {
  it("handles empty and whitespace-only QR strings safely", () => {
    const emptyResult = parseQRCode("");
    expect(emptyResult.searchId).toBe("");
    expect(emptyResult.isUUID).toBe(false);

    const whitespaceResult = parseQRCode("   \t  \n  ");
    expect(whitespaceResult.searchId).toBe("");
    expect(whitespaceResult.isUUID).toBe(false);
  });

  it("safely sanitizes URLs with multiple /scan/ segments and trailing slashes", () => {
    const multiSlashUrl = "https://lablink.university.edu/scan/foo/scan/bar/scan/DMM-001///?param=value#frag";
    const result = parseQRCode(multiSlashUrl);
    // Should take the last /scan/ segment and strip query/hash/trailing slashes
    expect(result.searchId.replace(/\/+$/, "")).toBe("DMM-001");
  });

  it("protects against SQL injection and meta-characters without false UUID classification", () => {
    const sqlInjections = [
      "' OR '1'='1",
      "'; DROP TABLE items; --",
      "11111111-1111-1111-1111-111111111111' OR 1=1--",
      "<script>alert('xss')</script>",
      "../../etc/passwd",
    ];

    for (const payload of sqlInjections) {
      const result = parseQRCode(payload);
      // Malicious strings must NOT be classified as valid UUIDs
      expect(result.isUUID).toBe(false);
    }
  });

  it("distinguishes hypenated item codes from valid RFC 4122 UUIDs", () => {
    const pseudoUuids = [
      "ITEM-1234-5678-ABCD",
      "11111111-1111-1111-1111", // Too short
      "11111111-1111-1111-1111-1111111111111", // Too long (13 chars in last group)
      "11111111-1111-1111-1111-11111111111g", // 'g' is non-hex
      "11111111_1111_1111_1111_111111111111", // underscores instead of hyphens
    ];

    for (const pseudo of pseudoUuids) {
      const result = parseQRCode(pseudo);
      expect(result.isUUID).toBe(false);
    }

    // Valid UUID format (case insensitive)
    const validUuids = [
      "11111111-1111-1111-1111-111111111111",
      "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE",
      "a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6",
    ];
    for (const valid of validUuids) {
      const result = parseQRCode(valid);
      expect(result.isUUID).toBe(true);
    }
  });

  it("handles malformed JSON payloads gracefully falling back to raw string", () => {
    const malformedJson = "{ id: 'unquoted', key: }";
    const result = parseQRCode(malformedJson);
    expect(result.searchId).toBe(malformedJson);
    expect(result.isUUID).toBe(false);

    const nonObjectJson = "[1, 2, 3]";
    const nonObjResult = parseQRCode(nonObjectJson);
    expect(nonObjResult.searchId).toBe(nonObjectJson);
  });

  it("handles extreme input lengths safely without crashing or hanging", () => {
    const longString = "A".repeat(10000);
    const result = parseQRCode(longString);
    expect(result.searchId.length).toBe(10000);
    expect(result.isUUID).toBe(false);
  });
});
