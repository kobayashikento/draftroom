import type { View } from './types.ts';

export const viewPaths: Record<View, string> = {
  Overview: '/overview/',
  Calendar: '/calendar/',
  Ideas: '/ideas/',
  Production: '/production/',
  Library: '/library/',
  Series: '/series/',
  Analytics: '/analytics/'
};

export function viewForPathname(pathname: string): View {
  const path = `${pathname.replace(/\/$/, '')}/`;
  return (Object.entries(viewPaths).find(([, href]) => href === path)?.[0] as View) ?? 'Calendar';
}

export function workspaceEntryPath(url: URL): string {
  const params = new URLSearchParams(url.search);
  const destination = Object.entries(viewPaths).find(([view]) => view === params.get('view'));
  params.delete('view');
  const query = params.toString();
  return `${destination?.[1] ?? viewPaths.Calendar}${query ? `?${query}` : ''}${url.hash}`;
}
