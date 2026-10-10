import type { SQLiteDatabase } from "expo-sqlite";

import { isFlag, type Flag } from "@/domain/flags";
import type { DailyEntry, DateString, ValueSource } from "./types";

type Row = {
  date: string;
  weight_kg: number | null;
  weight_source: string | null;
  calories_kcal: number | null;
  calories_source: string | null;
  flags: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function parseFlags(json: string): Flag[] {
  try {
    const value: unknown = JSON.parse(json);
    // Unknown keys are dropped, so removing a flag from FLAGS is a deliberate act.
    return Array.isArray(value) ? value.filter(isFlag) : [];
  } catch {
    return [];
  }
}

function toEntry(row: Row): DailyEntry {
  return {
    date: row.date,
    weightKg: row.weight_kg,
    weightSource: row.weight_source as ValueSource | null,
    caloriesKcal: row.calories_kcal,
    caloriesSource: row.calories_source as ValueSource | null,
    flags: parseFlags(row.flags),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getEntry(
  db: SQLiteDatabase,
  date: DateString,
): Promise<DailyEntry | null> {
  const row = await db.getFirstAsync<Row>(
    "SELECT * FROM daily_entries WHERE date = ?",
    date,
  );
  return row ? toEntry(row) : null;
}

/** Newest first. */
export async function listEntries(db: SQLiteDatabase): Promise<DailyEntry[]> {
  const rows = await db.getAllAsync<Row>(
    "SELECT * FROM daily_entries ORDER BY date DESC",
  );
  return rows.map(toEntry);
}

/**
 * Sets the morning weigh-in for `date`. Touches only the weight columns, so
 * calories, flags and note already saved on that date are kept.
 * Pass null to clear the weight.
 */
export async function saveWeighIn(
  db: SQLiteDatabase,
  date: DateString,
  weightKg: number | null,
  source: ValueSource = "manual",
): Promise<void> {
  const weightSource = weightKg === null ? null : source;
  await db.runAsync(
    `INSERT INTO daily_entries (date, weight_kg, weight_source)
     VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       weight_kg = excluded.weight_kg,
       weight_source = excluded.weight_source,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    date,
    weightKg,
    weightSource,
  );
}

export type Intake = {
  caloriesKcal: number | null;
  flags: Flag[];
  note: string | null;
};

/**
 * Sets what was eaten on `date` (calories, flags, note). Touches only those
 * columns, so a weigh-in already saved on that date is kept.
 */
export async function saveIntake(
  db: SQLiteDatabase,
  date: DateString,
  intake: Intake,
  source: ValueSource = "manual",
): Promise<void> {
  const caloriesSource = intake.caloriesKcal === null ? null : source;
  await db.runAsync(
    `INSERT INTO daily_entries (date, calories_kcal, calories_source, flags, note)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       calories_kcal = excluded.calories_kcal,
       calories_source = excluded.calories_source,
       flags = excluded.flags,
       note = excluded.note,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    date,
    intake.caloriesKcal,
    caloriesSource,
    JSON.stringify(intake.flags),
    intake.note,
  );
}

/** One row of mobile/data/history.json (written by scripts/csv-to-history.ts). */
export type ImportRow = {
  date: DateString;
  weightKg: number | null;
  caloriesKcal: number | null;
  flags: Flag[];
  note: string | null;
};

/**
 * Bulk import that never overwrites: on a date that already has data, each
 * field is only filled if it's currently empty (flags only if `[]`). Source
 * is set to `import` only on the fields this actually fills.
 * Run it inside a transaction; it doesn't open one itself.
 */
export async function importEntries(
  db: SQLiteDatabase,
  rows: ImportRow[],
): Promise<void> {
  const statement = await db.prepareAsync(
    `INSERT INTO daily_entries (date, weight_kg, weight_source, calories_kcal, calories_source, flags, note)
     VALUES ($date, $weightKg, $weightSource, $caloriesKcal, $caloriesSource, $flags, $note)
     ON CONFLICT(date) DO UPDATE SET
       weight_source = CASE WHEN daily_entries.weight_kg IS NULL
                            THEN excluded.weight_source ELSE daily_entries.weight_source END,
       weight_kg = COALESCE(daily_entries.weight_kg, excluded.weight_kg),
       calories_source = CASE WHEN daily_entries.calories_kcal IS NULL
                              THEN excluded.calories_source ELSE daily_entries.calories_source END,
       calories_kcal = COALESCE(daily_entries.calories_kcal, excluded.calories_kcal),
       flags = CASE WHEN daily_entries.flags = '[]' THEN excluded.flags ELSE daily_entries.flags END,
       note = COALESCE(daily_entries.note, excluded.note),
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
  );
  try {
    for (const row of rows) {
      await statement.executeAsync({
        $date: row.date,
        $weightKg: row.weightKg,
        $weightSource: row.weightKg === null ? null : "import",
        $caloriesKcal: row.caloriesKcal,
        $caloriesSource: row.caloriesKcal === null ? null : "import",
        $flags: JSON.stringify(row.flags),
        $note: row.note,
      });
    }
  } finally {
    await statement.finalizeAsync();
  }
}

export async function deleteEntry(
  db: SQLiteDatabase,
  date: DateString,
): Promise<void> {
  await db.runAsync("DELETE FROM daily_entries WHERE date = ?", date);
}
