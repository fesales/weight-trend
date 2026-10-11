import type { Flag } from "@/domain/flags";

/** Local calendar date, `YYYY-MM-DD`. */
export type DateString = string;

// LATER: "health_connect"
export type ValueSource = "import" | "manual";

export type DailyEntry = {
  date: DateString;
  /** Morning weigh-in on this date. */
  weightKg: number | null;
  weightSource: ValueSource | null;
  /** Calories eaten on this date. */
  caloriesKcal: number | null;
  caloriesSource: ValueSource | null;
  /** Describe this date (what affects the next morning's weight). */
  flags: Flag[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaloriePeriod = {
  id: number;
  startDate: DateString;
  /** null = current, open-ended period. */
  endDate: DateString | null;
  targetKcal: number;
  label: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  targetWeightKg: number | null;
  targetRateKgPerWeek: number | null;
  rateToleranceKgPerWeek: number;
  updatedAt: string;
};

export type CachedAnalysis = {
  date: DateString;
  requestHash: string;
  requestJson: string;
  responseJson: string;
  createdAt: string;
};
