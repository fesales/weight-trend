import type { SQLiteDatabase } from "expo-sqlite";

import type { Settings } from "./types";

type Row = {
  target_weight_kg: number | null;
  target_rate_kg_per_week: number | null;
  updated_at: string;
};

// The single row (id = 1) is created by migration 1, so it always exists.
export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const row = await db.getFirstAsync<Row>(
    "SELECT target_weight_kg, target_rate_kg_per_week, updated_at FROM settings WHERE id = 1",
  );
  if (!row) throw new Error("settings row missing");
  return {
    targetWeightKg: row.target_weight_kg,
    targetRateKgPerWeek: row.target_rate_kg_per_week,
    updatedAt: row.updated_at,
  };
}

/** Partial update: fields left undefined keep their value; null clears. */
export async function updateSettings(
  db: SQLiteDatabase,
  patch: Partial<Pick<Settings, "targetWeightKg" | "targetRateKgPerWeek">>,
): Promise<void> {
  const current = await getSettings(db);
  await db.runAsync(
    `UPDATE settings SET
       target_weight_kg = ?, target_rate_kg_per_week = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = 1`,
    patch.targetWeightKg !== undefined
      ? patch.targetWeightKg
      : current.targetWeightKg,
    patch.targetRateKgPerWeek !== undefined
      ? patch.targetRateKgPerWeek
      : current.targetRateKgPerWeek,
  );
}
