/**
 * Extract metadata from HTML document — title, author, date, description, etc.
 */

/** Metadata extracted from an HTML document (title, author, date, etc.). */
export interface Metadata {
  /** Page title from og:title, `<title>`, or first `<h1>`. */
  title: string;
  /** Author name from meta tags or JSON-LD. */
  author?: string;
  /** Publication date from article:published_time, meta date, or JSON-LD. */
  date?: string;
  /** Page description from og:description or meta description. */
  description?: string;
  /** Site name from og:site_name or JSON-LD publisher. */
  siteName?: string;
  /** Canonical URL from og:url or `<link rel="canonical">`. */
  url?: string;
  /** Primary image URL from og:image or twitter:image. */
  image?: string;
  /** Document language from the `lang` attribute on `<html>`. */
  lang?: string;
}

/**
 * Extract metadata from an HTML document.
 *
 * Reads Open Graph, Twitter Card, and standard meta tags, JSON-LD data,
 * `<time>` elements, and canonical URLs. Falls back through multiple
 * sources for each field.
 *
 * @param document - The parsed HTML document.
 * @param url - Optional source URL (used as fallback for `og:url` / canonical).
 * @returns Extracted metadata (title, author, date, description, etc.).
 */
export function extractMetadata(document: Document, url?: string): Metadata {
  const meta: Metadata = {
    title: '',
  };

  // Title: og:title > title tag > h1
  meta.title =
    getMetaContent(document, 'og:title') ||
    getMetaContent(document, 'twitter:title') ||
    document.title ||
    (document.querySelector('h1')?.textContent || '').trim();

  // Author
  meta.author =
    getMetaContent(document, 'author') ||
    getMetaContent(document, 'article:author') ||
    getJsonLdValue(document, 'author');

  // Date
  meta.date =
    getMetaContent(document, 'article:published_time') ||
    getMetaContent(document, 'date') ||
    getMetaContent(document, 'DC.date') ||
    getTimeElement(document) ||
    getJsonLdValue(document, 'datePublished');

  // Description
  meta.description =
    getMetaContent(document, 'og:description') ||
    getMetaContent(document, 'description') ||
    getMetaContent(document, 'twitter:description');

  // Site name
  meta.siteName =
    getMetaContent(document, 'og:site_name') ||
    getJsonLdValue(document, 'publisher');

  // URL
  meta.url =
    url ||
    getMetaContent(document, 'og:url') ||
    (document.querySelector('link[rel="canonical"]') as Element)?.getAttribute('href') ||
    undefined;

  // Image
  meta.image =
    getMetaContent(document, 'og:image') ||
    getMetaContent(document, 'twitter:image');

  // Language
  meta.lang =
    document.documentElement?.getAttribute('lang') || undefined;

  // Clean undefined values
  for (const key of Object.keys(meta) as (keyof Metadata)[]) {
    if (!meta[key]) delete meta[key];
  }

  return meta;
}

function getMetaContent(doc: Document, name: string): string | undefined {
  const el =
    doc.querySelector(`meta[property="${name}"]`) ||
    doc.querySelector(`meta[name="${name}"]`);
  const content = el?.getAttribute('content');
  return content?.trim() || undefined;
}

function getTimeElement(doc: Document): string | undefined {
  const time = doc.querySelector('time[datetime]');
  return time?.getAttribute('datetime') || undefined;
}

function getJsonLdValue(doc: Document, field: string): string | undefined {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      if (data[field]) {
        if (typeof data[field] === 'string') return data[field];
        if (data[field].name) return data[field].name;
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return undefined;
}
