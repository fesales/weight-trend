import { createMockDb } from "@/test/mockDb";

import { deletePeriod, insertPeriod, listPeriods, updatePeriod, type PeriodInput } from "./caloriePeriods";

const INPUT: PeriodInput = {
  startDate: "2026-09-01",
  endDate: null,
  targetKcal: 2800,
  label: "Cut",
  reason: "rate stalled",
};

const ROW = {
  id: 3,
  start_date: "2026-09-01",
  end_date: null,
  target_kcal: 2800,
  label: "Cut",
  reason: "rate stalled",
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

describe("caloriePeriods.ts", () => {
  describe("GIVEN stored periods", () => {
    it("SHOULD map rows, including an open end date", async () => {
      const { db, mocks } = createMockDb();
      mocks.getAllAsync.mockResolvedValue([ROW]);

      await expect(listPeriods(db)).resolves.toEqual([
        {
          id: 3,
          startDate: "2026-09-01",
          endDate: null,
          targetKcal: 2800,
          label: "Cut",
          reason: "rate stalled",
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ]);
      expect(mocks.getAllAsync).toHaveBeenCalledWith(
        "SELECT * FROM calorie_periods ORDER BY start_date ASC",
      );
    });
  });

  describe("GIVEN a new period", () => {
    it("SHOULD return the inserted id", async () => {
      const { db, mocks } = createMockDb();
      mocks.runAsync.mockResolvedValue({ lastInsertRowId: 7, changes: 1 });

      await expect(insertPeriod(db, INPUT)).resolves.toBe(7);
      expect(mocks.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO calorie_periods"),
        "2026-09-01",
        null,
        2800,
        "Cut",
        "rate stalled",
      );
    });
  });

  describe("GIVEN an existing period", () => {
    it("SHOULD pass the id last on update", async () => {
      const { db, mocks } = createMockDb();

      await updatePeriod(db, 3, { ...INPUT, endDate: "2026-09-30" });

      expect(mocks.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE calorie_periods"),
        "2026-09-01",
        "2026-09-30",
        2800,
        "Cut",
        "rate stalled",
        3,
      );
    });

    it("SHOULD delete by id", async () => {
      const { db, mocks } = createMockDb();

      await deletePeriod(db, 3);

      expect(mocks.runAsync).toHaveBeenCalledWith("DELETE FROM calorie_periods WHERE id = ?", 3);
    });
  });
});
