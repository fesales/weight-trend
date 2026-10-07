import type { SQLiteDatabase, SQLiteRunResult } from "expo-sqlite";

const RUN_RESULT: SQLiteRunResult = { lastInsertRowId: 1, changes: 1 };

type AsyncMock<Args extends unknown[], Result> = jest.Mock<Promise<Result>, Args>;

export type MockStatement = {
  executeAsync: AsyncMock<[unknown], void>;
  finalizeAsync: AsyncMock<[], void>;
};

// The subset of SQLiteDatabase the data layer calls. Cast to SQLiteDatabase at the boundary.
export type MockDb = {
  runAsync: AsyncMock<[string, ...unknown[]], SQLiteRunResult>;
  getFirstAsync: AsyncMock<[string, ...unknown[]], unknown>;
  getAllAsync: AsyncMock<[string, ...unknown[]], unknown[]>;
  execAsync: AsyncMock<[string], void>;
  prepareAsync: AsyncMock<[string], MockStatement>;
  withExclusiveTransactionAsync: AsyncMock<[(txn: SQLiteDatabase) => Promise<void>], void>;
};

export function createMockDb(): { db: SQLiteDatabase; mocks: MockDb; statement: MockStatement } {
  const statement: MockStatement = {
    executeAsync: jest.fn(async () => undefined),
    finalizeAsync: jest.fn(async () => undefined),
  };

  const mocks: MockDb = {
    runAsync: jest.fn(async () => RUN_RESULT),
    getFirstAsync: jest.fn(async () => null),
    getAllAsync: jest.fn(async () => []),
    execAsync: jest.fn(async () => undefined),
    prepareAsync: jest.fn(async () => statement),
    withExclusiveTransactionAsync: jest.fn(async (task) => {
      await task(mocks as unknown as SQLiteDatabase);
    }),
  };

  return { db: mocks as unknown as SQLiteDatabase, mocks, statement };
}
