import type { ReactNode } from 'react';
import type { Options } from 'react-markdown';
import type { Link, Parent, Root, RootContent, Text } from 'mdast';
import type { Workspace } from '../../lib/types.ts';
import type { MediaRecord } from '../media/media.helpers.ts';
import type { WorkspaceLink } from '../../lib/workspace-links.ts';
import { parseWorkspaceLink, workspaceLinkHref } from '../../lib/workspace-links.ts';
import { viewPaths } from '../../lib/navigation.ts';
import { canonicalPost } from '../../supabase/functions/_shared/media-helpers.ts';
import { assistantMarkdown } from '../../lib/assistant-markdown.ts';

export type AssistantReference = {
  title: string;
  description: string;
  href: string;
  target: WorkspaceLink;
};
export type AssistantReferenceIndex = {
  aliases: Map<string, AssistantReference[]>;
  targets: Map<string, AssistantReference>;
  posts: Map<string, AssistantReference>;
  pattern: RegExp | null;
};
export type AssistantReferenceLinkProps = {
  href?: string;
  children?: ReactNode;
  index: AssistantReferenceIndex;
  onNavigate: () => void;
};
type AssistantAnchorRenderer = NonNullable<NonNullable<Options['components']>['a']>;
const aliasPrefix = '#draftroom-reference-';
const aliasKey = (value: string) =>
  value.trim().replace(/\s+/g, ' ').replace(/[‘’]/g, "'").toLocaleLowerCase();
const targetKey = (link: WorkspaceLink): string => {
  if (link.type === 'view') return `view:${link.view}`;
  if (link.type === 'idea') return `idea:${link.id}:${link.taskId || ''}`;
  return `${link.type}:${link.id}`;
};

export function assistantReferenceIndex(
  state: Workspace,
  media: MediaRecord[]
): AssistantReferenceIndex {
  const index: AssistantReferenceIndex = {
    aliases: new Map(),
    targets: new Map(),
    posts: new Map(),
    pattern: null
  };
  function add(
    target: WorkspaceLink,
    title: string,
    description: string,
    aliases: string[] = [title]
  ) {
    const reference = { target, title, description, href: workspaceLinkHref(target) };
    index.targets.set(targetKey(target), reference);
    for (const alias of new Set(aliases.map(aliasKey))) {
      if (alias.length < 8 || !/[\p{L}\p{N}]/u.test(alias)) continue;
      const current = index.aliases.get(alias) || [];
      if (!current.some(value => value.href === reference.href)) current.push(reference);
      index.aliases.set(alias, current);
    }
    return reference;
  }
  for (const item of state.items) {
    add({ type: 'idea', id: item.id, tab: 'Storyboard' }, item.title, 'Idea');
    for (const task of item.tasks)
      add(
        { type: 'idea', id: item.id, tab: 'Production', taskId: task.id },
        task.title,
        item.title
      );
  }
  for (const series of state.series) add({ type: 'series', id: series.id }, series.name, 'Series');
  for (const [view] of Object.entries(viewPaths))
    add({ type: 'view', view: view as keyof typeof viewPaths }, view, 'Workspace');
  for (const record of media) {
    const short = record.title.split(/[\n\r\u2028#]/)[0].trim();
    const withoutEmoji = short.replace(/[\p{P}\p{S}\s\uFE0F\u200D]+$/gu, '').trim();
    const reference = add(
      { type: 'post', id: record.id },
      record.title,
      record.platform || 'Private clip',
      [record.title, short, withoutEmoji]
    );
    try {
      index.posts.set(canonicalPost(record.permalink).url, reference);
    } catch {
      /* Private uploads have no platform permalink. */
    }
  }
  const patterns = [...index.aliases.keys()]
    .sort((a, b) => b.length - a.length)
    .map(alias =>
      alias
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/'/g, "['‘’]")
        .replace(/ /g, '\\s+')
    );
  if (patterns.length)
    index.pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])(?:${patterns.join('|')})(?![\\p{L}\\p{N}])`,
      'giu'
    );
  return index;
}

export function assistantLinkReferences(
  href: string | undefined,
  index: AssistantReferenceIndex
): AssistantReference[] {
  if (!href) return [];
  if (href.startsWith(aliasPrefix)) {
    try {
      return index.aliases.get(decodeURIComponent(href.slice(aliasPrefix.length))) || [];
    } catch {
      return [];
    }
  }
  const target = parseWorkspaceLink(href);
  if (target) {
    const reference = index.targets.get(targetKey(target));
    return reference ? [{ ...reference, target, href: workspaceLinkHref(target) }] : [];
  }
  try {
    const reference = index.posts.get(canonicalPost(href).url);
    return reference ? [reference] : [];
  } catch {
    return [];
  }
}

export function linkAssistantMentions(tree: Root, index: AssistantReferenceIndex): void {
  const pattern = index.pattern;
  if (!pattern) return;
  function visit(parent: Parent, expression: RegExp) {
    if (['link', 'linkReference'].includes(parent.type)) return;
    parent.children = parent.children.flatMap<RootContent>(child => {
      if (child.type !== 'text') {
        if ('children' in child) visit(child, expression);
        return [child];
      }
      const children: (Text | Link)[] = [];
      let offset = 0;
      for (const match of child.value.matchAll(expression)) {
        const start = match.index;
        if (start > offset)
          children.push({ type: 'text', value: child.value.slice(offset, start) });
        children.push({
          type: 'link',
          url: `${aliasPrefix}${encodeURIComponent(aliasKey(match[0]))}`,
          children: [{ type: 'text', value: match[0] }]
        });
        offset = start + match[0].length;
      }
      if (offset < child.value.length)
        children.push({ type: 'text', value: child.value.slice(offset) });
      return children;
    });
  }
  visit(tree, pattern);
}

export function assistantLinkedMarkdown(
  index: AssistantReferenceIndex,
  renderAnchor: AssistantAnchorRenderer
): Options {
  return {
    ...assistantMarkdown,
    allowedElements: [...(assistantMarkdown.allowedElements || []), 'a'],
    urlTransform: href => (assistantLinkReferences(href, index).length ? href : ''),
    remarkPlugins: [() => (tree: Root) => linkAssistantMentions(tree, index)],
    components: { a: renderAnchor }
  };
}
