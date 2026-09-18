/** Single-file HTML report renderer (no external deps, no CDN/fonts). */

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderHtml({ user, target, total, rows }) {
  const safeUser = escapeHtml(user);
  const safeTarget = escapeHtml(target);
  const safeTotal = escapeHtml(total);
  const numericTarget = Number(target);
  const numericTotal = Number(total);
  const percent =
    Number.isFinite(numericTarget) && numericTarget > 0 && Number.isFinite(numericTotal)
      ? Math.floor((numericTotal / numericTarget) * 100)
      : 0;
  const clamped = Math.min(100, Math.max(0, percent));
  const safePercent = escapeHtml(percent);
  const generatedAt = new Date().toISOString();
  const safeDate = escapeHtml(generatedAt);

  const bodyRows =
    rows.length === 0
      ? `        <tr><td colspan="2" class="empty">(none yet — no external merged PRs)</td></tr>`
      : rows
          .map(
            ({ repo, count }) =>
              `        <tr><td>${escapeHtml(repo)}</td><td class="num">${escapeHtml(count)}</td></tr>`,
          )
          .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>oss-bar for @${safeUser}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0; background: #f6f8fa; color: #1f2328; }
  main { max-width: 720px; margin: 2rem auto; padding: 1.5rem; background: #fff; border: 1px solid #d0d7de; border-radius: 12px; }
  h1 { margin-top: 0; font-size: 1.4rem; }
  .meta { color: #57606a; }
  .bar { height: 16px; background: #eaeef2; border-radius: 999px; overflow: hidden; margin: 0.75rem 0; }
  .fill { height: 100%; background: #1f883d; border-radius: 999px; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #d0d7de; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  th:last-child { text-align: right; }
  .empty { text-align: center; color: #57606a; }
  footer { margin-top: 1.5rem; font-size: 0.85rem; color: #57606a; }
</style>
</head>
<body>
<main>
<h1>oss-bar for @${safeUser}</h1>
<p class="meta">External merged PRs: ${safeTotal} / ${safeTarget}</p>
<div class="bar" role="progressbar" aria-valuenow="${safePercent}" aria-valuemin="0" aria-valuemax="100"><div class="fill" style="width: ${clamped}%"></div></div>
<p class="meta">${safePercent}%</p>
<table>
<thead><tr><th>Repo</th><th>PRs</th></tr></thead>
<tbody>
${bodyRows}
</tbody>
</table>
<footer>Generated at ${safeDate}</footer>
</main>
</body>
</html>
`;
}
