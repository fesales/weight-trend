import { createMockDb } from "@/test/mockDb";

import {
  deletePeriod,
  getPeriod,
  insertPeriod,
  insertPeriodClosingPrevious,
  listPeriods,
  updatePeriod,
  type PeriodInput,
} from "./caloriePeriods";

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

  describe("GIVEN a period id to look up", () => {
    it("SHOULD map the stored row", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue(ROW);

      const result = await getPeriod(db, 3);

      expect(result).toEqual(expect.objectContaining({ id: 3, label: "Cut", endDate: null }));
      expect(mocks.getFirstAsync).toHaveBeenCalledWith("SELECT * FROM calorie_periods WHERE id = ?", 3);
    });

    it("SHOULD return null when it doesn't exist", async () => {
      const { db } = createMockDb();

      const result = await getPeriod(db, 99);

      expect(result).toBeNull();
    });
  });

  describe("GIVEN a new current period that closes the open one", () => {
    it("SHOULD end the open period and insert the new one in one transaction", async () => {
      const { db, mocks } = createMockDb();
      mocks.runAsync
        .mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 })
        .mockResolvedValueOnce({ lastInsertRowId: 8, changes: 1 });

      const result = await insertPeriodClosingPrevious(db, { id: 3, endDate: "2026-09-30" }, {
        ...INPUT,
        startDate: "2026-10-01",
      });

      expect(result).toBe(8);
      expect(mocks.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
      expect(mocks.runAsync).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("UPDATE calorie_periods SET end_date = ?"),
        "2026-09-30",
        3,
      );
      expect(mocks.runAsync).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("INSERT INTO calorie_periods"),
        "2026-10-01",
        null,
        2800,
        "Cut",
        "rate stalled",
      );
    });

    it("SHOULD reject, so the transaction rolls back, when the insert fails", async () => {
      const { db, mocks } = createMockDb();
      mocks.runAsync
        .mockResolvedValueOnce({ lastInsertRowId: 0, changes: 1 })
        .mockRejectedValueOnce(new Error("CHECK constraint failed"));

      const act = insertPeriodClosingPrevious(db, { id: 3, endDate: "2026-09-30" }, INPUT);

      await expect(act).rejects.toThrow("CHECK constraint failed");
      expect(mocks.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    });
  });
});
