# oss-bar — Kullanım Örnekleri

Aşağıdaki çıktılar 2026-09-18'de komutlar gerçekten çalıştırılarak alındı;
uydurma içerik yok. `--user` sonuçları canlı GitHub verisine göre değişebilir.

## Yardım

```sh
node src/index.js --help
```

```text
Usage: oss-bar --user <github-username> [--target <n>] [--json] [--list]
Env: GH_TOKEN or GITHUB_TOKEN (recommended, avoids rate limits)
```

## Özet rapor

```sh
node src/index.js --user kingmakeruix
```

```text
oss-bar for @kingmakeruix (merged PRs, last 12 months)
External merged PRs: 2 / 100 (Claude "active contributor" bar)
[--------------------] 2%

By repo:
  frappe/frappe-ui  1
  vitest-dev/vitest  1
```

## JSON çıktı

```sh
node src/index.js --user kingmakeruix --json
```

```text
{"user":"kingmakeruix","target":100,"total":2,"rows":[{"repo":"frappe/frappe-ui","count":1},{"repo":"vitest-dev/vitest","count":1}]}
```

## PR listesiyle birlikte

```sh
node src/index.js --user kingmakeruix --list
```

```text
oss-bar for @kingmakeruix (merged PRs, last 12 months)
External merged PRs: 2 / 100 (Claude "active contributor" bar)
[--------------------] 2%

By repo:
  frappe/frappe-ui  1
  vitest-dev/vitest  1

PRs:
  fix: migrate ListFooter page length picker from removed buttons prop to options  https://github.com/frappe/frappe-ui/pull/1172
  fix(fakeTimers): force `queueMicrotask` and `nextTick` in `toNotFake`  https://github.com/vitest-dev/vitest/pull/11261
```

## Notlar

- Rate limit'e takılmamak için `GH_TOKEN` (veya `GITHUB_TOKEN`) tanımla:

```sh
GH_TOKEN=ghp_... node src/index.js --user kingmakeruix
```
