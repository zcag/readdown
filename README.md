# readdown

HTML to clean Markdown optimized for LLMs. One function: HTML in, token-efficient Markdown out.

Replaces the common `@mozilla/readability` + `turndown` two-package setup with a single dependency.

## Install

```bash
# JSR (recommended)
npx jsr add @zcag/readdown

# npm (from GitHub)
npm install github:zcag/readdown
```

## Usage

```ts
import { readdown } from 'readdown';

const html = await fetch('https://example.com/article').then(r => r.text());
const result = readdown(html, { url: 'https://example.com/article' });

console.log(result.markdown);  // Clean markdown
console.log(result.tokens);    // ~1,250
console.log(result.metadata);  // { title, author, date, ... }
```

## CLI

```bash
# Install globally
npx jsr add -g @zcag/readdown

# Convert a URL
readdown https://example.com/article

# Pipe HTML
curl -s https://example.com | readdown

# From file
cat page.html | readdown
```

## What it does

1. **Extracts main content** — strips nav, sidebars, footers, ads (like `@mozilla/readability`)
2. **Converts to Markdown** — headings, lists, tables, code blocks, links, images (like `turndown`)
3. **Estimates tokens** — approximate token count + context window usage for GPT-4o, Claude, Gemini

All in one function call, one dependency.

## Benchmarks

Tested against real web pages (March 2026):

| Page | readdown | readability + turndown | defuddle |
|------|----------|----------------------|----------|
| MDN Promise docs (184 KB) | **64ms**, 23 headings, 17 code blocks | 98ms, 22 headings, 17 code blocks | 149ms, 0 headings, 0 code blocks |
| Wikipedia Markdown (190 KB) | **219ms**, 13 headings, 8 code blocks | 192ms, 2 headings, 0 code blocks | 368ms, 0 headings, 0 code blocks |
| htmx essay (17 KB) | **12ms**, 6 headings, 6 code blocks | 13ms, 3 headings, 6 code blocks | 30ms, 0 headings, 0 code blocks |
| Node.js About (299 KB) | **13ms**, 8 headings, 1 code block | 24ms, 6 headings, 1 code block | 72ms, 0 headings, 0 code blocks |
| Paul Graham essay (78 KB) | **17ms**, clean extraction | 46ms, clean extraction | 22ms, raw HTML dump |

**readdown wins on speed 4/5 pages** and extracts more document structure (headings, code blocks) than alternatives. defuddle requires a browser DOM and produces broken output with server-side parsers like linkedom.

Run benchmarks yourself: `node benchmark.js`

## Supported HTML elements

- Headings (`h1`-`h6`)
- Paragraphs, line breaks, horizontal rules
- **Bold**, *italic*, ~~strikethrough~~, `inline code`, ==highlights==
- Superscript (10^2^), subscript (H~2~O), abbreviations
- Links (with relative URL resolution)
- Images (with `data-src` lazy-loading fallback, spacer/tracking pixel filtering)
- Unordered, ordered, and nested lists (with proper indentation)
- Blockquotes
- Tables (data tables rendered, layout tables unwrapped)
- Code blocks (with language detection from `language-*`, `lang-*`, `highlight-*` classes)
- Definition lists (`dl`/`dt`/`dd`)
- `<details>`/`<summary>` (preserved as HTML)
- `<figure>`/`<figcaption>`

## API

### `readdown(html, options?)`

Returns `ReaddownResult`:

```ts
{
  markdown: string;       // Clean markdown output
  metadata: {             // Extracted from meta tags, JSON-LD, etc.
    title: string;
    author?: string;
    date?: string;
    description?: string;
    siteName?: string;
    url?: string;
    image?: string;
    lang?: string;
  };
  tokens: number;         // Approximate token count
  chars: number;          // Character count
  contextUsage: {         // % of context window used
    'gpt-4o': number;
    'claude-4': number;
    'gemini-2.5': number;
  };
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | — | Base URL for resolving relative links/images |
| `includeHeader` | `boolean` | `true` | Add title/source/author header to output |
| `raw` | `boolean` | `false` | Skip content extraction, convert full body |

## Advanced usage

Individual functions are exported for custom pipelines:

```ts
import { findMainContent, elementToMarkdown, extractMetadata, estimateTokens } from 'readdown';
```

## GitHub Action

```yaml
- uses: zcag/readdown@v0.2.0
  with:
    url: 'https://example.com/article'
```

## Why not readability + turndown?

| | readability + turndown | readdown |
|---|---|---|
| Dependencies | 2 packages + glue code | 1 package |
| Bundle size | ~65 KB gzipped | ~5 KB gzipped |
| API | Multi-step pipeline | Single function |
| Speed | Baseline | ~40% faster |
| Heading extraction | Often misses sections | Preserves full structure |
| Layout tables | Renders as data | Detected and unwrapped |
| Token estimation | Not included | Built-in |
| Metadata | Separate extraction | Included |
| LLM-optimized | No | Yes (token-efficient output) |

## License

MIT
