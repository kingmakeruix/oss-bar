const API = 'https://api.github.com';

/**
 * List repos owned by `username` (single page, sorted by recent update).
 * Returns `{ name, stars, forks, url }` per repo.
 */
export async function fetchOwnedRepos(username, { token } = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'oss-bar',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${API}/users/${username}/repos?per_page=100&type=owner&sort=updated`;
  const res = await fetch(url, { headers });
  if (res.status === 403) {
    throw new Error('GitHub API rate limit hit. Set GH_TOKEN or GITHUB_TOKEN and retry.');
  }
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return (data ?? []).map((repo) => ({
    name: repo.name,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    url: repo.html_url,
  }));
}

/** Render owned repos sorted by stars descending, one line per repo. */
export function renderMaintainer(username, repos) {
  const sorted = [...repos].sort((a, b) => b.stars - a.stars);
  const lines = [
    `maintainer report for @${username}`,
    `Owned repos: ${sorted.length}`,
    '',
    'By repo (stars desc):',
  ];
  if (sorted.length === 0) {
    lines.push('  (no owned repos found)');
  }
  for (const repo of sorted) {
    lines.push(`  ${repo.name}  ★${repo.stars}  forks:${repo.forks}`);
  }
  return lines.join('\n');
}
