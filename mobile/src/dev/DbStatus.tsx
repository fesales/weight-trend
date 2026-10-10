// LATER: dev-only scaffolding from steps 2–3; remove when the daily form lands in step 6.
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";

import {
  deleteEntry,
  getEntry,
  saveIntake,
  saveWeighIn,
} from "@/db/dailyEntries";
import { getMeta } from "@/db/meta";
import { getSchemaVersion } from "@/db/migrations";
import { wipeImportedHistory } from "@/db/seedHistory";

// Far outside any real data, so the round-trip can't touch a real row.
const SENTINEL_DATE = "1900-01-01";

export function DbStatus() {
  const db = useSQLiteContext();
  const [status, setStatus] = useState("loading…");
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const version = await getSchemaVersion(db);
    const count = async (table: string) =>
      (
        await db.getFirstAsync<{ n: number }>(
          `SELECT COUNT(*) AS n FROM ${table}`,
        )
      )?.n ?? 0;
    const [entries, periods, analyses] = await Promise.all([
      count("daily_entries"),
      count("calorie_periods"),
      count("analyses"),
    ]);
    const seededAt = await getMeta(db, "history_seeded_at");
    const history = seededAt
      ? `history seeded ${seededAt.slice(0, 10)}`
      : "history not seeded";
    setStatus(
      `schema v${version} · entries ${entries} · periods ${periods} · analyses ${analyses}\n${history}`,
    );
  }, [db]);

  useEffect(() => {
    refresh().catch((e: unknown) => setStatus(`error: ${String(e)}`));
  }, [refresh]);

  const runRoundTrip = async () => {
    try {
      await saveWeighIn(db, SENTINEL_DATE, 80.5);
      await saveIntake(db, SENTINEL_DATE, {
        caloriesKcal: 2500,
        flags: ["late_meal"],
        note: "test",
      });
      // Write the weight again: it must not wipe the intake saved above.
      await saveWeighIn(db, SENTINEL_DATE, 80.4);
      const row = await getEntry(db, SENTINEL_DATE);
      const ok =
        row?.weightKg === 80.4 &&
        row.weightSource === "manual" &&
        row.caloriesKcal === 2500 &&
        row.flags.join() === "late_meal" &&
        row.note === "test";
      setMessage(
        ok ? "round-trip OK" : `round-trip FAILED: ${JSON.stringify(row)}`,
      );
    } catch (e) {
      setMessage(`round-trip error: ${String(e)}`);
    } finally {
      await deleteEntry(db, SENTINEL_DATE).catch(() => {});
      await refresh().catch(() => {});
    }
  };

  const confirmWipe = () => {
    Alert.alert(
      "Wipe imported history?",
      "Deletes rows that came from the import (rows with anything typed by hand are kept). Reload the app afterwards to import again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Wipe",
          style: "destructive",
          onPress: async () => {
            try {
              await wipeImportedHistory(db);
              setMessage("imported history wiped; reload the app to re-seed");
            } catch (e) {
              setMessage(`wipe error: ${String(e)}`);
            } finally {
              await refresh().catch(() => {});
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{status}</Text>
      <Button title="DB round-trip" onPress={runRoundTrip} />
      <Button
        title="Wipe imported history"
        color="#b00020"
        onPress={confirmWipe}
      />
      {message && <Text style={styles.text}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, alignItems: "center", padding: 16 },
  text: { fontSize: 12, color: "#666", textAlign: "center" },
});
