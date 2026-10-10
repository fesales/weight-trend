// The one place the flag list lives. Order here is display order.
export const FLAGS = [
  "alcohol",
  "salty_or_high_carb_meal",
  "late_meal",
  "poor_sleep",
  "illness",
  "travel",
  "hard_training",
] as const;

export type Flag = (typeof FLAGS)[number];

export function isFlag(value: unknown): value is Flag {
  return (
    typeof value === "string" && (FLAGS as readonly string[]).includes(value)
  );
}
