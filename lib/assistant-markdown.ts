import type { Options } from 'react-markdown';
// Assistant output can format text, but cannot load images, execute HTML or create links.
export const assistantMarkdown: Options = {
  skipHtml: true,
  unwrapDisallowed: true,
  allowedElements: ['p', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'pre', 'br', 'blockquote']
};
