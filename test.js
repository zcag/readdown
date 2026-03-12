const { readdown } = require('./dist/index.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// Test 1: Basic HTML
console.log('\n--- Basic HTML ---');
const r1 = readdown('<html><head><title>Hello World</title></head><body><h1>Hello</h1><p>This is a paragraph.</p></body></html>');
test('includes title', () => assert(r1.markdown.includes('# Hello World'), 'missing title'));
test('includes paragraph', () => assert(r1.markdown.includes('This is a paragraph'), 'missing paragraph'));
test('has tokens', () => assert(r1.tokens > 0, 'no tokens'));
test('has context usage', () => assert(r1.contextUsage['gpt-4o'] > 0, 'no context usage'));

// Test 2: Article extraction
console.log('\n--- Article extraction ---');
const r2 = readdown(`
<html><head><title>Blog Post</title></head><body>
  <nav><a href="/">Home</a><a href="/about">About</a></nav>
  <article>
    <h1>My Article</h1>
    <p>This is the main content of the article. It has enough text to be detected as the main content area for extraction purposes.</p>
    <h2>Section 2</h2>
    <p>More detailed content follows here with additional paragraphs and information.</p>
  </article>
  <aside>Sidebar content</aside>
  <footer>Copyright 2026</footer>
</body></html>`);
test('excludes sidebar', () => assert(!r2.markdown.includes('Sidebar'), 'sidebar found'));
test('excludes footer', () => assert(!r2.markdown.includes('Copyright'), 'footer found'));
test('includes article', () => assert(r2.markdown.includes('main content'), 'missing article'));

// Test 3: Links and images
console.log('\n--- Links and images ---');
const r3 = readdown('<html><head><title>Links</title></head><body><p>Visit <a href="https://example.com">Example</a> and see <img src="/logo.png" alt="Logo"></p></body></html>', { url: 'https://mysite.com/page' });
test('converts link', () => assert(r3.markdown.includes('[Example](https://example.com'), 'missing link'));
test('resolves relative image', () => assert(r3.markdown.includes('![Logo](https://mysite.com/logo.png)'), 'bad image url'));

// Test 4: Code blocks
console.log('\n--- Code blocks ---');
const r4 = readdown('<html><head><title>Code</title></head><body><pre><code class="language-js">const x = 1;</code></pre><p>And inline <code>code</code> too.</p></body></html>');
test('detects language', () => assert(r4.markdown.includes('```js'), 'missing language'));
test('inline code', () => assert(r4.markdown.includes('`code`'), 'missing inline code'));

// Test 5: Tables
console.log('\n--- Tables ---');
const r5 = readdown('<html><head><title>Table</title></head><body><table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr><tr><td>B</td><td>2</td></tr></table></body></html>');
test('table header', () => assert(r5.markdown.includes('| Name | Value |'), 'missing header'));
test('table rows', () => assert(r5.markdown.includes('| A | 1 |'), 'missing rows'));

// Test 6: Lists
console.log('\n--- Lists ---');
const r6 = readdown('<html><head><title>Lists</title></head><body><ul><li>Item 1</li><li>Item 2</li></ul><ol><li>First</li><li>Second</li></ol></body></html>');
test('unordered list', () => assert(r6.markdown.includes('- Item 1'), 'missing bullet'));
test('ordered list', () => assert(r6.markdown.includes('1. First'), 'missing number'));

// Test 7: Nested lists
console.log('\n--- Nested lists ---');
const r7nested = readdown(`<html><head><title>Nested</title></head><body>
<ul>
  <li>Top item
    <ul>
      <li>Nested item 1</li>
      <li>Nested item 2</li>
    </ul>
  </li>
  <li>Another top item</li>
</ul></body></html>`, { includeHeader: false });
test('top-level items', () => assert(r7nested.markdown.includes('- Top item'), 'missing top item'));
test('nested indentation', () => assert(r7nested.markdown.includes('  - Nested item 1'), 'missing nested indent'));
test('second top item', () => assert(r7nested.markdown.includes('- Another top item'), 'missing second top'));

// Deeply nested
const rDeep = readdown(`<html><head><title>Deep</title></head><body>
<ul>
  <li>Level 1
    <ul>
      <li>Level 2
        <ul>
          <li>Level 3</li>
        </ul>
      </li>
    </ul>
  </li>
</ul></body></html>`, { includeHeader: false });
test('deep nesting level 2', () => assert(rDeep.markdown.includes('  - Level 2'), 'missing level 2'));
test('deep nesting level 3', () => assert(rDeep.markdown.includes('    - Level 3'), 'missing level 3'));

// Mixed nested lists (ol inside ul)
const rMixed = readdown(`<html><head><title>Mixed</title></head><body>
<ul>
  <li>Unordered
    <ol>
      <li>Ordered child 1</li>
      <li>Ordered child 2</li>
    </ol>
  </li>
</ul></body></html>`, { includeHeader: false });
test('mixed list parent', () => assert(rMixed.markdown.includes('- Unordered'), 'missing parent'));
test('mixed list child', () => assert(rMixed.markdown.includes('  1. Ordered child 1'), 'missing ordered child'));

// Test 8: Metadata extraction
console.log('\n--- Metadata ---');
const r8 = readdown(`
<html lang="en"><head>
  <title>Article Title</title>
  <meta property="og:title" content="OG Title">
  <meta name="author" content="John Doe">
  <meta property="article:published_time" content="2026-03-12">
  <meta name="description" content="Article description">
  <meta property="og:site_name" content="My Blog">
</head><body><p>Content</p></body></html>`);
test('prefers OG title', () => assert(r8.metadata.title === 'OG Title', `got: ${r8.metadata.title}`));
test('extracts author', () => assert(r8.metadata.author === 'John Doe', 'missing author'));
test('extracts date', () => assert(r8.metadata.date === '2026-03-12', 'missing date'));

// Test 9: Raw mode
console.log('\n--- Raw mode ---');
const r9 = readdown('<html><head><title>Raw</title></head><body><nav>Nav content</nav><p>Body content</p></body></html>', { raw: true });
test('raw mode works', () => assert(r9.markdown.includes('Body content'), 'missing body content'));

// Test 10: No header
console.log('\n--- No header mode ---');
const r10 = readdown('<html><head><title>No Header</title></head><body><p>Just content</p></body></html>', { includeHeader: false });
test('no header', () => assert(!r10.markdown.includes('# No Header'), 'header found'));
test('has content', () => assert(r10.markdown.includes('Just content'), 'missing content'));

// Test 11: Blockquotes
console.log('\n--- Blockquotes ---');
const r11 = readdown('<html><head><title>Quote</title></head><body><blockquote><p>To be or not to be</p></blockquote></body></html>');
test('blockquote', () => assert(r11.markdown.includes('> '), 'missing blockquote'));

// Test 12: Inline formatting (new tags)
console.log('\n--- Inline formatting ---');
const r12 = readdown(`<html><head><title>Fmt</title></head><body>
<p>H<sub>2</sub>O and 10<sup>2</sup> and <mark>highlighted</mark></p>
<p><abbr title="HyperText Markup Language">HTML</abbr> is great</p>
</body></html>`, { includeHeader: false });
test('subscript', () => assert(r12.markdown.includes('~2~'), 'missing sub'));
test('superscript', () => assert(r12.markdown.includes('^2^'), 'missing sup'));
test('mark/highlight', () => assert(r12.markdown.includes('==highlighted=='), 'missing mark'));
test('abbr with title', () => assert(r12.markdown.includes('HTML (HyperText Markup Language)'), 'missing abbr'));

// Test 13: Lazy images
console.log('\n--- Lazy images ---');
const r13 = readdown('<html><head><title>Lazy</title></head><body><img data-src="https://example.com/img.jpg" alt="Lazy loaded"></body></html>', { includeHeader: false });
test('data-src fallback', () => assert(r13.markdown.includes('![Lazy loaded](https://example.com/img.jpg)'), 'missing lazy img'));

// Test 14: HTML entities in code
console.log('\n--- HTML entities in code ---');
const r14 = readdown('<html><head><title>Entities</title></head><body><pre><code>if (a &lt; b &amp;&amp; c &gt; d) {}</code></pre></body></html>', { includeHeader: false });
test('entities decoded in code', () => assert(r14.markdown.includes('if (a < b && c > d)'), `got: ${r14.markdown}`));

// Test 15: Definition lists
console.log('\n--- Definition lists ---');
const r15 = readdown('<html><head><title>DL</title></head><body><dl><dt>Term</dt><dd>Definition of the term</dd></dl></body></html>', { includeHeader: false });
test('definition term bold', () => assert(r15.markdown.includes('**Term**'), 'missing dt'));
test('definition desc', () => assert(r15.markdown.includes(': Definition'), 'missing dd'));

// Test 16: Strikethrough
console.log('\n--- Strikethrough ---');
const r16 = readdown('<html><head><title>Del</title></head><body><p><del>deleted</del> and <s>struck</s></p></body></html>', { includeHeader: false });
test('del tag', () => assert(r16.markdown.includes('~~deleted~~'), 'missing del'));
test('s tag', () => assert(r16.markdown.includes('~~struck~~'), 'missing s'));

// Test 17: Details/summary
console.log('\n--- Details/summary ---');
const r17 = readdown('<html><head><title>Details</title></head><body><details><summary>Click me</summary><p>Hidden content</p></details></body></html>', { includeHeader: false });
test('details preserved', () => assert(r17.markdown.includes('<details>'), 'missing details'));
test('summary preserved', () => assert(r17.markdown.includes('<summary>Click me</summary>'), 'missing summary'));

// Test 18: Class name false positives (heading, loading, etc. should NOT be skipped)
console.log('\n--- Class false positives ---');
const r18 = readdown('<html><head><title>Test</title></head><body><main><section><h2 class="heading">Section Title</h2><p>Content here.</p></section></main></body></html>', { includeHeader: false });
test('heading class not skipped', () => assert(r18.markdown.includes('## Section Title'), 'heading with class="heading" was incorrectly skipped'));

const r18b = readdown('<html><head><title>Test</title></head><body><main><div class="loading-state"><p>Still loading data.</p></div></main></body></html>', { includeHeader: false });
test('loading class not skipped', () => assert(r18b.markdown.includes('Still loading'), 'div with class="loading-state" was incorrectly skipped'));

// Test 19: Layout tables should be unwrapped, not rendered as markdown tables
console.log('\n--- Layout tables ---');
const r19 = readdown('<html><head><title>Test</title></head><body><table><tr><td><h1>Title</h1><p>Content paragraph.</p></td></tr></table></body></html>', { includeHeader: false });
test('layout table unwrapped', () => assert(!r19.markdown.includes('|'), 'layout table rendered as markdown table'));
test('layout table content preserved', () => assert(r19.markdown.includes('Content paragraph'), 'layout table content lost'));

// Test 20: Spacer images should be filtered
console.log('\n--- Spacer images ---');
const r20 = readdown('<html><head><title>Test</title></head><body><p>Text</p><img src="https://example.com/trans_1x1.gif" width="1" height="1"><img src="photo.jpg" alt="Photo"></body></html>', { includeHeader: false });
test('spacer image filtered', () => assert(!r20.markdown.includes('trans_1x1'), 'spacer image not filtered'));
test('real image preserved', () => assert(r20.markdown.includes('![Photo](photo.jpg)'), 'real image was filtered'));

// Test 21: Data tables should still render correctly
console.log('\n--- Data tables preserved ---');
const r21 = readdown('<html><head><title>Test</title></head><body><table><tr><th>Name</th><th>Age</th></tr><tr><td>Alice</td><td>30</td></tr></table></body></html>', { includeHeader: false });
test('data table rendered', () => assert(r21.markdown.includes('| Name | Age |'), 'data table not rendered'));

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
