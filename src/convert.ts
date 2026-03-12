/**
 * HTML element to Markdown converter.
 * Handles all common HTML elements with clean, token-efficient output.
 */

import { shouldSkipElement } from './extract.js';

interface ConvertOptions {
  /** Base URL for resolving relative links */
  baseUrl?: string;
  /** Whether we're inside a preformatted block */
  preformatted?: boolean;
}

export function elementToMarkdown(node: Node, opts: ConvertOptions = {}): string {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    let text = node.textContent || '';
    if (!opts.preformatted) {
      text = text.replace(/\s+/g, ' ');
    }
    return text;
  }

  if (node.nodeType !== 1 /* ELEMENT_NODE */) return '';

  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (shouldSkipElement(el)) return '';

  const children = (): string => {
    let result = '';
    for (const child of el.childNodes) {
      result += elementToMarkdown(child, opts);
    }
    return result;
  };

  const inline = (): string => {
    let result = '';
    for (const child of el.childNodes) {
      result += elementToMarkdown(child, opts);
    }
    return result;
  };

  switch (tag) {
    // Headings
    case 'h1': return `\n\n# ${inline().trim()}\n\n`;
    case 'h2': return `\n\n## ${inline().trim()}\n\n`;
    case 'h3': return `\n\n### ${inline().trim()}\n\n`;
    case 'h4': return `\n\n#### ${inline().trim()}\n\n`;
    case 'h5': return `\n\n##### ${inline().trim()}\n\n`;
    case 'h6': return `\n\n###### ${inline().trim()}\n\n`;

    // Block elements
    case 'p': {
      const content = children().trim();
      return content ? `\n\n${content}\n\n` : '';
    }

    case 'div':
    case 'section':
    case 'article':
    case 'main': {
      const content = children().trim();
      if (!content) return '';
      const hasBlocks = el.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol, table, pre, blockquote');
      if (hasBlocks) return children();
      return `\n\n${content}\n\n`;
    }

    case 'br': return '\n';
    case 'hr': return '\n\n---\n\n';

    // Inline formatting
    case 'strong':
    case 'b': {
      const t = inline().trim();
      return t ? `**${t}**` : '';
    }

    case 'em':
    case 'i': {
      const t = inline().trim();
      return t ? `*${t}*` : '';
    }

    case 'del':
    case 's':
    case 'strike': {
      const t = inline().trim();
      return t ? `~~${t}~~` : '';
    }

    // Code
    case 'code': {
      if (el.parentElement && el.parentElement.tagName.toLowerCase() === 'pre') {
        return el.textContent || '';
      }
      const t = (el.textContent || '').trim();
      return t ? `\`${t}\`` : '';
    }

    case 'pre': {
      const codeEl = el.querySelector('code');
      const text = codeEl ? codeEl.textContent : el.textContent;
      let lang = '';
      const langClass = ((codeEl || el).className || '').match(/(?:language-|lang-|highlight-)(\w+)/);
      if (langClass) lang = langClass[1];
      return `\n\n\`\`\`${lang}\n${(text || '').trimEnd()}\n\`\`\`\n\n`;
    }

    // Links and images
    case 'a': {
      const href = el.getAttribute('href');
      const text = inline().trim();
      if (!text) return '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return text;
      const fullUrl = resolveUrl(href, opts.baseUrl);
      return `[${text}](${fullUrl})`;
    }

    case 'img': {
      const alt = el.getAttribute('alt') || '';
      const src = el.getAttribute('src');
      if (!src) return '';
      const fullSrc = resolveUrl(src, opts.baseUrl);
      return `![${alt}](${fullSrc})`;
    }

    // Lists
    case 'ul': {
      let result = '\n\n';
      for (const li of el.children) {
        if (li.tagName.toLowerCase() === 'li') {
          const content = elementToMarkdown(li, opts).trim();
          if (content) result += `- ${content}\n`;
        }
      }
      return result + '\n';
    }

    case 'ol': {
      let result = '\n\n';
      let i = parseInt(el.getAttribute('start') || '1', 10);
      for (const li of el.children) {
        if (li.tagName.toLowerCase() === 'li') {
          const content = elementToMarkdown(li, opts).trim();
          if (content) {
            result += `${i}. ${content}\n`;
            i++;
          }
        }
      }
      return result + '\n';
    }

    case 'li': return children();

    // Blockquote
    case 'blockquote': {
      const content = children().trim();
      if (!content) return '';
      return '\n\n' + content.split('\n').map(line => `> ${line}`).join('\n') + '\n\n';
    }

    // Table
    case 'table': return convertTable(el, opts);

    // Figure
    case 'figure': return children();
    case 'figcaption': {
      const t = inline().trim();
      return t ? `\n*${t}*\n` : '';
    }

    // Definition list
    case 'dl': return children();
    case 'dt': {
      const t = inline().trim();
      return t ? `\n\n**${t}**\n` : '';
    }
    case 'dd': {
      const t = children().trim();
      return t ? `: ${t}\n` : '';
    }

    // Details/summary
    case 'details': {
      const summary = el.querySelector('summary');
      const summaryText = summary ? (summary.textContent || '').trim() : 'Details';
      let content = '';
      for (const child of el.childNodes) {
        if (child !== summary) content += elementToMarkdown(child, opts);
      }
      return `\n\n<details>\n<summary>${summaryText}</summary>\n${content.trim()}\n</details>\n\n`;
    }
    case 'summary': return '';

    // Skip media
    case 'video':
    case 'audio':
    case 'source':
    case 'picture':
    case 'map':
    case 'area':
      return '';

    default:
      return children();
  }
}

function convertTable(table: Element, opts: ConvertOptions): string {
  const rows: string[][] = [];
  const allRows = table.querySelectorAll('tr');

  for (const tr of allRows) {
    const cells: string[] = [];
    for (const cell of tr.children) {
      const tag = cell.tagName.toLowerCase();
      if (tag === 'td' || tag === 'th') {
        const text = elementToMarkdown(cell, opts).trim()
          .replace(/\|/g, '\\|')
          .replace(/\n+/g, ' ');
        cells.push(text);
      }
    }
    if (cells.length > 0) rows.push(cells);
  }

  if (rows.length === 0) return '';

  const colCount = Math.max(...rows.map(r => r.length));
  for (const row of rows) {
    while (row.length < colCount) row.push('');
  }

  let md = '\n\n';
  md += '| ' + rows[0].join(' | ') + ' |\n';
  md += '| ' + rows[0].map(() => '---').join(' | ') + ' |\n';
  for (let i = 1; i < rows.length; i++) {
    md += '| ' + rows[i].join(' | ') + ' |\n';
  }
  return md + '\n';
}

function resolveUrl(url: string, base?: string): string {
  if (!base) return url;
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}
