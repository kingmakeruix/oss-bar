#!/usr/bin/env node
import { searchMergedPRs } from './github.js';
import { aggregateExternalPRs, renderReport } from './report.js';

function usage() {
  console.log('Usage: oss-bar --user <github-username> [--target <n>]');
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
console.log(renderReport(args.user, rows, args.target));
