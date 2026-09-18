import fs from 'node:fs';
import path from 'node:path';

/** Append a `{ date: 'YYYY-MM-DD', user, total }` entry as one JSONL line. */
export function recordRun(storePath, entry) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.appendFileSync(storePath, `${JSON.stringify(entry)}\n`, 'utf8');
}

/** Read JSONL runs, skipping corrupt lines. Returns `[]` when file is missing. */
export function loadRuns(storePath) {
  let raw;
  try {
    raw = fs.readFileSync(storePath, 'utf8');
  } catch {
    return [];
  }
  const runs = [];
  for (const line of raw.split('\n')) {
    if (line.trim() === '') {
      continue;
    }
    try {
      runs.push(JSON.parse(line));
    } catch {
      continue;
    }
  }
  return runs;
}

/** Compare the last two runs: `{ delta, perWeek, since }`. `since` is the earlier `YYYY-MM-DD`. */
export function trend(runs) {
  if (!Array.isArray(runs) || runs.length < 2) {
    return { delta: 0, perWeek: 0, since: null };
  }
  const prev = runs[runs.length - 2];
  const last = runs[runs.length - 1];
  const delta = last.total - prev.total;
  const dayDiff = (new Date(last.date) - new Date(prev.date)) / 86400000;
  if (!(dayDiff > 0)) {
    return { delta, perWeek: 0, since: prev.date };
  }
  return { delta, perWeek: delta / (dayDiff / 7), since: prev.date };
}

/** One-line human-friendly trend, e.g. `+2 since 2026-09-10 (~0.3/week)`. */
export function renderTrend(t) {
  if (!t || t.since == null) {
    return 'no trend yet (need at least 2 runs)';
  }
  const signed = t.delta >= 0 ? `+${t.delta}` : `${t.delta}`;
  return `${signed} since ${t.since} (~${t.perWeek.toFixed(1)}/week)`;
}
