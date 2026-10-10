import { createMockDb } from "@/test/mockDb";

import { getAnalysis, saveAnalysis } from "./analyses";

const ROW = {
  date: "2026-10-01",
  request_hash: "abc",
  request_json: "{}",
  response_json: '{"trend":"stable"}',
  created_at: "2026-10-01T00:00:00.000Z",
};

describe("analyses.ts", () => {
  describe("GIVEN no cached analysis", () => {
    it("SHOULD return null", async () => {
      const { db } = createMockDb();

      await expect(getAnalysis(db, "2026-10-01")).resolves.toBeNull();
    });
  });

  describe("GIVEN a cached row", () => {
    it("SHOULD map it", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue(ROW);

      await expect(getAnalysis(db, "2026-10-01")).resolves.toEqual({
        date: "2026-10-01",
        requestHash: "abc",
        requestJson: "{}",
        responseJson: '{"trend":"stable"}',
        createdAt: "2026-10-01T00:00:00.000Z",
      });
    });
  });

  describe("GIVEN an analysis to save", () => {
    it("SHOULD pass the columns in order", async () => {
      const { db, mocks } = createMockDb();

      await saveAnalysis(db, {
        date: "2026-10-01",
        requestHash: "abc",
        requestJson: "{}",
        responseJson: '{"trend":"stable"}',
      });

      expect(mocks.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO analyses"),
        "2026-10-01",
        "abc",
        "{}",
        '{"trend":"stable"}',
      );
    });
  });
});
