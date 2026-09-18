import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateExternalPRs,
  progressBar,
  renderReport,
  repoFullName,
  totalCount,
} from '../src/report.js';

describe('repoFullName', () => {
  it('strips the API prefix', () => {
    assert.equal(repoFullName('https://api.github.com/repos/vitejs/vite'), 'vitejs/vite');
  });
});

describe('aggregateExternalPRs', () => {
  const items = [
    { repository_url: 'https://api.github.com/repos/vitejs/vite' },
    { repository_url: 'https://api.github.com/repos/vitejs/vite' },
    { repository_url: 'https://api.github.com/repos/Kingmakeruix/oss-bar' },
    { repository_url: 'https://api.github.com/repos/frappe/frappe-ui' },
  ];

  it('excludes the user own repos and groups the rest', () => {
    assert.deepEqual(aggregateExternalPRs(items, 'kingmakeruix'), [
      { repo: 'vitejs/vite', count: 2 },
      { repo: 'frappe/frappe-ui', count: 1 },
    ]);
  });

  it('returns an empty list when there are no external PRs', () => {
    assert.deepEqual(aggregateExternalPRs([], 'kingmakeruix'), []);
  });
});

describe('totalCount', () => {
  it('sums per-repo counts', () => {
    assert.equal(totalCount([{ repo: 'a/b', count: 2 }, { repo: 'c/d', count: 3 }]), 5);
  });
});

describe('progressBar', () => {
  it('renders a 20-char bar capped at full', () => {
    assert.equal(progressBar(7, 100), '[#-------------------]');
    assert.equal(progressBar(150, 100), '[####################]');
  });
});

describe('renderReport', () => {
  it('shows total, bar, and per-repo rows', () => {
    const out = renderReport('kingmakeruix', [{ repo: 'vitejs/vite', count: 2 }], 100);
    assert.match(out, /External merged PRs: 2 \/ 100/);
    assert.match(out, /vitejs\/vite  2/);
  });
});
