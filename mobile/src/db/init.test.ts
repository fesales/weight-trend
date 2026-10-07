import type { SQLiteDatabase } from "expo-sqlite";

import history from "../../data/history.json";
import { initDb } from "./init";
import { migrate } from "./migrations";
import { seedHistoryOnce } from "./seedHistory";

jest.mock("./migrations", () => ({
  migrate: jest.fn(async () => undefined),
}));

jest.mock("./seedHistory", () => ({
  seedHistoryOnce: jest.fn(async () => undefined),
}));

jest.mock("../../data/history.json", () => ({
  rows: [
    {
      date: "2026-09-01",
      weightKg: 80.1,
      caloriesKcal: 2500,
      flags: ["late_meal"],
      note: "note",
    },
  ],
}));

describe("init.ts", () => {
  describe("GIVEN a database opening for the first time", () => {
    it("SHOULD migrate before seeding the bundled history", async () => {
      const db = {} as SQLiteDatabase;

      await initDb(db);

      expect(migrate).toHaveBeenCalledWith(db);
      expect(seedHistoryOnce).toHaveBeenCalledWith(db, history.rows);
      expect(jest.mocked(migrate).mock.invocationCallOrder[0]).toBeLessThan(
        jest.mocked(seedHistoryOnce).mock.invocationCallOrder[0],
      );
    });
  });
});
