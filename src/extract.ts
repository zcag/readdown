/**
 * Content extraction — finds the main content in an HTML document,
 * stripping navigation, ads, sidebars, and other non-content elements.
 */

const REMOVE_TAGS = new Set([
  'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
  'nav', 'footer', 'header', 'aside', 'form', 'button',
  'input', 'select', 'textarea', 'label', 'dialog',
]);

const SKIP_CLASSES = /\bnav\b|menu|sidebar|\bfooter\b|\bheader\b|breadcrumb|pagination|\bads?\b[-_]?|banner|cookie|popup|modal|overlay|\bsocial\b|share|comment-form|search-form|toc[-_]|table-of-contents/i;

interface ScoredElement {
  element: Element;
  score: number;
}

/**
 * Find the main content element in an HTML document.
 *
 * Uses semantic tags (`<article>`, `<main>`, `[role="main"]`) first,
 * then falls back to heuristic scoring based on paragraph text density
 * and link density.
 *
 * @param document - The parsed HTML document to extract content from.
 * @returns The DOM element most likely to contain the main content.
 */
export function findMainContent(document: Document): Element {
  // Try semantic tags first
  const article = document.querySelector('article');
  if (article && textLength(article) > 200) return article;

  const main = document.querySelector('main');
  if (main && textLength(main) > 200) return main;

  const role = document.querySelector('[role="main"]');
  if (role && textLength(role) > 200) return role;

  // Heuristic scoring: find the container with the most paragraph text
  // relative to its link density
  const candidates = document.querySelectorAll('div, section');
  let best: ScoredElement = { element: document.body, score: 0 };

  for (const el of candidates) {
    if (shouldSkipElement(el)) continue;

    const paragraphs = el.querySelectorAll('p');
    let textLen = 0;
    for (const p of paragraphs) textLen += (p.textContent || '').trim().length;

    const linkCount = el.querySelectorAll('a').length;
    const linkDensity = (linkCount + 1) / (paragraphs.length + 1);
    const score = textLen / (linkDensity + 1);

    if (score > best.score) {
      best = { element: el, score };
    }
  }

  return best.element;
}

/**
 * Check if an element should be skipped during content extraction.
 *
 * Skips navigation, ads, sidebars, hidden elements, and other
 * non-content elements based on tag name, class, and ARIA attributes.
 *
 * @param el - The DOM element to check.
 * @returns `true` if the element should be skipped.
 */
export function shouldSkipElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (REMOVE_TAGS.has(tag)) return true;
  if (el.getAttribute('hidden') !== null) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  if (SKIP_CLASSES.test(el.className || '')) return true;
  return false;
}

function textLength(el: Element): number {
  return (el.textContent || '').trim().length;
}
