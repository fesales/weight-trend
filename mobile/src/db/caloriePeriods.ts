import type { SQLiteDatabase } from "expo-sqlite";

import type { CaloriePeriod, DateString } from "./types";

type Row = {
  id: number;
  start_date: string;
  end_date: string | null;
  target_kcal: number;
  label: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

function toPeriod(row: Row): CaloriePeriod {
  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    targetKcal: row.target_kcal,
    label: row.label,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type PeriodInput = {
  startDate: DateString;
  endDate: DateString | null;
  targetKcal: number;
  label: string;
  reason: string | null;
};

export async function getPeriod(db: SQLiteDatabase, id: number): Promise<CaloriePeriod | null> {
  const row = await db.getFirstAsync<Row>("SELECT * FROM calorie_periods WHERE id = ?", id);
  return row ? toPeriod(row) : null;
}

/** Oldest first. */
export async function listPeriods(db: SQLiteDatabase): Promise<CaloriePeriod[]> {
  const rows = await db.getAllAsync<Row>("SELECT * FROM calorie_periods ORDER BY start_date ASC");
  return rows.map(toPeriod);
}

export async function insertPeriod(db: SQLiteDatabase, input: PeriodInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO calorie_periods (start_date, end_date, target_kcal, label, reason)
     VALUES (?, ?, ?, ?, ?)`,
    input.startDate,
    input.endDate,
    input.targetKcal,
    input.label,
    input.reason,
  );
  return result.lastInsertRowId;
}

export async function updatePeriod(db: SQLiteDatabase, id: number, input: PeriodInput): Promise<void> {
  await db.runAsync(
    `UPDATE calorie_periods SET
       start_date = ?, end_date = ?, target_kcal = ?, label = ?, reason = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
    input.startDate,
    input.endDate,
    input.targetKcal,
    input.label,
    input.reason,
    id,
  );
}

export async function deletePeriod(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM calorie_periods WHERE id = ?", id);
}

export async function insertPeriodClosingPrevious(
  db: SQLiteDatabase,
  close: { id: number; endDate: DateString },
  input: PeriodInput,
): Promise<number> {
  let newId = 0;
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `UPDATE calorie_periods SET end_date = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?`,
      close.endDate,
      close.id,
    );
    newId = await insertPeriod(tx, input);
  });
  return newId;
}
