import type { SQLiteDatabase } from "expo-sqlite";

// Known keys. Step 3 writes `history_seeded_at` after the one-time import.
export type MetaKey = "history_seeded_at";

export async function getMeta(db: SQLiteDatabase, key: MetaKey): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = ?", key);
  return row?.value ?? null;
}

export async function setMeta(db: SQLiteDatabase, key: MetaKey, value: string): Promise<void> {
  await db.runAsync(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    key,
    value,
  );
}
