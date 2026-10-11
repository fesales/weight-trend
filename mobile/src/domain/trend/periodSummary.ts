import { addDays, daysBetween, type DateString } from "../dates";
import type { TrendPeriod } from "./calories";
import { MIN_DAYS_PER_WINDOW } from "./rates";
import { windowAverage, windowStats, type Series } from "./series";

export const MIN_PERIOD_DAYS = 14;

export type PeriodSummary = {
  id: number;
  label: string;
  startDate: DateString;
  endDate: DateString | null;
  reason: string | null;
  targetKcal: number;
  avgIntakeKcal: number | null;
  intakeDays: number;
  startWeightKg: number | null;
  endWeightKg: number | null;
  rateKgPerWeek: number | null;
};

export function summarisePeriod(
  series: Series,
  period: TrendPeriod,
  today: DateString,
): PeriodSummary {
  const end =
    period.endDate === null || period.endDate > today ? today : period.endDate;
  const intakeEnd = end < today ? end : addDays(today, -1);
  const intake = windowStats(series.calories, period.startDate, intakeEnd);

  const base = {
    id: period.id,
    label: period.label,
    startDate: period.startDate,
    endDate: period.endDate,
    reason: period.reason,
    targetKcal: period.targetKcal,
    avgIntakeKcal: intake.average,
    intakeDays: intake.count,
  };

  const lengthDays =
    period.startDate <= end ? daysBetween(period.startDate, end) + 1 : 0;
  if (lengthDays < MIN_PERIOD_DAYS) {
    return {
      ...base,
      startWeightKg: null,
      endWeightKg: null,
      rateKgPerWeek: null,
    };
  }

  const startWeightKg = windowAverage(
    series.weights,
    period.startDate,
    addDays(period.startDate, 6),
    MIN_DAYS_PER_WINDOW,
  );
  const endWeightKg = windowAverage(
    series.weights,
    addDays(end, -6),
    end,
    MIN_DAYS_PER_WINDOW,
  );
  const weeksBetweenWindows = (lengthDays - 7) / 7;
  const rateKgPerWeek =
    startWeightKg === null || endWeightKg === null
      ? null
      : (endWeightKg - startWeightKg) / weeksBetweenWindows;

  return { ...base, startWeightKg, endWeightKg, rateKgPerWeek };
}

export function summarisePeriods(
  series: Series,
  periods: TrendPeriod[],
  today: DateString,
): PeriodSummary[] {
  return [...periods]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((period) => summarisePeriod(series, period, today));
}
