#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { searchMergedPRs } from './github.js';
import { aggregateExternalPRs, renderList, renderReport, totalCount } from './report.js';
import { renderHtml } from './html.js';
import { fetchOwnedRepos, renderMaintainer } from './maintainer.js';
import { loadRuns, recordRun, renderTrend, trend } from './history.js';

function usage() {
  console.log('Usage: oss-bar --user <github-username> [--target <n>] [--json] [--list] [--html <file>] [--maintainer] [--weekly]');
  console.log('Env: GH_TOKEN or GITHUB_TOKEN (recommended, avoids rate limits)');
}

function parseArgs(argv) {
  const args = { target: 100 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--user' && argv[i + 1]) {
      args.user = argv[(i += 1)];
    } else if (argv[i] === '--target' && argv[i + 1]) {
      args.target = Number(argv[(i += 1)]);
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      args.help = true;
    } else if (argv[i] === '--json') {
      args.json = true;
    } else if (argv[i] === '--list') {
      args.list = true;
    } else if (argv[i] === '--html' && argv[i + 1]) {
      args.html = argv[(i += 1)];
    } else if (argv[i] === '--maintainer') {
      args.maintainer = true;
    } else if (argv[i] === '--weekly') {
      args.weekly = true;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.user) {
  usage();
  process.exit(args.help ? 0 : 1);
}

const since = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;

const items = await searchMergedPRs(args.user, since, { token });
const rows = aggregateExternalPRs(items, args.user);
const total = totalCount(rows);
if (args.json) {
  console.log(JSON.stringify({ user: args.user, target: args.target, total, rows }));
} else {
  console.log(renderReport(args.user, rows, args.target));
}
if (args.list) {
  console.log('');
  console.log(renderList(items, args.user));
}
if (args.html) {
  fs.writeFileSync(args.html, renderHtml({ user: args.user, target: args.target, total, rows }));
  console.log(`\nHTML report written to ${args.html}`);
}
if (args.maintainer) {
  const repos = await fetchOwnedRepos(args.user, { token });
  console.log('');
  console.log(renderMaintainer(args.user, repos));
}
if (args.weekly) {
  const storePath = path.join(os.homedir(), '.oss-bar', 'history.jsonl');
  const today = new Date().toISOString().slice(0, 10);
  recordRun(storePath, { date: today, user: args.user, total });
  console.log('');
  console.log(renderTrend(trend(loadRuns(storePath))));
}
