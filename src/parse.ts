import { parseHTML } from 'linkedom';

const HEAD_TAGS = new Set(['TITLE', 'META', 'LINK', 'BASE', 'STYLE', 'SCRIPT']);
const STRUCTURAL_TAGS = new Set(['HTML', 'HEAD', 'BODY']);

/**
 * Parse HTML into a document that always has a head and a body.
 *
 * linkedom does not add the `<html>`, `<head>` and `<body>` that HTML lets
 * authors omit, and its `document.body` is then an empty element.
 */
export function parseDocument(source: string): Document {
  const { document }: { document: Document } = parseHTML(source);
  if (isComplete(document)) return document;

  const html = document.createElement('html');
  const head = html.appendChild(document.createElement('head'));
  const body = html.appendChild(document.createElement('body'));

  const place = (parent: Node): void => {
    for (const node of [...parent.childNodes]) {
      if (STRUCTURAL_TAGS.has(node.nodeName)) place(node);
      else if (HEAD_TAGS.has(node.nodeName)) head.appendChild(node);
      else if (isContent(node, body)) body.appendChild(node);
    }
  };
  place(document);
  for (const emptied of [...document.children]) emptied.remove();
  document.appendChild(html);
  return document;
}

function isComplete(document: Document): boolean {
  const [root, ...rest] = document.children;
  return root?.tagName === 'HTML' && rest.length === 0 &&
    /^(HEAD,)?BODY$/.test(Array.from(root.children, el => el.tagName).join());
}

function isContent(node: Node, body: Node): boolean {
  if (node.nodeType === 3 /* TEXT_NODE */) return body.hasChildNodes() || /\S/.test(node.textContent || '');
  return node.nodeType === 1 /* ELEMENT_NODE */;
}
