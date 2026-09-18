import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadRuns, recordRun, renderTrend, trend } from '../src/history.js';

function tmpStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oss-bar-'));
  return path.join(dir, 'nested', 'runs.jsonl');
}

describe('recordRun + loadRuns round-trip', () => {
  it('writes and reads back entries', () => {
    const store = tmpStore();
    recordRun(store, { date: '2026-09-10', user: 'alice', total: 3 });
    recordRun(store, { date: '2026-09-17', user: 'alice', total: 5 });
    assert.deepEqual(loadRuns(store), [
      { date: '2026-09-10', user: 'alice', total: 3 },
      { date: '2026-09-17', user: 'alice', total: 5 },
    ]);
  });

  it('returns [] when the file does not exist', () => {
    const store = tmpStore();
    assert.deepEqual(loadRuns(store), []);
  });

  it('skips corrupt lines', () => {
    const store = tmpStore();
    recordRun(store, { date: '2026-09-10', user: 'alice', total: 3 });
    fs.appendFileSync(store, 'not-json\n{"incomplete":\n', 'utf8');
    recordRun(store, { date: '2026-09-17', user: 'alice', total: 5 });
    assert.deepEqual(loadRuns(store), [
      { date: '2026-09-10', user: 'alice', total: 3 },
      { date: '2026-09-17', user: 'alice', total: 5 },
    ]);
  });
});

describe('trend', () => {
  it('returns zeros when there are fewer than 2 runs', () => {
    assert.deepEqual(trend([]), { delta: 0, perWeek: 0, since: null });
    assert.deepEqual(trend([{ date: '2026-09-10', user: 'a', total: 3 }]), {
      delta: 0,
      perWeek: 0,
      since: null,
    });
  });

  it('computes delta and per-week rate from the last two runs', () => {
    const t = trend([
      { date: '2026-09-10', user: 'alice', total: 3 },
      { date: '2026-09-17', user: 'alice', total: 5 },
    ]);
    assert.equal(t.delta, 2);
    assert.equal(t.since, '2026-09-10');
    assert.ok(Math.abs(t.perWeek - 2) < 1e-9);
  });

  it('returns perWeek 0 when both runs share the same date', () => {
    const t = trend([
      { date: '2026-09-10', user: 'alice', total: 3 },
      { date: '2026-09-10', user: 'alice', total: 5 },
    ]);
    assert.deepEqual(t, { delta: 2, perWeek: 0, since: '2026-09-10' });
  });
});

describe('renderTrend', () => {
  it('renders a single human-friendly line', () => {
    const out = renderTrend({ delta: 2, perWeek: 2, since: '2026-09-10' });
    assert.equal(out, '+2 since 2026-09-10 (~2.0/week)');
    assert.match(out, /^\+\d+ since \d{4}-\d{2}-\d{2} \(~[-\d.]+\/week\)$/);
    assert.ok(!out.includes('\n'));
  });

  it('keeps the YYYY-MM-DD date and one decimal rate', () => {
    const t = trend([
      { date: '2026-09-03', user: 'alice', total: 3 },
      { date: '2026-09-10', user: 'alice', total: 5 },
    ]);
    assert.equal(renderTrend(t), '+2 since 2026-09-03 (~2.0/week)');
  });

  it('handles the empty-trend case on one line', () => {
    const out = renderTrend(trend([]));
    assert.equal(typeof out, 'string');
    assert.ok(!out.includes('\n'));
  });
});
