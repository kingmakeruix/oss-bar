import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { searchMergedPRs } from '../src/github.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function okResponse(items) {
  return {
    status: 200,
    statusText: 'OK',
    ok: true,
    json: async () => ({ items }),
  };
}

describe('searchMergedPRs', () => {
  it('tek sayfa sonuç dönünce items listesini aynen verir', async () => {
    const items = [{ id: 1 }, { id: 2 }];
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount += 1;
      return okResponse(items);
    };

    const result = await searchMergedPRs('octocat', '2024-01-01');

    assert.deepEqual(result, items);
    assert.equal(callCount, 1);
  });

  it('ilk sayfa tam 100 kayıt dönerse 2. sayfayı da çeker ve birleştirir', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
    const secondPage = [{ id: 101 }, { id: 102 }];
    const urls = [];
    globalThis.fetch = async (url) => {
      urls.push(url);
      if (urls.length === 1) {
        return okResponse(firstPage);
      }
      return okResponse(secondPage);
    };

    const result = await searchMergedPRs('octocat', '2024-01-01');

    assert.equal(urls.length, 2);
    assert.match(urls[0], /[?&]page=1\b/);
    assert.match(urls[1], /[?&]page=2\b/);
    assert.deepEqual(result, [...firstPage, ...secondPage]);
  });

  it('maxPages sınırına uyar', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount += 1;
      return okResponse(firstPage);
    };

    const result = await searchMergedPRs('octocat', '2024-01-01', { maxPages: 1 });

    assert.equal(callCount, 1);
    assert.deepEqual(result, firstPage);
  });

  it('403 yanıtında rate-limit hatası fırlatır', async () => {
    globalThis.fetch = async () => ({
      status: 403,
      statusText: 'Forbidden',
      ok: false,
      json: async () => ({ message: 'rate limited' }),
    });

    await assert.rejects(() => searchMergedPRs('octocat', '2024-01-01'), /GH_TOKEN/);
  });

  it('500 gibi diğer hatalarda GitHub API error fırlatır', async () => {
    globalThis.fetch = async () => ({
      status: 500,
      statusText: 'Internal Server Error',
      ok: false,
      json: async () => ({}),
    });

    await assert.rejects(() => searchMergedPRs('octocat', '2024-01-01'), /GitHub API error/);
  });

  it('token verilince Authorization header eklenir', async () => {
    let capturedHeaders;
    globalThis.fetch = async (_url, options) => {
      capturedHeaders = options.headers;
      return okResponse([]);
    };

    await searchMergedPRs('octocat', '2024-01-01', { token: 'secret123' });

    assert.equal(capturedHeaders.Authorization, 'Bearer secret123');
  });

  it('token verilmeyince Authorization header eklenmez', async () => {
    let capturedHeaders;
    globalThis.fetch = async (_url, options) => {
      capturedHeaders = options.headers;
      return okResponse([]);
    };

    await searchMergedPRs('octocat', '2024-01-01');

    assert.ok(!('Authorization' in capturedHeaders));
  });
});
