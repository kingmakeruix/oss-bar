# AGENTS.md — oss-bar

Küçük Node CLI, sıfır bağımlılık, MIT. Node 20+.

## Yapı

- `src/index.js` — CLI giriş noktası, argüman ayrıştırma (`--user`, `--target`, `--json`, `--list`, `--help`)
- `src/github.js` — GitHub Search API istemcisi (`searchMergedPRs`)
- `src/report.js` — toplama + rapor/liste render (`aggregateExternalPRs`, `renderReport`, `renderList`)
- `test/` — `node:test` tabanlı testler (`github.test.js`, `report.test.js`)

## Komutlar

- `npm test` — tüm testler (`node --test test/*.test.js`)
- `node src/index.js --user <name> [--target <n>] [--json] [--list]`

## Kurallar

- Sıfır bağımlılık: yeni paket ekleme.
- Testler `node:test` ile; yeni davranışa test yaz.
- Mevcut fonksiyon imzalarını bozma (CLI bayrakları, `report.js`/`github.js` exportları).
- Commit/push YOK — koordinatör yapar; PR şablonu yok, direkt main'e gider.
- Canlı GitHub API gerekiyorsa `GH_TOKEN` kullan, rate limit'e dikkat et.
