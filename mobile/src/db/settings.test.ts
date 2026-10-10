import { createMockDb } from "@/test/mockDb";

import { getSettings, updateSettings } from "./settings";

const ROW = {
  target_weight_kg: 75,
  target_rate_kg_per_week: -0.5,
  updated_at: "2026-10-01T00:00:00.000Z",
};

describe("settings.ts", () => {
  describe("GIVEN the settings row", () => {
    it("SHOULD map it", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue(ROW);

      await expect(getSettings(db)).resolves.toEqual({
        targetWeightKg: 75,
        targetRateKgPerWeek: -0.5,
        updatedAt: "2026-10-01T00:00:00.000Z",
      });
    });
  });

  describe("GIVEN a missing settings row", () => {
    it("SHOULD throw", async () => {
      const { db } = createMockDb();

      await expect(getSettings(db)).rejects.toThrow("settings row missing");
    });
  });

  describe("GIVEN a partial update", () => {
    it("SHOULD keep fields left undefined", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue(ROW);

      await updateSettings(db, { targetWeightKg: 74 });

      expect(mocks.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE settings"),
        74,
        -0.5,
      );
    });

    it("SHOULD clear a field set to null", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue(ROW);

      await updateSettings(db, { targetRateKgPerWeek: null });

      expect(mocks.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE settings"),
        75,
        null,
      );
    });
  });
});
