# oss-bar

Track your merged-PR progress toward open-source program bars (Claude for OSS, Codex for OSS). Zero dependencies, runs on Node 20+.

## Install

```sh
npm install -g oss-bar
```

Or run without installing:

```sh
npx oss-bar --user <github-username>
```

## Usage

```sh
# Merged PRs in the last 12 months vs the Claude "active contributor" bar (100)
oss-bar --user kingmakeruix

# Custom target
oss-bar --user kingmakeruix --target 20

# JSON output: { user, target, total, rows }
oss-bar --user kingmakeruix --json

# Include per-PR title + URL list alongside the summary
oss-bar --user kingmakeruix --list
```

Set `GH_TOKEN` (or `GITHUB_TOKEN`) to avoid GitHub API rate limits:

```sh
GH_TOKEN=ghp_... oss-bar --user kingmakeruix
```

Example output:

```text
oss-bar for @kingmakeruix (merged PRs, last 12 months)
External merged PRs: 2 / 100 (Claude "active contributor" bar)
[--------------------] 2%

By repo:
  vitest-dev/vitest  1
  frappe/frappe-ui  1
```

Only PRs merged into repos you do **not** own count toward the bar — same rule the programs use.

## Develop

```sh
npm test
```

## License

MIT
