import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { listPeriods } from "@/db/caloriePeriods";
import { listEntries } from "@/db/dailyEntries";
import { getSettings, updateSettings } from "@/db/settings";
import type { CaloriePeriod } from "@/db/types";
import { todayLocal } from "@/domain/dates";
import { formatRate, parseTargets, type TargetsErrors } from "@/domain/targets";
import { currentWeight } from "@/domain/trend/rates";
import { toSeries } from "@/domain/trend/series";
import { Field } from "@/ui/Field";
import { colors } from "@/ui/theme";

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [targetWeight, setTargetWeight] = useState("");
  const [targetRate, setTargetRate] = useState("");
  const [tolerance, setTolerance] = useState("");
  const [currentWeightKg, setCurrentWeightKg] = useState<number | null>(null);
  const [errors, setErrors] = useState<TargetsErrors>({});
  const [saved, setSaved] = useState(false);
  // Hide the form until loaded, so a late load can't overwrite typing.
  const [loaded, setLoaded] = useState(false);
  const [periods, setPeriods] = useState<CaloriePeriod[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [settings, stored, entries] = await Promise.all([
          getSettings(db),
          listPeriods(db),
          listEntries(db),
        ]);
        if (!active) return;
        setTargetWeight(
          settings.targetWeightKg === null
            ? ""
            : String(settings.targetWeightKg),
        );
        setTargetRate(
          settings.targetRateKgPerWeek === null
            ? ""
            : formatRate(settings.targetRateKgPerWeek),
        );
        setTolerance(String(settings.rateToleranceKgPerWeek));
        setCurrentWeightKg(currentWeight(toSeries(entries), todayLocal()));
        setPeriods([...stored].reverse());
        setLoaded(true);
      })();
      return () => {
        active = false;
      };
    }, [db]),
  );

  const saveTargets = async () => {
    const result = parseTargets(
      { targetWeight, targetRate, tolerance },
      currentWeightKg,
    );
    if (!result.ok) {
      setErrors(result.errors);
      setSaved(false);
      return;
    }
    await updateSettings(db, {
      targetWeightKg: result.targetWeightKg,
      targetRateKgPerWeek: result.targetRateKgPerWeek,
      rateToleranceKgPerWeek: result.rateToleranceKgPerWeek,
    });
    setErrors({});
    setSaved(true);
  };

  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setSaved(false);
  };

  if (!loaded || periods === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Targets</Text>
      <Field
        label="Target weight (kg)"
        value={targetWeight}
        onChangeText={edit(setTargetWeight)}
        keyboardType="decimal-pad"
        placeholder="e.g. 82"
        hint="Leave blank if not set."
        error={errors.targetWeight}
      />
      <Field
        label="Target rate (kg/week)"
        value={targetRate}
        onChangeText={edit(setTargetRate)}
        keyboardType="numbers-and-punctuation"
        placeholder="e.g. +0.25 or -0.5"
        hint="+ means gaining, − means losing, 0 means maintain."
        error={errors.targetRate}
      />
      <Field
        label="Tolerance (kg/week)"
        value={tolerance}
        onChangeText={edit(setTolerance)}
        keyboardType="decimal-pad"
        hint="How far from the target rate still counts as on track."
        error={errors.tolerance}
      />
      <Pressable
        accessibilityRole="button"
        onPress={saveTargets}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>Save targets</Text>
      </Pressable>
      {saved ? <Text style={styles.saved}>Saved</Text> : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.heading}>Calorie periods</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/period/new")}
        >
          <Text style={styles.link}>Add period</Text>
        </Pressable>
      </View>
      {periods.length === 0 ? (
        <Text style={styles.muted}>No periods yet.</Text>
      ) : null}
      {periods.map((period) => (
        <Pressable
          key={period.id}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${period.label}`}
          onPress={() => router.push(`/period/${period.id}`)}
          style={styles.period}
        >
          <Text style={styles.periodTitle}>
            {period.label} · {period.targetKcal.toLocaleString("en-GB")} kcal
          </Text>
          <Text style={styles.muted}>
            {period.startDate} → {period.endDate ?? "ongoing"}
          </Text>
          {period.reason ? (
            <Text style={styles.muted}>{period.reason}</Text>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  heading: { fontSize: 18, fontWeight: "700", color: colors.text },
  sectionHeader: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  saved: { color: colors.primary, textAlign: "center" },
  link: { color: colors.primary, fontSize: 16, fontWeight: "600" },
  muted: { color: colors.muted },
  period: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    gap: 2,
  },
  periodTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
});
