/**
 * readdown — HTML to clean Markdown optimized for LLMs.
 *
 * One function: HTML in, token-efficient Markdown out.
 *
 * @example
 * ```ts
 * import { readdown } from 'readdown';
 *
 * const result = readdown('<html><body><h1>Hello</h1><p>World</p></body></html>');
 * console.log(result.markdown); // # Hello\n\nWorld
 * console.log(result.tokens);   // ~3
 * ```
 */

import { parseHTML } from 'linkedom';
import { findMainContent } from './extract.js';
import { elementToMarkdown } from './convert.js';
import { extractMetadata, type Metadata } from './metadata.js';
import { estimateTokens, type TokenEstimate } from './tokens.js';

/** Options for the {@linkcode readdown} function. */
export interface ReaddownOptions {
  /** Base URL for resolving relative links and images */
  url?: string;
  /** Include metadata header (title, source URL) in output. Default: true */
  includeHeader?: boolean;
  /** Extract from full document (false) or use content as-is (true). Default: false */
  raw?: boolean;
}

/** Result returned by the {@linkcode readdown} function. */
export interface ReaddownResult {
  /** Clean Markdown content */
  markdown: string;
  /** Extracted metadata */
  metadata: Metadata;
  /** Token estimation */
  tokens: number;
  /** Character count */
  chars: number;
  /** Context window usage percentages */
  contextUsage: TokenEstimate['contextUsage'];
}

/**
 * Convert HTML to clean, token-efficient Markdown.
 *
 * Combines content extraction (like @mozilla/readability) and
 * HTML-to-Markdown conversion (like turndown) in a single call.
 */
export function readdown(html: string, options: ReaddownOptions = {}): ReaddownResult {
  const { url, includeHeader = true, raw = false } = options;

  let document: Document;
  try {
    ({ document } = parseHTML(html));
  } catch {
    // If HTML is severely malformed, return raw text
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const estimate = estimateTokens(text);
    return {
      markdown: text + '\n',
      metadata: { title: '' },
      tokens: estimate.tokens,
      chars: estimate.chars,
      contextUsage: estimate.contextUsage,
    };
  }

  // Extract metadata before content extraction modifies the DOM
  const metadata = extractMetadata(document, url);

  // Find main content or use whole body
  const root = raw ? document.body : findMainContent(document);

  // Convert to markdown
  let markdown = elementToMarkdown(root, { baseUrl: url });

  // Add header if requested
  if (includeHeader && metadata.title) {
    let header = `# ${metadata.title}\n`;
    if (metadata.url) header += `\nSource: ${metadata.url}\n`;
    if (metadata.author) header += `Author: ${metadata.author}\n`;
    if (metadata.date) header += `Date: ${metadata.date}\n`;
    header += '\n---\n';
    markdown = header + markdown;
  }

  // Clean up
  markdown = cleanMarkdown(markdown);

  // Estimate tokens
  const estimate = estimateTokens(markdown);

  return {
    markdown,
    metadata,
    tokens: estimate.tokens,
    chars: estimate.chars,
    contextUsage: estimate.contextUsage,
  };
}

function cleanMarkdown(md: string): string {
  return md
    // Remove trailing whitespace on lines first (whitespace-only lines become empty)
    .split('\n').map(l => l.trimEnd()).join('\n')
    // Then collapse 3+ newlines to 2 (catches sequences created by trimming)
    .replace(/\n{3,}/g, '\n\n')
    // Trim
    .trim() + '\n';
}

// Re-export types and utilities
export { type Metadata } from './metadata.js';
export { type TokenEstimate } from './tokens.js';
export { findMainContent } from './extract.js';
export { elementToMarkdown } from './convert.js';
export { extractMetadata } from './metadata.js';
export { estimateTokens } from './tokens.js';
