const { readdown } = require('./dist/index.js');

// Test 1: Basic HTML
console.log('--- Test 1: Basic HTML ---');
const r1 = readdown('<html><head><title>Hello World</title></head><body><h1>Hello</h1><p>This is a paragraph.</p></body></html>');
console.log(r1.markdown);
console.log(`Tokens: ${r1.tokens}, Chars: ${r1.chars}`);
console.log(`Context: GPT-4o ${r1.contextUsage['gpt-4o']}%, Claude ${r1.contextUsage['claude-3.5']}%`);
console.assert(r1.markdown.includes('# Hello World'), 'Should include title');
console.assert(r1.markdown.includes('This is a paragraph'), 'Should include paragraph');
console.assert(r1.tokens > 0, 'Should have tokens');

// Test 2: Article extraction
console.log('\n--- Test 2: Article extraction ---');
const r2 = readdown(`
<html><head><title>Blog Post</title></head><body>
  <nav><a href="/">Home</a><a href="/about">About</a></nav>
  <article>
    <h1>My Article</h1>
    <p>This is the main content of the article. It has enough text to be detected as the main content area for extraction purposes. Let's add more text here to make sure it passes the length threshold.</p>
    <h2>Section 2</h2>
    <p>More detailed content follows here with additional paragraphs and information.</p>
  </article>
  <aside>Sidebar content</aside>
  <footer>Copyright 2026</footer>
</body></html>`);
console.log(r2.markdown);
console.assert(!r2.markdown.includes('Sidebar'), 'Should not include sidebar');
console.assert(!r2.markdown.includes('Copyright'), 'Should not include footer');
console.assert(r2.markdown.includes('main content'), 'Should include article body');

// Test 3: Links and images
console.log('\n--- Test 3: Links and images ---');
const r3 = readdown('<html><head><title>Links</title></head><body><p>Visit <a href="https://example.com">Example</a> and see <img src="/logo.png" alt="Logo"></p></body></html>', { url: 'https://mysite.com/page' });
console.log(r3.markdown);
console.assert(r3.markdown.includes('[Example](https://example.com'), 'Should convert link');
console.assert(r3.markdown.includes('![Logo](https://mysite.com/logo.png)'), 'Should resolve relative image URL');

// Test 4: Code blocks
console.log('\n--- Test 4: Code blocks ---');
const r4 = readdown('<html><head><title>Code</title></head><body><pre><code class="language-js">const x = 1;</code></pre><p>And inline <code>code</code> too.</p></body></html>');
console.log(r4.markdown);
console.assert(r4.markdown.includes('```js'), 'Should detect language');
console.assert(r4.markdown.includes('`code`'), 'Should handle inline code');

// Test 5: Tables
console.log('\n--- Test 5: Tables ---');
const r5 = readdown('<html><head><title>Table</title></head><body><table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr><tr><td>B</td><td>2</td></tr></table></body></html>');
console.log(r5.markdown);
console.assert(r5.markdown.includes('| Name | Value |'), 'Should convert table header');
console.assert(r5.markdown.includes('| A | 1 |'), 'Should convert table rows');

// Test 6: Lists
console.log('\n--- Test 6: Lists ---');
const r6 = readdown('<html><head><title>Lists</title></head><body><ul><li>Item 1</li><li>Item 2</li></ul><ol><li>First</li><li>Second</li></ol></body></html>');
console.log(r6.markdown);
console.assert(r6.markdown.includes('- Item 1'), 'Should convert unordered list');
console.assert(r6.markdown.includes('1. First'), 'Should convert ordered list');

// Test 7: Metadata extraction
console.log('\n--- Test 7: Metadata ---');
const r7 = readdown(`
<html lang="en"><head>
  <title>Article Title</title>
  <meta property="og:title" content="OG Title">
  <meta name="author" content="John Doe">
  <meta property="article:published_time" content="2026-03-12">
  <meta name="description" content="Article description">
  <meta property="og:site_name" content="My Blog">
</head><body><p>Content</p></body></html>`);
console.log('Metadata:', r7.metadata);
console.assert(r7.metadata.title === 'OG Title', 'Should prefer OG title');
console.assert(r7.metadata.author === 'John Doe', 'Should extract author');
console.assert(r7.metadata.date === '2026-03-12', 'Should extract date');

// Test 8: Raw mode (no content extraction)
console.log('\n--- Test 8: Raw mode ---');
const r8 = readdown('<html><head><title>Raw</title></head><body><nav>Nav content</nav><p>Body content</p></body></html>', { raw: true });
console.log(r8.markdown);
// In raw mode, nav is still filtered by shouldSkipElement but the whole body is used

// Test 9: No header
console.log('\n--- Test 9: No header ---');
const r9 = readdown('<html><head><title>No Header</title></head><body><p>Just content</p></body></html>', { includeHeader: false });
console.log(r9.markdown);
console.assert(!r9.markdown.includes('# No Header'), 'Should not include header');
console.assert(r9.markdown.includes('Just content'), 'Should include content');

// Test 10: Blockquotes
console.log('\n--- Test 10: Blockquotes ---');
const r10 = readdown('<html><head><title>Quote</title></head><body><blockquote><p>To be or not to be</p></blockquote></body></html>');
console.log(r10.markdown);
console.assert(r10.markdown.includes('> '), 'Should convert blockquote');

console.log('\n=== All tests passed! ===');
