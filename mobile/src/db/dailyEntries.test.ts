import { createMockDb } from "@/test/mockDb";

import {
  getEntry,
  importEntries,
  listEntries,
  saveIntake,
  saveWeighIn,
  type ImportRow,
} from "./dailyEntries";

const ROW = {
  date: "2026-10-01",
  weight_kg: 80.4,
  weight_source: "manual",
  calories_kcal: 2500,
  calories_source: "manual",
  flags: '["late_meal"]',
  note: "test",
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z",
};

const ENTRY = {
  date: "2026-10-01",
  weightKg: 80.4,
  weightSource: "manual",
  caloriesKcal: 2500,
  caloriesSource: "manual",
  flags: ["late_meal"],
  note: "test",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const IMPORT_ROW: ImportRow = {
  date: "2026-10-01",
  weightKg: 80.4,
  caloriesKcal: null,
  flags: [],
  note: null,
};

describe("dailyEntries.ts", () => {
  describe("GIVEN a stored row", () => {
    it("SHOULD map it", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue(ROW);

      await expect(getEntry(db, "2026-10-01")).resolves.toEqual(ENTRY);
    });

    it("SHOULD return null when the date is missing", async () => {
      const { db } = createMockDb();

      await expect(getEntry(db, "2026-10-01")).resolves.toBeNull();
    });

    it("SHOULD list newest first", async () => {
      const { db, mocks } = createMockDb();
      mocks.getAllAsync.mockResolvedValue([ROW]);

      await expect(listEntries(db)).resolves.toEqual([ENTRY]);
      expect(mocks.getAllAsync).toHaveBeenCalledWith(
        "SELECT * FROM daily_entries ORDER BY date DESC",
      );
    });
  });

  describe("GIVEN flags that are not a clean list", () => {
    it("SHOULD drop unknown keys", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue({
        ...ROW,
        flags: '["late_meal","nope",1]',
      });

      const entry = await getEntry(db, "2026-10-01");

      expect(entry?.flags).toEqual(["late_meal"]);
    });

    it("SHOULD return an empty list for invalid JSON", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue({ ...ROW, flags: "not json" });

      const entry = await getEntry(db, "2026-10-01");

      expect(entry?.flags).toEqual([]);
    });

    it("SHOULD return an empty list when the JSON is not an array", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue({ ...ROW, flags: '"late_meal"' });

      const entry = await getEntry(db, "2026-10-01");

      expect(entry?.flags).toEqual([]);
    });
  });

  describe("GIVEN a weigh-in", () => {
    it("SHOULD default the source to manual", async () => {
      const { db, mocks } = createMockDb();

      await saveWeighIn(db, "2026-10-01", 80.4);

      expect(mocks.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("weight_kg"),
        "2026-10-01",
        80.4,
        "manual",
      );
    });

    it("SHOULD store a null source when the weight is cleared", async () => {
      const { db, mocks } = createMockDb();

      await saveWeighIn(db, "2026-10-01", null, "import");

      expect(mocks.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("weight_kg"),
        "2026-10-01",
        null,
        null,
      );
    });
  });

  describe("GIVEN an intake", () => {
    it("SHOULD send flags as JSON and default the source to manual", async () => {
      const { db, mocks } = createMockDb();

      await saveIntake(db, "2026-10-01", {
        caloriesKcal: 2500,
        flags: ["late_meal"],
        note: "test",
      });

      expect(mocks.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("calories_kcal"),
        "2026-10-01",
        2500,
        "manual",
        '["late_meal"]',
        "test",
      );
    });

    it("SHOULD store a null source when calories are cleared", async () => {
      const { db, mocks } = createMockDb();

      await saveIntake(db, "2026-10-01", {
        caloriesKcal: null,
        flags: [],
        note: null,
      });

      expect(mocks.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("calories_kcal"),
        "2026-10-01",
        null,
        null,
        "[]",
        null,
      );
    });
  });

  describe("GIVEN rows to import", () => {
    it("SHOULD mark only non-null fields as import", async () => {
      const { db, mocks, statement } = createMockDb();

      await importEntries(db, [IMPORT_ROW]);

      expect(mocks.prepareAsync).toHaveBeenCalledWith(
        expect.stringContaining("COALESCE"),
      );
      expect(statement.executeAsync).toHaveBeenCalledWith({
        $date: "2026-10-01",
        $weightKg: 80.4,
        $weightSource: "import",
        $caloriesKcal: null,
        $caloriesSource: null,
        $flags: "[]",
        $note: null,
      });
      expect(statement.finalizeAsync).toHaveBeenCalledTimes(1);
    });

    it("SHOULD finalize the statement when execute throws", async () => {
      const { db, statement } = createMockDb();
      statement.executeAsync.mockRejectedValue(new Error("boom"));

      await expect(importEntries(db, [IMPORT_ROW])).rejects.toThrow("boom");
      expect(statement.finalizeAsync).toHaveBeenCalledTimes(1);
    });
  });
});
