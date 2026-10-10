import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";

import {
  deletePeriod,
  getPeriod,
  insertPeriod,
  insertPeriodClosingPrevious,
  listPeriods,
  updatePeriod,
  type PeriodInput,
} from "@/db/caloriePeriods";
import type { CaloriePeriod } from "@/db/types";
import { todayLocal, type DateString } from "@/domain/dates";
import { parseDecimal } from "@/domain/numbers";
import {
  planPeriodSave,
  validatePeriodDraft,
  type PeriodErrors,
} from "@/domain/periods";
import { DateField } from "@/ui/DateField";
import { Field } from "@/ui/Field";
import { colors } from "@/ui/theme";

type Form = {
  startDate: DateString | null;
  endDate: DateString | null;
  targetKcal: string;
  label: string;
  reason: string;
};

const EMPTY_FORM: Form = {
  startDate: null,
  endDate: null,
  targetKcal: "",
  label: "",
  reason: "",
};

function describe(
  period: Pick<CaloriePeriod, "label" | "startDate" | "endDate">,
): string {
  return `"${period.label}" (${period.startDate} → ${period.endDate ?? "ongoing"})`;
}

function confirm(
  title: string,
  message: string,
  action: string,
  destructive = false,
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      {
        text: action,
        style: destructive ? "destructive" : "default",
        onPress: () => resolve(true),
      },
    ]);
  });
}

export default function PeriodScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const periodId = isNew ? null : Number(id);

  const [form, setForm] = useState<Form>(() => ({
    ...EMPTY_FORM,
    startDate: isNew ? todayLocal() : null,
  }));
  const [periods, setPeriods] = useState<CaloriePeriod[]>([]);
  const [loaded, setLoaded] = useState(isNew);
  const [notFound, setNotFound] = useState(false);
  const [errors, setErrors] = useState<PeriodErrors>({});
  const [overlapError, setOverlapError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [all, existing] = await Promise.all([
        listPeriods(db),
        periodId === null ? Promise.resolve(null) : getPeriod(db, periodId),
      ]);
      if (!active) return;
      setPeriods(all);
      if (periodId !== null) {
        if (!existing) {
          setNotFound(true);
        } else {
          setForm({
            startDate: existing.startDate,
            endDate: existing.endDate,
            targetKcal: String(existing.targetKcal),
            label: existing.label,
            reason: existing.reason ?? "",
          });
        }
        setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [db, periodId]);

  const update =
    <K extends keyof Form>(key: K) =>
    (value: Form[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
      setOverlapError(null);
    };

  const save = async () => {
    const draft = {
      startDate: form.startDate ?? "",
      endDate: form.endDate,
      targetKcal: parseDecimal(form.targetKcal) ?? Number.NaN,
      label: form.label.trim(),
      reason: form.reason.trim() === "" ? null : form.reason.trim(),
    };
    const fieldErrors = validatePeriodDraft(draft);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    const input: PeriodInput = draft;

    const plan = planPeriodSave(periods, input, periodId);
    if (plan.kind === "overlap") {
      setOverlapError(
        `Overlaps ${describe(plan.period)}. Change the dates or edit that period first.`,
      );
      return;
    }
    if (plan.kind === "closePrevious") {
      const ok = await confirm(
        "End the current period?",
        `This will end "${plan.period.label}" on ${plan.endDate}, the day before this one starts.`,
        "Continue",
      );
      if (!ok) return;
      await insertPeriodClosingPrevious(
        db,
        { id: plan.period.id, endDate: plan.endDate },
        input,
      );
    } else if (periodId === null) {
      await insertPeriod(db, input);
    } else {
      await updatePeriod(db, periodId, input);
    }
    router.back();
  };

  const remove = async () => {
    if (periodId === null) return;
    const ok = await confirm(
      "Delete this period?",
      `"${form.label}" will be removed.`,
      "Delete",
      true,
    );
    if (!ok) return;
    await deletePeriod(db, periodId);
    router.back();
  };

  const title = isNew ? "New period" : "Edit period";

  if (notFound) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Stack.Screen options={{ title }} />
        <Text style={styles.muted}>This period no longer exists.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title }} />
      {loaded ? (
        <>
          <Field
            label="Label"
            value={form.label}
            onChangeText={update("label")}
            placeholder="e.g. Lean bulk"
            error={errors.label}
          />
          <Field
            label="Target (kcal/day)"
            value={form.targetKcal}
            onChangeText={update("targetKcal")}
            keyboardType="number-pad"
            placeholder="e.g. 2800"
            error={errors.targetKcal}
          />
          <DateField
            label="Start"
            value={form.startDate}
            onChange={update("startDate")}
            error={errors.startDate}
          />
          <DateField
            label="End"
            value={form.endDate}
            onChange={update("endDate")}
            allowOngoing
            defaultDate={form.startDate ?? undefined}
            error={errors.endDate}
          />
          <Field
            label="Reason (optional)"
            value={form.reason}
            onChangeText={update("reason")}
            placeholder="Why this change? e.g. rate stalled at +0.1 kg/week for 3 weeks"
            multiline
          />
          {overlapError ? (
            <Text style={styles.error}>{overlapError}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={save}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Save</Text>
          </Pressable>
          {isNew ? null : (
            <Pressable
              accessibilityRole="button"
              onPress={remove}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteText}>Delete period</Text>
            </Pressable>
          )}
        </>
      ) : (
        <Text style={styles.muted}>Loading…</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  muted: { color: colors.muted },
  error: { color: colors.danger },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  deleteButton: { paddingVertical: 12, alignItems: "center" },
  deleteText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
});
