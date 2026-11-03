import { describe, it, expect } from "vitest";

export function calculateStockProgressBarWidth(
  currentQuantity: number,
  reorderThreshold?: number | null
): number {
  const threshold = reorderThreshold ?? 0;
  const denominator = Math.max(threshold * 2, 1);
  const width = Math.min((currentQuantity / denominator) * 100, 100);
  return Number.isNaN(width) ? 0 : Math.max(0, width);
}

export function isItemOverdue(dueDateStr: string, returnedDateStr?: string | null): boolean {
  if (returnedDateStr) return false;
  const dueDate = new Date(dueDateStr);
  const now = new Date();
  return dueDate.getTime() < now.getTime();
}

export function getOverdueDays(dueDateStr: string, asOfDate: Date = new Date()): number {
  const due = new Date(dueDateStr);
  const diffMs = asOfDate.getTime() - due.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

describe("Tier 2: Boundary & Corner Cases — Dates, Numbers & NaN Safeguards", () => {
  describe("Stock Progress Bar Width Calculation (Feature #12 Safeguard)", () => {
    it("safely handles undefined or null reorder_threshold without producing NaN", () => {
      // Old bug: (item.current_quantity / Math.max(item.minimum_quantity * 2, 1)) produced NaN when minimum_quantity was undefined
      const widthUndefined = calculateStockProgressBarWidth(5, undefined);
      expect(Number.isNaN(widthUndefined)).toBe(false);
      expect(widthUndefined).toBe(100);

      const widthNull = calculateStockProgressBarWidth(5, null);
      expect(Number.isNaN(widthNull)).toBe(false);
      expect(widthNull).toBe(100);
    });

    it("safely handles zero quantity and zero threshold", () => {
      const widthZero = calculateStockProgressBarWidth(0, 0);
      expect(widthZero).toBe(0);
      expect(Number.isNaN(widthZero)).toBe(false);
    });

    it("caps width at 100% when current quantity exceeds double threshold", () => {
      const widthExceed = calculateStockProgressBarWidth(100, 2); // 100 / 4 * 100 = 2500% -> caps at 100%
      expect(widthExceed).toBe(100);
    });

    it("accurately computes fractional percentages for normal quantities", () => {
      // 2 in stock, threshold 2 -> denominator is 4 -> (2 / 4) * 100 = 50%
      const width = calculateStockProgressBarWidth(2, 2);
      expect(width).toBe(50);

      // 1 in stock, threshold 2 -> denominator is 4 -> (1 / 4) * 100 = 25%
      const widthQuarter = calculateStockProgressBarWidth(1, 2);
      expect(widthQuarter).toBe(25);
    });
  });

  describe("Overdue Date Calculations & Boundary Dates", () => {
    it("flags item as overdue when dueDate is strictly in the past and not returned", () => {
      const pastDueDate = new Date(Date.now() - 3 * 86400000).toISOString();
      expect(isItemOverdue(pastDueDate, null)).toBe(true);

      // If returned, never overdue
      const returnedDate = new Date().toISOString();
      expect(isItemOverdue(pastDueDate, returnedDate)).toBe(false);

      // Future due date is not overdue
      const futureDueDate = new Date(Date.now() + 5 * 86400000).toISOString();
      expect(isItemOverdue(futureDueDate, null)).toBe(false);
    });

    it("calculates exact overdue days across calendar boundaries", () => {
      const referenceNow = new Date("2026-03-01T12:00:00Z");
      // Leap year boundary: Feb 26, 2026 -> 3 days to March 1 (2026 is non-leap year: 28 days)
      const dueNonLeap = "2026-02-26T12:00:00Z";
      expect(getOverdueDays(dueNonLeap, referenceNow)).toBe(3);

      // 0 days overdue if due in future
      const dueFuture = "2026-03-05T12:00:00Z";
      expect(getOverdueDays(dueFuture, referenceNow)).toBe(0);

      // Year transition: Dec 28, 2025 to Jan 3, 2026 (6 days)
      const refJan = new Date("2026-01-03T12:00:00Z");
      const dueDec = "2025-12-28T12:00:00Z";
      expect(getOverdueDays(dueDec, refJan)).toBe(6);
    });
  });
});
