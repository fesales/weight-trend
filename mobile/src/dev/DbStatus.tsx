// LATER: dev-only scaffolding for step 2; remove when the daily form lands in step 6.
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";

import { deleteEntry, getEntry, saveIntake, saveWeighIn } from "@/db/dailyEntries";
import { getSchemaVersion } from "@/db/migrations";

// Far outside any real data, so the round-trip can't touch a real row.
const SENTINEL_DATE = "1900-01-01";

export function DbStatus() {
  const db = useSQLiteContext();
  const [status, setStatus] = useState("loading…");
  const [roundTrip, setRoundTrip] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const version = await getSchemaVersion(db);
    const count = async (table: string) =>
      (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))?.n ?? 0;
    const [entries, periods, analyses] = await Promise.all([
      count("daily_entries"),
      count("calorie_periods"),
      count("analyses"),
    ]);
    setStatus(`schema v${version} · entries ${entries} · periods ${periods} · analyses ${analyses}`);
  }, [db]);

  useEffect(() => {
    refresh().catch((e: unknown) => setStatus(`error: ${String(e)}`));
  }, [refresh]);

  const runRoundTrip = async () => {
    try {
      await saveWeighIn(db, SENTINEL_DATE, 80.5);
      await saveIntake(db, SENTINEL_DATE, { caloriesKcal: 2500, flags: ["late_meal"], note: "test" });
      // Write the weight again: it must not wipe the intake saved above.
      await saveWeighIn(db, SENTINEL_DATE, 80.4);
      const row = await getEntry(db, SENTINEL_DATE);
      const ok =
        row?.weightKg === 80.4 &&
        row.weightSource === "manual" &&
        row.caloriesKcal === 2500 &&
        row.flags.join() === "late_meal" &&
        row.note === "test";
      setRoundTrip(ok ? "round-trip OK" : `round-trip FAILED: ${JSON.stringify(row)}`);
    } catch (e) {
      setRoundTrip(`round-trip error: ${String(e)}`);
    } finally {
      await deleteEntry(db, SENTINEL_DATE).catch(() => {});
      await refresh().catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{status}</Text>
      <Button title="DB round-trip" onPress={runRoundTrip} />
      {roundTrip && <Text style={styles.text}>{roundTrip}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, alignItems: "center", padding: 16 },
  text: { fontSize: 12, color: "#666" },
});
