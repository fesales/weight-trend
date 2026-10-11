import { addDays, type DateString } from "../dates";

export type DayRow = {
  date: DateString;
  weightKg: number | null;
  caloriesKcal: number | null;
};

export type Series = {
  weights: Map<DateString, number>;
  calories: Map<DateString, number>;
};

export function toSeries(rows: DayRow[]): Series {
  const weights = new Map<DateString, number>();
  const calories = new Map<DateString, number>();
  for (const row of rows) {
    if (row.weightKg !== null) weights.set(row.date, row.weightKg);
    if (row.caloriesKcal !== null) calories.set(row.date, row.caloriesKcal);
  }
  return { weights, calories };
}

export type WindowStats = { average: number | null; count: number };

export function windowStats(
  values: Map<DateString, number>,
  from: DateString,
  to: DateString,
): WindowStats {
  let sum = 0;
  let count = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const value = values.get(day);
    if (value !== undefined) {
      sum += value;
      count++;
    }
  }
  return { average: count > 0 ? sum / count : null, count };
}

export function windowAverage(
  values: Map<DateString, number>,
  from: DateString,
  to: DateString,
  minCount: number,
): number | null {
  const { average, count } = windowStats(values, from, to);
  return count >= minCount ? average : null;
}
