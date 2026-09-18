import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { backoffMs, searchMergedPRs } from '../src/github.js';

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

  it('önbellek miss durumunda ağdan çekip dosyaya yazar, hit durumunda ağa çıkmaz', async () => {
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oss-bar-'));
    const items = [{ id: 1 }, { id: 2 }];
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount += 1;
      return okResponse(items);
    };

    const first = await searchMergedPRs('octocat', '2024-01-01', { cacheDir });
    assert.deepEqual(first, items);
    assert.equal(callCount, 1);

    const cacheFile = path.join(cacheDir, 'search-octocat-2024-01-01.json');
    assert.ok(fs.existsSync(cacheFile));
    assert.deepEqual(JSON.parse(fs.readFileSync(cacheFile, 'utf8')), items);

    // Hit: ağa çıkılmamalı
    globalThis.fetch = async () => {
      callCount += 1;
      throw new Error('ağa çıkılmamalı');
    };
    const second = await searchMergedPRs('octocat', '2024-01-01', { cacheDir });
    assert.deepEqual(second, items);
    assert.equal(callCount, 1);
  });

  it('önbellek dizini yoksa oluşturulur', async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'oss-bar-'));
    const cacheDir = path.join(base, 'nested', 'cache');
    assert.ok(!fs.existsSync(cacheDir));

    globalThis.fetch = async () => okResponse([{ id: 7 }]);

    const result = await searchMergedPRs('octocat', '2024-01-01', { cacheDir });
    assert.deepEqual(result, [{ id: 7 }]);
    assert.ok(fs.existsSync(path.join(cacheDir, 'search-octocat-2024-01-01.json')));
  });

  it('TTL dolunca (maxAgeSec aşılınca) yeniden ağa çıkar', async () => {
    const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oss-bar-'));
    const oldItems = [{ id: 1 }];
    const freshItems = [{ id: 2 }];

    globalThis.fetch = async () => okResponse(oldItems);
    const first = await searchMergedPRs('octocat', '2024-01-01', { cacheDir, maxAgeSec: 3600 });
    assert.deepEqual(first, oldItems);

    const cacheFile = path.join(cacheDir, 'search-octocat-2024-01-01.json');
    // Dosyayı 2 saat yaşlandır: varsayılan TTL (3600sn) dolmuş olur.
    const oldTime = new Date(Date.now() - 2 * 3600 * 1000);
    fs.utimesSync(cacheFile, oldTime, oldTime);

    let callCount = 0;
    globalThis.fetch = async () => {
      callCount += 1;
      return okResponse(freshItems);
    };
    const second = await searchMergedPRs('octocat', '2024-01-01', { cacheDir, maxAgeSec: 3600 });
    assert.deepEqual(second, freshItems);
    assert.equal(callCount, 1);
    assert.deepEqual(JSON.parse(fs.readFileSync(cacheFile, 'utf8')), freshItems);
  });

  it('retry: hep-403 dönen stub 3 deneme yapar ve sleep sayacı artar', async () => {
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount += 1;
      return {
        status: 403,
        statusText: 'Forbidden',
        ok: false,
        json: async () => ({ message: 'rate limited' }),
      };
    };

    const sleeps = [];
    const sleep = async (ms) => {
      sleeps.push(ms);
    };

    await assert.rejects(
      () => searchMergedPRs('octocat', '2024-01-01', { sleep }),
      /GH_TOKEN/,
    );
    assert.equal(fetchCount, 3);
    assert.equal(sleeps.length, 2);
    assert.deepEqual(sleeps, [backoffMs(1), backoffMs(2)]);
  });

  it('retry: 5xx sonrası başarı dönerse sonuç verir', async () => {
    const items = [{ id: 42 }];
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount += 1;
      if (fetchCount < 3) {
        return {
          status: 500,
          statusText: 'Internal Server Error',
          ok: false,
          json: async () => ({}),
        };
      }
      return okResponse(items);
    };

    const sleeps = [];
    const result = await searchMergedPRs('octocat', '2024-01-01', {
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    assert.deepEqual(result, items);
    assert.equal(fetchCount, 3);
    assert.equal(sleeps.length, 2);
  });

  it('retry: Retry-After saniyesi varsa ona uyar', async () => {
    globalThis.fetch = async () => ({
      status: 403,
      statusText: 'Forbidden',
      ok: false,
      headers: { get: () => '2' },
      json: async () => ({ message: 'rate limited' }),
    });

    const sleeps = [];
    await assert.rejects(
      () =>
        searchMergedPRs('octocat', '2024-01-01', {
          sleep: async (ms) => {
            sleeps.push(ms);
          },
        }),
      /GH_TOKEN/,
    );
    assert.deepEqual(sleeps, [2000, 2000]);
  });

  it('backoffMs üstsel artar ve pure fonksiyondur', () => {
    const a1 = backoffMs(1);
    const a2 = backoffMs(2);
    const a3 = backoffMs(3);
    assert.ok(a1 > 0);
    assert.ok(a2 > a1);
    assert.ok(a3 > a2);
    assert.equal(backoffMs(1), a1);
    assert.equal(backoffMs(2), a2);
  });
});
