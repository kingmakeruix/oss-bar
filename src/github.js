import fs from 'node:fs';
import path from 'node:path';

const API = 'https://api.github.com';

/**
 * Üstsel bekleme süresini hesaplar (pure fonksiyon).
 * attempt 1-tabanlıdır: 1 -> 1000ms, 2 -> 2000ms, 3 -> 4000ms ...
 */
export function backoffMs(attempt) {
  return 1000 * 2 ** (attempt - 1);
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(res) {
  try {
    const headers = res?.headers;
    if (!headers) {
      return null;
    }
    let value = null;
    if (typeof headers.get === 'function') {
      value = headers.get('Retry-After');
    } else if (typeof headers === 'object') {
      value =
        headers['Retry-After'] ??
        headers['retry-after'] ??
        headers['Retry-after'];
    }
    if (value == null) {
      return null;
    }
    const seconds = Number.parseInt(String(value).trim(), 10);
    if (Number.isNaN(seconds) || seconds < 0) {
      return null;
    }
    return seconds * 1000;
  } catch {
    return null;
  }
}

function isRetryableStatus(status) {
  return status === 403 || (status >= 500 && status <= 599);
}

/**
 * Search merged PRs authored by `username` since `since` (ISO date).
 * Returns search API items (up to `maxPages * 100`).
 */
export async function searchMergedPRs(
  username,
  since,
  { token, maxPages = 5, cacheDir, maxAgeSec = 3600, sleep = defaultSleep } = {},
) {
  let cachePath = null;
  if (cacheDir) {
    cachePath = path.join(cacheDir, `search-${username}-${since}.json`);
    try {
      const stat = fs.statSync(cachePath);
      const ageSec = (Date.now() - stat.mtimeMs) / 1000;
      if (ageSec < maxAgeSec) {
        const raw = fs.readFileSync(cachePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        // Bozuk önbellek: miss say, ağdan çek.
      } else if (err?.code !== 'ENOENT') {
        // ENOENT dışında dosya yokluğu benzeri durumlar da miss sayılır
        // (örn. dizin yok). Beklenmeyen hatalarda da ağa düşmek için
        // miss kabul et; ancak ENOENT değilse ve stat/read hatasıysa
        // yine de miss sayıyoruz.
        const code = err?.code;
        if (
          code !== 'ENOENT' &&
          !(err instanceof Error && err.message.includes('ENOENT'))
        ) {
          // Dosya var ama okunamadı/stat alınamadı: miss olarak devam et.
        }
      }
      // miss -> ağdan devam
    }
  }

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
    let res;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      res = await fetch(url, { headers });
      if (res.ok) {
        break;
      }
      if (!isRetryableStatus(res.status)) {
        if (res.status === 403) {
          throw new Error('GitHub API rate limit hit. Set GH_TOKEN or GITHUB_TOKEN and retry.');
        }
        throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
      }
      // Retryable (403 veya 5xx)
      if (attempt === 3) {
        if (res.status === 403) {
          throw new Error('GitHub API rate limit hit. Set GH_TOKEN or GITHUB_TOKEN and retry.');
        }
        throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
      }
      const retryAfterMs = getRetryAfterMs(res);
      const delay = retryAfterMs != null ? retryAfterMs : backoffMs(attempt);
      // eslint-disable-next-line no-await-in-loop
      await sleep(delay);
    }
    const data = await res.json();
    items.push(...(data.items ?? []));
    if ((data.items ?? []).length < 100) {
      break;
    }
  }

  if (cachePath) {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(items), 'utf8');
  }

  return items;
}
