# readdown

HTML to clean Markdown optimized for LLMs. One function: HTML in, token-efficient Markdown out.

Replaces the common `readability + turndown` two-package setup with a single dependency.

## Install

```bash
npm install readdown
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

## What it does

1. **Extracts main content** — strips nav, sidebars, footers, ads (like `@mozilla/readability`)
2. **Converts to Markdown** — headings, lists, tables, code blocks, links, images (like `turndown`)
3. **Estimates tokens** — approximate token count + context window usage for GPT-4o, Claude, Gemini

All in one function call, one dependency.

## Supported HTML elements

- Headings (`h1`-`h6`)
- Paragraphs, line breaks, horizontal rules
- **Bold**, *italic*, ~~strikethrough~~, `inline code`, ==highlights==
- Superscript (10^2^), subscript (H~2~O), abbreviations
- Links (with relative URL resolution)
- Images (with `data-src` lazy-loading fallback)
- Unordered, ordered, and nested lists (with proper indentation)
- Blockquotes
- Tables (with pipe escaping)
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

## Why not readability + turndown?

| | readability + turndown | readdown |
|---|---|---|
| Dependencies | 2 packages + glue code | 1 package |
| Bundle size | ~65 KB gzipped | ~5 KB gzipped |
| API | Multi-step pipeline | Single function |
| Token estimation | Not included | Built-in |
| Metadata | Separate extraction | Included |
| Nested lists | Requires config | Works out of the box |
| LLM-optimized | No | Yes (token-efficient output) |

## License

MIT
