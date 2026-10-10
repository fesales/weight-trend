// Some Android keyboards only offer a decimal comma.
export function parseDecimal(input: string): number | null {
  const value = input.trim().replace(",", ".");
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(value)) return null;
  return Number(value);
}
