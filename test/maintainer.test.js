import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchOwnedRepos, renderMaintainer } from '../src/maintainer.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function okReposResponse(repos) {
  return {
    status: 200,
    statusText: 'OK',
    ok: true,
    json: async () => repos,
  };
}

describe('fetchOwnedRepos', () => {
  it('alan eşleme: stargazers_count/forks_count/html_url alanlarını eşler', async () => {
    const apiRepos = [
      { name: 'alpha', stargazers_count: 42, forks_count: 7, html_url: 'https://github.com/octocat/alpha' },
      { name: 'beta', stargazers_count: 5, forks_count: 1, html_url: 'https://github.com/octocat/beta' },
    ];
    let capturedUrl;
    let capturedHeaders;
    globalThis.fetch = async (url, options) => {
      capturedUrl = url;
      capturedHeaders = options.headers;
      return okReposResponse(apiRepos);
    };

    const result = await fetchOwnedRepos('octocat');

    assert.deepEqual(result, [
      { name: 'alpha', stars: 42, forks: 7, url: 'https://github.com/octocat/alpha' },
      { name: 'beta', stars: 5, forks: 1, url: 'https://github.com/octocat/beta' },
    ]);
    assert.match(capturedUrl, /\/users\/octocat\/repos\?/);
    assert.match(capturedUrl, /per_page=100/);
    assert.match(capturedUrl, /type=owner/);
    assert.match(capturedUrl, /sort=updated/);
    assert.ok(!('Authorization' in capturedHeaders));
  });

  it('token verilince Authorization header eklenir', async () => {
    let capturedHeaders;
    globalThis.fetch = async (_url, options) => {
      capturedHeaders = options.headers;
      return okReposResponse([]);
    };

    await fetchOwnedRepos('octocat', { token: 'secret123' });

    assert.equal(capturedHeaders.Authorization, 'Bearer secret123');
  });

  it('403 yanıtında rate-limit hatası fırlatır (github.js ile aynı format)', async () => {
    globalThis.fetch = async () => ({
      status: 403,
      statusText: 'Forbidden',
      ok: false,
      json: async () => ({ message: 'rate limited' }),
    });

    await assert.rejects(() => fetchOwnedRepos('octocat'), /GH_TOKEN/);
    await assert.rejects(
      () => fetchOwnedRepos('octocat'),
      /GitHub API rate limit hit\. Set GH_TOKEN or GITHUB_TOKEN and retry\./,
    );
  });

  it('500 gibi diğer hatalarda GitHub API error fırlatır (github.js ile aynı format)', async () => {
    globalThis.fetch = async () => ({
      status: 500,
      statusText: 'Internal Server Error',
      ok: false,
      json: async () => ({}),
    });

    await assert.rejects(() => fetchOwnedRepos('octocat'), /GitHub API error/);
    await assert.rejects(
      () => fetchOwnedRepos('octocat'),
      /GitHub API error: 500 Internal Server Error/,
    );
  });
});

describe('renderMaintainer', () => {
  it('yıldız sırası: repo satırlarını yıldız sayısına göre azalan dizer', async () => {
    const repos = [
      { name: 'low', stars: 3, forks: 0, url: 'https://github.com/octocat/low' },
      { name: 'high', stars: 99, forks: 10, url: 'https://github.com/octocat/high' },
      { name: 'mid', stars: 20, forks: 2, url: 'https://github.com/octocat/mid' },
    ];

    const out = renderMaintainer('octocat', repos);
    const lines = out.split('\n');

    const highIdx = lines.findIndex((l) => l.includes('high'));
    const midIdx = lines.findIndex((l) => l.includes('mid'));
    const lowIdx = lines.findIndex((l) => l.includes('low'));

    assert.ok(highIdx !== -1 && midIdx !== -1 && lowIdx !== -1);
    assert.ok(highIdx < midIdx && midIdx < lowIdx);
    assert.ok(lines[highIdx].includes('★99'));
    assert.ok(lines[highIdx].includes('forks:10'));
    assert.ok(lines[midIdx].includes('★20'));
    assert.ok(lines[lowIdx].includes('★3'));
  });

  it('boş liste: bilgi satırı döner', () => {
    const out = renderMaintainer('octocat', []);

    assert.match(out, /octocat/);
    assert.match(out, /\(no owned repos found\)/);
  });
});
