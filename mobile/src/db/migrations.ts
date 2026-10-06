import type { SQLiteDatabase } from "expo-sqlite";

export const DB_NAME = "weight-trend.db";

const NOW = "(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))";
const DATE_GLOB = "'[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'";

// Append-only. Migration N (1-based) brings the database to user_version N.
// Never edit a migration that has shipped; add a new one instead.
const MIGRATIONS: string[] = [
  `
  CREATE TABLE daily_entries (
    date            TEXT PRIMARY KEY CHECK (date GLOB ${DATE_GLOB}),
    weight_kg       REAL CHECK (weight_kg IS NULL OR weight_kg > 0),
    weight_source   TEXT,
    calories_kcal   INTEGER CHECK (calories_kcal IS NULL OR calories_kcal >= 0),
    calories_source TEXT,
    flags           TEXT NOT NULL DEFAULT '[]',
    note            TEXT,
    created_at      TEXT NOT NULL DEFAULT ${NOW},
    updated_at      TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE calorie_periods (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    start_date  TEXT NOT NULL CHECK (start_date GLOB ${DATE_GLOB}),
    end_date    TEXT CHECK (end_date IS NULL OR end_date GLOB ${DATE_GLOB}),
    target_kcal INTEGER NOT NULL CHECK (target_kcal > 0),
    label       TEXT NOT NULL,
    reason      TEXT,
    created_at  TEXT NOT NULL DEFAULT ${NOW},
    updated_at  TEXT NOT NULL DEFAULT ${NOW},
    CHECK (end_date IS NULL OR end_date >= start_date)
  );

  CREATE TABLE settings (
    id                      INTEGER PRIMARY KEY CHECK (id = 1),
    target_weight_kg        REAL CHECK (target_weight_kg IS NULL OR target_weight_kg > 0),
    target_rate_kg_per_week REAL,
    updated_at              TEXT NOT NULL DEFAULT ${NOW}
  );
  INSERT INTO settings (id) VALUES (1);

  CREATE TABLE analyses (
    date          TEXT PRIMARY KEY CHECK (date GLOB ${DATE_GLOB}),
    request_hash  TEXT NOT NULL,
    request_json  TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT ${NOW}
  );

  CREATE TABLE meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function getSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  return row?.user_version ?? 0;
}

// SQLiteProvider onInit handler. Runs every pending migration in one
// all-or-nothing transaction, so a crash can't leave a half-migrated schema.
export async function migrate(db: SQLiteDatabase): Promise<void> {
  // Journal mode can't be changed inside a transaction.
  await db.execAsync("PRAGMA journal_mode = WAL");

  const current = await getSchemaVersion(db);
  if (current > SCHEMA_VERSION) {
    throw new Error(`Database is at schema v${current}, but this build only knows v${SCHEMA_VERSION}`);
  }
  if (current === SCHEMA_VERSION) return;

  await db.withExclusiveTransactionAsync(async (tx) => {
    for (let version = current + 1; version <= SCHEMA_VERSION; version++) {
      await tx.execAsync(MIGRATIONS[version - 1]);
    }
    // PRAGMA doesn't take bound parameters; SCHEMA_VERSION is a number we control.
    await tx.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
}
