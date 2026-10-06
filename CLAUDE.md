# Weight Trend App

Personal Android app that gives me a short daily summary of my weight trend against my goal. For my own use only. Not going on the Play Store.

## Current step

v0, step 2 done. Next: step 3, history import. (Update this line as we go.)

## How to work with me

- I'm a senior frontend/mobile dev (React, React Native, TypeScript, Node). No need to explain basics.
- Go one step at a time from the v0 plan below. Stop at the end of each step so I can review.
- Before writing code for a step, briefly say what you're about to do and any decision worth flagging (library choice, data shape, trade-offs). Keep it short.
- Don't add a dependency without saying why. Prefer fewer libraries.
- Don't jump ahead to "later" features, even if it seems easy. Leave a `// LATER:` comment if something is worth noting.
- Small, focused commits, one per step or sub-step.

## v0 goal

Open the app each morning, type in three things, and get a short analysis of where my weight trend stands against my goal. History is imported once from my own export.

### In scope for v0

1. **History import**: a one-time import of my past data from a CSV I prepare, converted to JSON and bundled with the app. Seeded into the database on first launch.
2. **Settings**: target weight, target weekly rate of change, and calorie periods (with the reason for each change).
3. **Daily form**: today's weight, yesterday's total calories, fluctuation flags, optional note.
4. **Local storage**: SQLite on the device. This is the source of truth.
5. **Trend maths in code**: 7-day average, weekly rate, distance to target, calorie average vs target, per-period summaries.
6. **Daily analysis**: the app sends its data and computed numbers to a small Node server, which builds the prompt, calls the LLM and returns a structured result. The app shows it.
7. **History screen**: simple list of past days. No charts yet.

### Not in v0 (later)

- Health Connect (reading weight and nutrition automatically). Needs a dev build and native code.
- Morning background job and the background read permission.
- Health Connect history permission (more than 30 days).
- Charts.
- File picker import or re-import from the app.
- Storing user data on the server (only request/response logs in v0).
- Longer-range history analysis.
- Notifications.

The data model should make the Health Connect switch easy later, but don't build anything for it now.

## Tech stack

- Expo (latest SDK), React Native, TypeScript, Expo Router.
- Android only for v0; iOS may come later, so avoid Android-only assumptions outside Health Connect. v0 runs in Expo Go, so no native modules.
- Routes live in `mobile/src/app/` (Expo Router); non-route code goes elsewhere under `mobile/src/`. `@/*` maps to `mobile/src/*`.
- `expo-sqlite` for storage. Plain SQL unless there's a good reason for an ORM (Drizzle is the one to consider if so).
- Jest for unit tests on the maths.
- Server: Node, Express, TypeScript.
- Zod (or similar) to validate the LLM's structured output on the server.

## Repo layout

```
/mobile    Expo app
/server    Node server (holds the API key, builds the prompt, calls the LLM)
/scripts   one-off scripts, e.g. CSV to JSON for the history import
/fixtures  sample data for tests
```

No monorepo tooling. Two separate packages.

## Core rules

These matter more than anything else here.

