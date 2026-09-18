const API = 'https://api.github.com';

/**
 * Search merged PRs authored by `username` since `since` (ISO date).
 * Returns search API items (up to `maxPages * 100`).
 */
export async function searchMergedPRs(username, since, { token, maxPages = 5 } = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'oss-bar',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const items = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const query = `type:pr author:${username} is:merged merged:>=${since}`;
    const url = `${API}/search/issues?q=${encodeURIComponent(query)}&per_page=100&page=${page}`;
    const res = await fetch(url, { headers });
    if (res.status === 403) {
      throw new Error('GitHub API rate limit hit. Set GH_TOKEN or GITHUB_TOKEN and retry.');
    }
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    items.push(...(data.items ?? []));
    if ((data.items ?? []).length < 100) {
      break;
    }
  }
  return items;
}
