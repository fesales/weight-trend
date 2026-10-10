import { createMockDb } from "@/test/mockDb";

import type { ImportRow } from "./dailyEntries";
import { seedHistoryOnce, wipeImportedHistory } from "./seedHistory";

const ROW: ImportRow = {
  date: "2026-09-01",
  weightKg: 80.4,
  caloriesKcal: 2500,
  flags: ["late_meal"],
  note: null,
};

describe("seedHistory.ts", () => {
  describe("GIVEN an empty history file", () => {
    it("SHOULD seed nothing", async () => {
      const { db, mocks } = createMockDb();

      await seedHistoryOnce(db, []);

      expect(mocks.getFirstAsync).not.toHaveBeenCalled();
      expect(mocks.withExclusiveTransactionAsync).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN history that was already seeded", () => {
    it("SHOULD seed nothing", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue({
        value: "2026-09-01T00:00:00.000Z",
      });

      await seedHistoryOnce(db, [ROW]);

      expect(mocks.withExclusiveTransactionAsync).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN history that has not been seeded", () => {
    it("SHOULD import the rows and set the marker in one transaction", async () => {
      const { db, mocks, statement } = createMockDb();

      await seedHistoryOnce(db, [ROW]);

      expect(mocks.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
      expect(statement.executeAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          $date: "2026-09-01",
          $weightSource: "import",
        }),
      );
      expect(mocks.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO meta"),
        "history_seeded_at",
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      );
    });
  });

  describe("GIVEN imported history to wipe", () => {
    it("SHOULD delete import-only rows and the marker in one transaction", async () => {
      const { db, mocks } = createMockDb();

      await wipeImportedHistory(db);

      expect(mocks.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
      expect(mocks.runAsync).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("DELETE FROM daily_entries"),
      );
      expect(mocks.runAsync).toHaveBeenNthCalledWith(
        2,
        "DELETE FROM meta WHERE key = 'history_seeded_at'",
      );
    });
  });
});
