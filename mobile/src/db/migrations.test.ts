import { createMockDb } from "@/test/mockDb";

import { SCHEMA_VERSION, getSchemaVersion, migrate } from "./migrations";

describe("migrations.ts", () => {
  describe("GIVEN no user_version row", () => {
    it("SHOULD default the schema version to 0", async () => {
      const { db } = createMockDb();

      await expect(getSchemaVersion(db)).resolves.toBe(0);
    });
  });

  describe("GIVEN a database newer than this build", () => {
    it("SHOULD throw and leave the schema alone", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue({
        user_version: SCHEMA_VERSION + 1,
      });

      await expect(migrate(db)).rejects.toThrow(
        `schema v${SCHEMA_VERSION + 1}`,
      );
      expect(mocks.withExclusiveTransactionAsync).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN a database already at the current version", () => {
    it("SHOULD skip the migration", async () => {
      const { db, mocks } = createMockDb();
      mocks.getFirstAsync.mockResolvedValue({ user_version: SCHEMA_VERSION });

      await migrate(db);

      expect(mocks.execAsync).toHaveBeenCalledWith("PRAGMA journal_mode = WAL");
      expect(mocks.withExclusiveTransactionAsync).not.toHaveBeenCalled();
    });
  });

  describe("GIVEN a fresh database", () => {
    it("SHOULD run the migration and set user_version inside the transaction", async () => {
      const { db, mocks } = createMockDb();

      await migrate(db);

      expect(mocks.execAsync).toHaveBeenNthCalledWith(
        1,
        "PRAGMA journal_mode = WAL",
      );
      expect(mocks.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
      expect(mocks.execAsync).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("CREATE TABLE daily_entries"),
      );
      expect(mocks.execAsync).toHaveBeenNthCalledWith(
        3,
        `PRAGMA user_version = ${SCHEMA_VERSION}`,
      );
    });
  });
});
