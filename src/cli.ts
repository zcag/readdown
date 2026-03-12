#!/usr/bin/env node

import { readdown } from './index.js';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`readdown - HTML to clean Markdown optimized for LLMs

Usage:
  readdown <url>              Fetch URL and convert to markdown
  readdown --stdin            Read HTML from stdin
  cat file.html | readdown    Pipe HTML through readdown

Options:
  --raw          Skip content extraction, convert full HTML
  --no-header    Don't add title/metadata header
  --json         Output as JSON (includes metadata + token count)
  -h, --help     Show this help`);
  process.exit(0);
}

const raw = args.includes('--raw');
const noHeader = args.includes('--no-header');
const json = args.includes('--json');
const stdinMode = args.includes('--stdin');
const url = args.find((a: string) => !a.startsWith('-'));

async function run() {
  let html = '';

  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
      process.exit(1);
    }
    html = await res.text();
  } else if (stdinMode || !process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    html = Buffer.concat(chunks).toString('utf-8');
  } else {
    console.error('Error: provide a URL or pipe HTML via stdin');
    process.exit(1);
  }

  const result = readdown(html, {
    url: url || undefined,
    raw,
    includeHeader: !noHeader,
  });

  if (json) {
    console.log(JSON.stringify({
      markdown: result.markdown,
      metadata: result.metadata,
      tokens: result.tokens,
      chars: result.chars,
      contextUsage: result.contextUsage,
    }, null, 2));
  } else {
    process.stdout.write(result.markdown);
  }
}

run().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
