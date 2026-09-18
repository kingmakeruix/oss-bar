export const ACTIVE_CONTRIBUTOR_BAR = 100;

/**
 * Wrap `text` in an ANSI color code (e.g. 32 = green, 33 = yellow).
 * Returns `text` unchanged when the `NO_COLOR` env variable is set.
 */
export function colorize(code, text) {
  if (process.env.NO_COLOR !== undefined) {
    return text;
  }
  return `\x1b[${code}m${text}\x1b[0m`;
}

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

/**
 * Pace helper: how many merged PRs per week are still needed.
 * Assumes a 52-week year; `weeksElapsed` is how many weeks have passed.
 * Pure function, safe against division by zero.
 */
export function paceInfo(total, target, weeksElapsed = 1) {
  const t = Number(total);
  const g = Number(target);
  const w = Number(weeksElapsed);
  if (!Number.isFinite(t) || !Number.isFinite(g)) {
    return { perWeekNeeded: 0 };
  }
  const remaining = Math.max(0, g - t);
  if (remaining === 0) {
    return { perWeekNeeded: 0 };
  }
  const elapsed = Number.isFinite(w) ? w : 1;
  const remainingWeeks = 52 - elapsed;
  if (!Number.isFinite(remainingWeeks) || remainingWeeks <= 0) {
    return { perWeekNeeded: remaining };
  }
  return { perWeekNeeded: remaining / remainingWeeks };
}

export function renderReport(username, rows, target = ACTIVE_CONTRIBUTOR_BAR) {
  const total = totalCount(rows);
  const percent = target > 0 && Number.isFinite(total) && Number.isFinite(target)
    ? Math.floor((total / target) * 100)
    : 0;
  const percentText = `${percent}%`;
  const percentRendered = percent < 50 ? colorize(33, percentText) : percentText;

  const plainBar = progressBar(total, target);
  const coloredBar = plainBar.replace(/#+/g, (m) => colorize(32, m));

  const lines = [
    colorize(32, `oss-bar for @${username} (merged PRs, last 12 months)`),
    `External merged PRs: ${total} / ${target} (Claude "active contributor" bar)`,
    `${coloredBar} ${percentRendered}`,
    '',
    'By repo:',
  ];
  if (rows.length === 0) {
    lines.push('  (none yet — see a good-first-issue list and start small)');
  } else {
    const repoWidth = Math.max(...rows.map((r) => r.repo.length));
    const countWidth = Math.max(...rows.map((r) => String(r.count).length));
    for (const { repo, count } of rows) {
      lines.push(`  ${repo.padEnd(repoWidth)}  ${String(count).padStart(countWidth)}`);
    }
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
