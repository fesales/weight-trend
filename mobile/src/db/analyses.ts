import type { SQLiteDatabase } from "expo-sqlite";

import type { CachedAnalysis, DateString } from "./types";

type Row = {
  date: string;
  request_hash: string;
  request_json: string;
  response_json: string;
  created_at: string;
};

export async function getAnalysis(db: SQLiteDatabase, date: DateString): Promise<CachedAnalysis | null> {
  const row = await db.getFirstAsync<Row>("SELECT * FROM analyses WHERE date = ?", date);
  if (!row) return null;
  return {
    date: row.date,
    requestHash: row.request_hash,
    requestJson: row.request_json,
    responseJson: row.response_json,
    createdAt: row.created_at,
  };
}

/** One cached analysis per date; saving again replaces it. */
export async function saveAnalysis(
  db: SQLiteDatabase,
  analysis: Pick<CachedAnalysis, "date" | "requestHash" | "requestJson" | "responseJson">,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO analyses (date, request_hash, request_json, response_json)
     VALUES (?, ?, ?, ?)`,
    analysis.date,
    analysis.requestHash,
    analysis.requestJson,
    analysis.responseJson,
  );
}
