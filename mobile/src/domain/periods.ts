import { addDays, isRealDate, type DateString } from "./dates";

export type PeriodRange = {
  id: number;
  label: string;
  startDate: DateString;
  endDate: DateString | null;
};

export type PeriodDraft = {
  startDate: DateString;
  endDate: DateString | null;
  targetKcal: number;
  label: string;
  reason: string | null;
};

const OPEN_END = "9999-12-31";

function overlaps(a: Omit<PeriodRange, "id" | "label">, b: Omit<PeriodRange, "id" | "label">): boolean {
  return a.startDate <= (b.endDate ?? OPEN_END) && b.startDate <= (a.endDate ?? OPEN_END);
}

export function findOverlap(
  periods: PeriodRange[],
  candidate: Pick<PeriodRange, "startDate" | "endDate">,
  excludeId: number | null = null,
): PeriodRange | null {
  return periods.find((p) => p.id !== excludeId && overlaps(p, candidate)) ?? null;
}

export type SavePlan =
  | { kind: "ok" }
  | { kind: "closePrevious"; period: PeriodRange; endDate: DateString }
  | { kind: "overlap"; period: PeriodRange };

export function planPeriodSave(
  periods: PeriodRange[],
  candidate: Pick<PeriodRange, "startDate" | "endDate">,
  excludeId: number | null = null,
): SavePlan {
  const clash = findOverlap(periods, candidate, excludeId);
  if (!clash) return { kind: "ok" };

  const isNewCurrent = excludeId === null && candidate.endDate === null;
  if (isNewCurrent && clash.endDate === null && clash.startDate < candidate.startDate) {
    const endDate = addDays(candidate.startDate, -1);
    const closed = { ...clash, endDate };
    const others = periods.filter((p) => p.id !== clash.id);
    const stillClashing = findOverlap([closed, ...others], candidate, excludeId);
    if (!stillClashing) return { kind: "closePrevious", period: clash, endDate };
    return { kind: "overlap", period: stillClashing };
  }
  return { kind: "overlap", period: clash };
}

export const TARGET_KCAL_MIN = 500;
export const TARGET_KCAL_MAX = 10000;

export type PeriodErrors = Partial<Record<"startDate" | "endDate" | "targetKcal" | "label", string>>;

export function validatePeriodDraft(draft: PeriodDraft): PeriodErrors {
  const errors: PeriodErrors = {};
  if (!isRealDate(draft.startDate)) errors.startDate = "Pick a start date";
  if (draft.endDate !== null) {
    if (!isRealDate(draft.endDate)) errors.endDate = "Pick an end date";
    else if (!errors.startDate && draft.endDate < draft.startDate) errors.endDate = "End date is before the start";
  }
  if (
    !Number.isInteger(draft.targetKcal) ||
    draft.targetKcal < TARGET_KCAL_MIN ||
    draft.targetKcal > TARGET_KCAL_MAX
  ) {
    errors.targetKcal = `Whole number between ${TARGET_KCAL_MIN} and ${TARGET_KCAL_MAX}`;
  }
  if (draft.label.trim() === "") errors.label = "Give it a label";
  return errors;
}
