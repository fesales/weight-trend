import { addDays, type DateString } from "../dates";
import { MIN_DAYS_PER_WINDOW } from "./rates";
import { windowStats, type Series } from "./series";

export type TrendPeriod = {
  id: number;
  label: string;
  startDate: DateString;
  endDate: DateString | null;
  targetKcal: number;
  reason: string | null;
};

export function periodOn<P extends TrendPeriod>(
  date: DateString,
  periods: P[],
): P | null {
  return (
    periods.find(
      (p) => p.startDate <= date && (p.endDate === null || date <= p.endDate),
    ) ?? null
  );
}

export type CalorieAverage = {
  averageKcal: number | null;
  daysWithCalories: number;
  period: TrendPeriod | null;
};

export function calorieAverage7(
  series: Series,
  periods: TrendPeriod[],
  today: DateString,
): CalorieAverage {
  const yesterday = addDays(today, -1);
  const { average, count } = windowStats(
    series.calories,
    addDays(today, -7),
    yesterday,
  );
  return {
    averageKcal: count >= MIN_DAYS_PER_WINDOW ? average : null,
    daysWithCalories: count,
    period: periodOn(yesterday, periods),
  };
}
