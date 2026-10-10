import type { SQLiteDatabase } from "expo-sqlite";

import { importEntries, type ImportRow } from "./dailyEntries";
import { getMeta, setMeta } from "./meta";

/**
 * One-time history import. Rows and the `history_seeded_at` marker are written
 * in one transaction, so a crash can't leave a partial import that never
 * retries. An empty file seeds nothing and leaves the marker unset, so real
 * history can still be loaded on a later launch.
 */
export async function seedHistoryOnce(
  db: SQLiteDatabase,
  rows: ImportRow[],
): Promise<void> {
  if (rows.length === 0) return;
  if ((await getMeta(db, "history_seeded_at")) !== null) return;

  await db.withExclusiveTransactionAsync(async (tx) => {
    await importEntries(tx, rows);
    await setMeta(tx, "history_seeded_at", new Date().toISOString());
  });
}

/**
 * Dev only: undo the import so the next launch seeds again.
 * Deletes rows that came from the import and have nothing entered by hand;
 * any row with a `manual` weight or calories is kept as is.
 */
export async function wipeImportedHistory(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      `DELETE FROM daily_entries
       WHERE (weight_source = 'import' OR calories_source = 'import')
         AND COALESCE(weight_source, '') <> 'manual'
         AND COALESCE(calories_source, '') <> 'manual'`,
    );
    await tx.runAsync("DELETE FROM meta WHERE key = 'history_seeded_at'");
  });
}
