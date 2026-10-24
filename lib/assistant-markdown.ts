import type { Options } from 'react-markdown';
// Base formatting stays inert; the chat adds only verified workspace links separately.
export const assistantMarkdown: Options = {
  skipHtml: true,
  unwrapDisallowed: true,
  allowedElements: ['p', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'pre', 'br', 'blockquote']
};
