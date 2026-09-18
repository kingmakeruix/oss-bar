export const ACTIVE_CONTRIBUTOR_BAR = 100;

/** `https://api.github.com/repos/OWNER/REPO` -> `OWNER/REPO`. */
export function repoFullName(repositoryUrl) {
  return repositoryUrl.replace('https://api.github.com/repos/', '');
}

/** Count merged PRs into repos the user does not own, grouped by repo. */
export function aggregateExternalPRs(items, username) {
  const lower = username.toLowerCase();
  const byRepo = new Map();
  for (const item of items) {
    const fullName = repoFullName(item.repository_url);
    if (fullName.toLowerCase().startsWith(`${lower}/`)) {
      continue;
    }
    byRepo.set(fullName, (byRepo.get(fullName) ?? 0) + 1);
  }
  return [...byRepo.entries()]
    .map(([repo, count]) => ({ repo, count }))
    .sort((a, b) => b.count - a.count);
}

export function totalCount(rows) {
  return rows.reduce((sum, row) => sum + row.count, 0);
}

export function progressBar(count, target, width = 20) {
  const filled = Math.min(width, Math.round((count / target) * width));
  return `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}]`;
}

export function renderReport(username, rows, target = ACTIVE_CONTRIBUTOR_BAR) {
  const total = totalCount(rows);
  const lines = [
    `oss-bar for @${username} (merged PRs, last 12 months)`,
    `External merged PRs: ${total} / ${target} (Claude "active contributor" bar)`,
    `${progressBar(total, target)} ${Math.floor((total / target) * 100)}%`,
    '',
    'By repo:',
  ];
  if (rows.length === 0) {
    lines.push('  (none yet — see a good-first-issue list and start small)');
  }
  for (const { repo, count } of rows) {
    lines.push(`  ${repo}  ${count}`);
  }
  return lines.join('\n');
}

/** List external PRs as `title` + `html_url` lines (own repos excluded). */
export function renderList(items, username) {
  const lower = username.toLowerCase();
  const lines = ['PRs:'];
  let count = 0;
  for (const item of items) {
    const fullName = repoFullName(item.repository_url);
    if (fullName.toLowerCase().startsWith(`${lower}/`)) {
      continue;
    }
    lines.push(`  ${item.title}  ${item.html_url}`);
    count += 1;
  }
  if (count === 0) {
    lines.push('  (none)');
  }
  return lines.join('\n');
}
