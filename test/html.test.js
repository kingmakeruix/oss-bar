import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, renderHtml } from '../src/html.js';

describe('escapeHtml', () => {
  it('escapes <>&"\'', () => {
    assert.equal(escapeHtml(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;');
  });
});

describe('renderHtml', () => {
  it('neutralizes repo names containing <script>', () => {
    const html = renderHtml({
      user: 'alice',
      target: 100,
      total: 1,
      rows: [{ repo: '<script>alert("x")</script>/evil', count: 1 }],
    });
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });

  it('shows the bar percentage as text', () => {
    const html = renderHtml({
      user: 'alice',
      target: 100,
      total: 7,
      rows: [{ repo: 'vitejs/vite', count: 7 }],
    });
    assert.ok(html.includes('7%'));
    assert.match(html, /width:\s*7%/);
  });

  it('renders one table row per input row', () => {
    const rows = [
      { repo: 'vitejs/vite', count: 2 },
      { repo: 'frappe/frappe-ui', count: 1 },
      { repo: 'nodejs/node', count: 5 },
    ];
    const html = renderHtml({ user: 'alice', target: 100, total: 8, rows });
    const tbody = html.split('<tbody>')[1].split('</tbody>')[0];
    const trCount = (tbody.match(/<tr>/g) ?? []).length;
    assert.equal(trCount, rows.length);
    for (const { repo } of rows) {
      assert.ok(html.includes(repo));
    }
  });

  it('shows an info line when rows is empty', () => {
    const html = renderHtml({ user: 'bob', target: 100, total: 0, rows: [] });
    assert.match(html, /\(none/i);
  });
});
