import { startOfWeek, type DateString } from "../dates";
import type { Series } from "./series";

export type WeeklyAverage = {
  weekStart: DateString;
  avgWeightKg: number | null;
  weighIns: number;
  avgCaloriesKcal: number | null;
  calorieDays: number;
};

type Totals = {
  weight: number;
  weighIns: number;
  kcal: number;
  kcalDays: number;
};

export function weeklyAverages(series: Series): WeeklyAverage[] {
  const weeks = new Map<DateString, Totals>();
  const totalsFor = (date: DateString) => {
    const week = startOfWeek(date);
    let totals = weeks.get(week);
    if (!totals) {
      totals = { weight: 0, weighIns: 0, kcal: 0, kcalDays: 0 };
      weeks.set(week, totals);
    }
    return totals;
  };

  for (const [date, kg] of series.weights) {
    const totals = totalsFor(date);
    totals.weight += kg;
    totals.weighIns++;
  }
  for (const [date, kcal] of series.calories) {
    const totals = totalsFor(date);
    totals.kcal += kcal;
    totals.kcalDays++;
  }

  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, t]) => ({
      weekStart,
      avgWeightKg: t.weighIns > 0 ? t.weight / t.weighIns : null,
      weighIns: t.weighIns,
      avgCaloriesKcal: t.kcalDays > 0 ? t.kcal / t.kcalDays : null,
      calorieDays: t.kcalDays,
    }));
}