- **Maths in code, interpretation by the model.** The model only explains numbers and makes suggestions. It never calculates them.
- **The app owns the maths. The server owns the prompt.** The app computes every number (it needs them on screen anyway, and they shouldn't depend on the server being up). The server decides what goes into the prompt, how much history to include, and which model to call, so those can change without rebuilding the app.
- **The phone is the source of truth.** The server doesn't store user data in v0, only logs of requests and responses.
- **Calories are stored under the day they were eaten.** The daily form asks for "yesterday's calories" but saves them against yesterday's date. Same for flags and the note: they describe yesterday, since that's what affects this morning's weight.
- **Pairing happens in code**: a morning weigh-in on date D is matched with calories from D-1.
- **Flags don't change the maths.** The 7-day average and rate use every day. Flags go to the model so it can explain a jump instead of reacting to it.
- **Calorie suggestions only from 2–3 weeks of trend**, never from a single day. If there isn't enough data, the model says so and suggests no change.
- **Each weigh-in is matched to the calorie period it falls in.**
- **Target and actual intake are always shown separately.** If the target is 2,800 but I averaged 2,550, the model should see both, so it doesn't blame the target for what's really adherence.
- **The API key never goes in the app.** Only the server has it.
- Units are kg and kcal. Dates are local `YYYY-MM-DD` strings.

## Data model

Schema lives in `mobile/src/db/migrations.ts` (append-only list; `PRAGMA user_version` tracks which have run). Data access is plain functions in `mobile/src/db/*` taking `db` from `useSQLiteContext()`.

**daily_entries** (one row per date)
- `date` TEXT primary key, `YYYY-MM-DD`
- `weight_kg` REAL, nullable (morning weigh-in on this date)
- `calories_kcal` INTEGER, nullable (calories eaten on this date)
- `flags` TEXT, JSON array of flag keys
- `note` TEXT, nullable
- `weight_source`, `calories_source` TEXT: `import` | `manual` (later `health_connect`), null when the value is null. Per field, because weight and calories may come from different places.
- `created_at`, `updated_at` (UTC ISO audit timestamps)
- Writes touch only their own columns: `saveWeighIn` sets weight; `saveIntake` sets calories, flags and note.

**calorie_periods**
- `id`, `start_date`, `end_date` (null = current, open-ended period), `target_kcal`, `label`
- `reason` TEXT, nullable: why this change was made, e.g. "rate stalled at +0.1 kg/week for 3 weeks"

**settings** (single row, `id = 1`)
- `target_weight_kg`, `target_rate_kg_per_week`, both null until set

**analyses** (cache, one per date, so reopening the app doesn't call the API again)
- `date`, `request_hash`, `request_json`, `response_json`, `created_at`
- `request_hash` is a fingerprint of the request; if it differs from the current data's, the cached analysis is stale (step 9).

**meta** (key/value for app state)
- `history_seeded_at`: set once the history import has run, so it never runs again (step 3).

### Flags (fixed list)

`alcohol`, `salty_or_high_carb_meal`, `late_meal`, `poor_sleep`, `illness`, `travel`, `hard_training`. Plus a free text note for anything else. The list lives in `mobile/src/domain/flags.ts`.

## History import format

I'll prepare a CSV with these columns:

```
date,weight_kg,calories_kcal,flags,note
2026-09-01,78.4,2750,"alcohol;late_meal",Friend's birthday
```

- `calories_kcal` is what I ate on that date.
- `flags` is semicolon-separated, using the keys above. Can be empty.
- A script in `/scripts` converts it to `mobile/data/history.json`.
- On first launch, the app upserts it by date with `source = import`.

Past calorie periods (with labels and reasons) are entered through the Settings screen, not the CSV.

## Trend maths

Pure functions in the app, unit tested against fixtures.

- 7-day average weight (from weigh-ins available in the last 7 days; needs at least 4).
- Weekly rate: this week's 7-day average minus last week's, in kg/week. Also a 14 and 21-day rate for a longer view.
- Distance to target weight, and rough weeks to target at the current rate.
- Average calories over the last 7 days vs the current period's target.
- Weekly averages (weight and calories per week) across all history.
- **Per-period summary** for every calorie period: label, dates, reason, target, actual average intake, average weight at the start and end, and the weekly rate during the period.
- Handle missing days without breaking. Return null rather than a made-up number when there isn't enough data.

## What the app sends to the server

- Settings (target weight, target rate) and the current calorie period.
- The computed numbers above, including weekly averages and per-period summaries.
- All daily rows (date, weight, calories, flags, note). This stays small (roughly 365 rows a year), and it lets the server change how much history it uses without an app update.

## Server

Responsibilities:
- `POST /analyse` takes the payload above.
- Decides what goes into the prompt. Default: all per-period summaries, the last 21 days as raw rows, and weekly averages for anything older.
- Builds the prompt, calls the LLM, validates the result with Zod and returns it.
- Logs each request and response (no other storage in v0).

Setup:
- API key in `server/.env`, gitignored.
- Simple shared token header on every request, so the endpoint isn't open to anyone who finds the URL.
- The app finds the server through `EXPO_PUBLIC_API_URL`.
- LLM provider to be decided at step 8.

**Hosting: decide before step 8.** Running on my laptop only works at home on the same network. If it needs to work anywhere, it should be hosted (e.g. Render, Fly.io, Railway or a Cloudflare Worker). Don't build anything that assumes localhost.

### Structured output

```ts
{
  trend: "gaining" | "losing" | "stable",
  status: "ahead" | "on_track" | "behind" | "not_enough_data",
  summary: string,          // 2–3 plain sentences
  flagsNote: string | null, // explains a jump if flags suggest a reason
  suggestion: string,
  calorieAdjustment: { kcal: number, reason: string } | null
}
```

`calorieAdjustment` is null unless there are at least 14 days of data and the trend is consistent. When it suggests a change, it should take past periods into account (what was tried before and what happened).

## v0 build steps

0. Repo setup: folders, `.gitignore`, this file.
1. Expo app scaffold with three tabs (Today, History, Settings). Runs in Expo Go on my phone.
2. SQLite schema and a small data layer.
3. History import: CSV to JSON script, seed on first launch.
4. Settings screen: target weight, target rate, calorie periods with reasons (add, edit, delete).
5. Trend maths as pure functions, with Jest tests using fixtures. Includes weekly averages and per-period summaries.
6. Today screen: daily form plus the computed numbers.
7. History screen: simple list of days.
8. Server: decide hosting and LLM provider first. Then Express, `/analyse`, prompt building, structured output, validation, logging, token check.
9. Connect the app to the server, show the analysis, cache it per day.

## Open questions

- Hosting for the server (before step 8).
- LLM provider and model (before step 8).
- Does the Health Connect background read permission work as expected on my Android version? (later)
- How much history to include in the prompt to keep cost low but still useful. The server makes this easy to tune.

### Raised in review, to decide when we reach the step

- (step 1/9) Expo Go loads the app from the laptop's dev server, so it won't open away from home. Use a standalone preview APK (EAS build, no native code) for daily use?
- (step 4) Calorie periods: overlap check on save; gaps allowed.
- (step 5) Exact rate definitions: rolling vs calendar weeks, and how the 14/21-day rates are calculated.
- (step 5) Sign convention for target rate (+ = gaining) and what ahead/behind means in each direction.
- (step 5) Period boundary: which period a day's calories and weigh-in belong to, given D-1 pairing and weight lag.
- (step 5/8) Compute `trend` and `status` in code instead of having the model produce them ("maths in code").
- (step 8) Enforce the 14-day rule for `calorieAdjustment` on the server after validation, not only in the prompt.
- (step 8) Server logs would contain all daily rows. Decide what gets logged, given the host keeps logs.
- (step 9) Expo/EAS account: the CLI is signed in as `warble-app`, but this project should use a different account. Decide between a per-project `EXPO_TOKEN` (gitignored `.envrc`) and a global switch before `eas init`.
