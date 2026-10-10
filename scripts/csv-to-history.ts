// LATER: unit tests for parseCsv/convert.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { isRealDate } from "../mobile/src/domain/dates.ts";
import { FLAGS, isFlag } from "../mobile/src/domain/flags.ts";
import type { Flag } from "../mobile/src/domain/flags.ts";

const OUTPUT = join(
  import.meta.dirname,
  "..",
  "mobile",
  "data",
  "history.json",
);
const HEADER = ["date", "weight_kg", "calories_kcal", "flags", "note"];

// Same shape as ImportRow in mobile/src/db/dailyEntries.ts.
type HistoryRow = {
  date: string;
  weightKg: number | null;
  caloriesKcal: number | null;
  flags: Flag[];
  note: string | null;
};

function parseCsv(text: string): { line: number; fields: string[] }[] {
  const records: { line: number; fields: string[] }[] = [];
  let fields: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let recordLine = 1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        if (ch === "\n") line++;
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === ",") {
      fields.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      fields.push(field);
      records.push({ line: recordLine, fields });
      fields = [];
      field = "";
      line++;
      recordLine = line;
    } else {
      field += ch;
    }
  }
  if (field !== "" || fields.length > 0) {
    fields.push(field);
    records.push({ line: recordLine, fields });
  }
  return records.filter(
    (r) => !(r.fields.length === 1 && r.fields[0].trim() === ""),
  );
}

function convert(text: string): { rows: HistoryRow[]; errors: string[] } {
  const errors: string[] = [];
  const records = parseCsv(text.replace(/^﻿/, ""));
  const [header, ...body] = records;

  const headerFields = header?.fields.map((f) => f.trim());
  if (!headerFields || headerFields.join(",") !== HEADER.join(",")) {
    return {
      rows: [],
      errors: [
        `line 1: header must be "${HEADER.join(",")}", got "${headerFields?.join(",") ?? ""}"`,
      ],
    };
  }

  const rows: HistoryRow[] = [];
  const seen = new Map<string, number>();

  for (const { line, fields } of body) {
    const err = (msg: string) => errors.push(`line ${line}: ${msg}`);
    if (fields.length !== HEADER.length) {
      err(`expected ${HEADER.length} columns, got ${fields.length}`);
      continue;
    }
    const [dateRaw, weightRaw, caloriesRaw, flagsRaw, noteRaw] = fields.map(
      (f) => f.trim(),
    );

    if (!isRealDate(dateRaw))
      err(`date "${dateRaw}" is not a real YYYY-MM-DD date`);
    else if (seen.has(dateRaw))
      err(`date ${dateRaw} already used on line ${seen.get(dateRaw)}`);
    else seen.set(dateRaw, line);

    let weightKg: number | null = null;
    if (weightRaw !== "") {
      weightKg = /^\d+(\.\d+)?$/.test(weightRaw) ? Number(weightRaw) : NaN;
      if (!(weightKg > 0))
        err(
          `weight_kg "${weightRaw}" must be a number > 0 with a decimal point (e.g. 78.4)`,
        );
    }

    let caloriesKcal: number | null = null;
    if (caloriesRaw !== "") {
      caloriesKcal = /^\d+$/.test(caloriesRaw) ? Number(caloriesRaw) : NaN;
      if (Number.isNaN(caloriesKcal))
        err(`calories_kcal "${caloriesRaw}" must be a whole number >= 0`);
    }

    const flags: Flag[] = [];
    for (const key of flagsRaw
      .split(";")
      .map((f) => f.trim())
      .filter(Boolean)) {
      if (!isFlag(key))
        err(`unknown flag "${key}" (known: ${FLAGS.join(", ")})`);
      else if (!flags.includes(key)) flags.push(key);
    }

    rows.push({
      date: dateRaw,
      weightKg,
      caloriesKcal,
      flags,
      note: noteRaw === "" ? null : noteRaw,
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return { rows, errors };
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error(
      "usage: node --experimental-strip-types --no-warnings scripts/csv-to-history.ts <input.csv>",
    );
    process.exit(2);
  }

  const { rows, errors } = convert(readFileSync(input, "utf8"));
  if (errors.length > 0) {
    console.error(`${errors.length} problem(s) in ${input}, nothing written:`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify({ rows }, null, 2) + "\n");
  const range =
    rows.length > 0
      ? `, from ${rows[0].date} to ${rows[rows.length - 1].date}`
      : "";
  console.log(`${rows.length} rows${range} -> ${OUTPUT}`);
}

main();
