import { createMockDb } from "@/test/mockDb";

import { getMeta, setMeta } from "./meta";

describe("meta.ts", () => {
  describe("GIVEN a stored value", () => {
    it("SHOULD return it", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue({ value: "2026-10-01T00:00:00.000Z" });

      await expect(getMeta(db, "history_seeded_at")).resolves.toBe("2026-10-01T00:00:00.000Z");
      expect(mocks.getFirstAsync).toHaveBeenCalledWith(
        "SELECT value FROM meta WHERE key = ?",
        "history_seeded_at",
      );
    });
  });

  describe("GIVEN no row", () => {
    it("SHOULD return null", async () => {
      const { db } = createMockDb();

      await expect(getMeta(db, "history_seeded_at")).resolves.toBeNull();
    });
  });

  describe("GIVEN a key and value", () => {
    it("SHOULD upsert them", async () => {
      const { db, mocks } = createMockDb();

      await setMeta(db, "history_seeded_at", "2026-10-01T00:00:00.000Z");

      expect(mocks.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("ON CONFLICT(key)"),
        "history_seeded_at",
        "2026-10-01T00:00:00.000Z",
      );
    });
  });
});
