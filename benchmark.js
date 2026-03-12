/**
 * Real-world comparison: readdown vs readability+turndown vs defuddle
 * Fetches real web pages and compares output quality + performance.
 */

const { readdown } = require('./dist/index.js');

// Dynamic imports for ESM packages
async function loadCompetitors() {
  const { Readability } = await import('@mozilla/readability');
  const TurndownService = (await import('turndown')).default;
  const defuddleMod = await import('defuddle');
  const Defuddle = defuddleMod.default || defuddleMod.Defuddle;
  return { Readability, TurndownService, Defuddle };
}

const TEST_URLS = [
  'https://en.wikipedia.org/wiki/Markdown',
  'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise',
  'https://htmx.org/essays/hypermedia-apis-vs-data-apis/',
  'https://nodejs.org/en/about',
  'https://www.paulgraham.com/greatwork.html',
];

async function fetchPage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

async function benchmarkReaddown(html, url) {
  const start = performance.now();
  const result = readdown(html, { url });
  const ms = performance.now() - start;
  return { markdown: result.markdown, ms, tokens: result.tokens, chars: result.chars };
}

async function benchmarkReadabilityTurndown(html, url, Readability, TurndownService) {
  const { parseHTML } = await import('linkedom');
  const start = performance.now();
  const { document } = parseHTML(html);
  const reader = new Readability(document);
  const article = reader.parse();
  if (!article) return { markdown: '(extraction failed)', ms: performance.now() - start, tokens: 0, chars: 0 };
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  const markdown = td.turndown(article.content);
  const ms = performance.now() - start;
  return { markdown, ms, tokens: Math.ceil(markdown.length / 4), chars: markdown.length };
}

async function benchmarkDefuddle(html, url, Defuddle) {
  const { parseHTML } = await import('linkedom');
  const start = performance.now();
  const { document } = parseHTML(html);
  const result = new Defuddle(document).parse();
  const ms = performance.now() - start;
  const md = result.markdown || result.content || '';
  return { markdown: md, ms, tokens: Math.ceil(md.length / 4), chars: md.length };
}

function qualityMetrics(markdown) {
  const lines = markdown.split('\n');
  const headings = lines.filter(l => /^#{1,6} /.test(l)).length;
  const codeBlocks = (markdown.match(/```/g) || []).length / 2;
  const links = (markdown.match(/\[.*?\]\(.*?\)/g) || []).length;
  const images = (markdown.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const tables = (markdown.match(/^\|/gm) || []).length > 0 ? 1 : 0;
  const emptyLines = lines.filter(l => l.trim() === '').length;
  const totalLines = lines.length;
  const brokenMarkdown = (markdown.match(/\*\*\s+\*\*/g) || []).length +
                         (markdown.match(/\[\]\(/g) || []).length; // empty links
  return { headings, codeBlocks, links, images, tables, totalLines, brokenMarkdown };
}

async function main() {
  console.log('Loading packages...');
  const { Readability, TurndownService, Defuddle } = await loadCompetitors();

  console.log('\n=== Real-World HTML-to-Markdown Benchmark ===\n');

  const summary = { readdown: { totalMs: 0, wins: 0 }, 'readability+turndown': { totalMs: 0, wins: 0 }, defuddle: { totalMs: 0, wins: 0 } };

  for (const url of TEST_URLS) {
    const shortUrl = url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 50);
    console.log(`\n--- ${shortUrl} ---`);

    let html;
    try {
      html = await fetchPage(url);
    } catch (e) {
      console.log(`  SKIP: ${e.message}`);
      continue;
    }

    console.log(`  HTML size: ${(html.length / 1024).toFixed(1)} KB`);

    try {
      const rd = await benchmarkReaddown(html, url);
      const rt = await benchmarkReadabilityTurndown(html, url, Readability, TurndownService);
      const df = await benchmarkDefuddle(html, url, Defuddle);

      const rdQ = qualityMetrics(rd.markdown);
      const rtQ = qualityMetrics(rt.markdown);
      const dfQ = qualityMetrics(df.markdown);

      console.log(`  readdown:            ${rd.ms.toFixed(1)}ms, ${rd.tokens} tokens, ${rd.chars} chars | h:${rdQ.headings} code:${rdQ.codeBlocks} links:${rdQ.links} img:${rdQ.images} broken:${rdQ.brokenMarkdown}`);
      console.log(`  readability+turndown: ${rt.ms.toFixed(1)}ms, ${rt.tokens} tokens, ${rt.chars} chars | h:${rtQ.headings} code:${rtQ.codeBlocks} links:${rtQ.links} img:${rtQ.images} broken:${rtQ.brokenMarkdown}`);
      console.log(`  defuddle:            ${df.ms.toFixed(1)}ms, ${df.tokens} tokens, ${df.chars} chars | h:${dfQ.headings} code:${dfQ.codeBlocks} links:${dfQ.links} img:${dfQ.images} broken:${dfQ.brokenMarkdown}`);

      summary.readdown.totalMs += rd.ms;
      summary['readability+turndown'].totalMs += rt.ms;
      summary.defuddle.totalMs += df.ms;

      // Speed wins
      const fastest = Math.min(rd.ms, rt.ms, df.ms);
      if (rd.ms === fastest) summary.readdown.wins++;
      if (rt.ms === fastest) summary['readability+turndown'].wins++;
      if (df.ms === fastest) summary.defuddle.wins++;

      // Save outputs for manual comparison
      const fs = require('fs');
      const name = shortUrl.replace(/[^a-z0-9]/gi, '_').slice(0, 30);
      fs.mkdirSync('benchmark-output', { recursive: true });
      fs.writeFileSync(`benchmark-output/${name}_readdown.md`, rd.markdown);
      fs.writeFileSync(`benchmark-output/${name}_readability_turndown.md`, rt.markdown);
      fs.writeFileSync(`benchmark-output/${name}_defuddle.md`, df.markdown);

    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  console.log('\n=== Summary ===');
  for (const [name, data] of Object.entries(summary)) {
    console.log(`  ${name}: ${data.totalMs.toFixed(1)}ms total, ${data.wins} speed wins`);
  }
}

main().catch(console.error);
