# Contributing to oss-bar

Thanks for stopping by! `oss-bar` is a tiny Node CLI — small PRs are very welcome.

## Run it

Requires Node 20+ (zero dependencies, please keep it that way).

```sh
npm test
node ./src/index.js --user kingmakeruix
node ./src/index.js --user kingmakeruix --target 20 --json
```

Set `GH_TOKEN` (or `GITHUB_TOKEN`) if you hit GitHub API rate limits.

## Zero-dependency rule

No runtime or dev dependencies. Use only Node stdlib (`node:test`, `fetch`, etc.).
If you think a dependency is unavoidable, open an issue first and explain why.

## Before opening a PR

- [ ] `npm test` passes
- [ ] Paste a real command output in the PR description (e.g. `node ./src/index.js --user <you>`)
- [ ] Keep the change small and focused

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) for the PR title, e.g.:

- `feat: add --list flag`
- `fix: handle GitHub pagination`
- `docs: clarify target flag`
- `test: cover empty result`
- `chore: tidy output format`
