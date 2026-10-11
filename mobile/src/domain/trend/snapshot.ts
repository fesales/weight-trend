import type { DateString } from "../dates";
import {
  calorieAverage7,
  periodOn,
  type CalorieAverage,
  type TrendPeriod,
} from "./calories";
import { distanceToTarget, weeksToTarget } from "./goal";
import { summarisePeriods, type PeriodSummary } from "./periodSummary";
import { avg7, currentWeight, rate14, rate21, weeklyRate } from "./rates";
import { toSeries, type DayRow } from "./series";
import { computeStatus, computeTrend, type Status, type Trend } from "./status";
import { weeklyAverages, type WeeklyAverage } from "./weekly";

export type TrendSettings = {
  targetWeightKg: number | null;
  targetRateKgPerWeek: number | null;
  rateToleranceKgPerWeek: number;
};

export type TrendSnapshot = {
  today: DateString;
  avg7Kg: number | null;
  currentWeightKg: number | null;
  rates: {
    weeklyKgPerWeek: number | null;
    rate14KgPerWeek: number | null;
    rate21KgPerWeek: number | null;
  };
  trend: Trend | null;
  status: Status;
  target: {
    weightKg: number | null;
    rateKgPerWeek: number | null;
    toleranceKgPerWeek: number;
    distanceKg: number | null;
    weeksToTarget: number | null;
  };
  calories: CalorieAverage;
  currentPeriod: TrendPeriod | null;
  weeklyAverages: WeeklyAverage[];
  periodSummaries: PeriodSummary[];
};

// LATER (step 9): pair each weigh-in on D with D-1 calories/flags for the payload rows.
export function computeSnapshot(input: {
  rows: DayRow[];
  periods: TrendPeriod[];
  settings: TrendSettings;
  today: DateString;
}): TrendSnapshot {
  const { rows, periods, settings, today } = input;
  const series = toSeries(rows);
  const current = currentWeight(series, today);
  const r14 = rate14(series, today);
  const distanceKg = distanceToTarget(current, settings.targetWeightKg);

  return {
    today,
    avg7Kg: avg7(series, today),
    currentWeightKg: current,
    rates: {
      weeklyKgPerWeek: weeklyRate(series, today),
      rate14KgPerWeek: r14,
      rate21KgPerWeek: rate21(series, today),
    },
    trend: computeTrend(r14, settings.rateToleranceKgPerWeek),
    status: computeStatus(
      r14,
      settings.targetRateKgPerWeek,
      settings.rateToleranceKgPerWeek,
    ),
    target: {
      weightKg: settings.targetWeightKg,
      rateKgPerWeek: settings.targetRateKgPerWeek,
      toleranceKgPerWeek: settings.rateToleranceKgPerWeek,
      distanceKg,
      weeksToTarget: weeksToTarget(distanceKg, r14),
    },
    calories: calorieAverage7(series, periods, today),
    currentPeriod: periodOn(today, periods),
    weeklyAverages: weeklyAverages(series),
    periodSummaries: summarisePeriods(series, periods, today),
  };
}
