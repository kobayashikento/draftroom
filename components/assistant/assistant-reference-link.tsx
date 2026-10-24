'use client';

import NextLink from 'next/link';
import { Button, Link, Menu, Portal } from '@chakra-ui/react';
import type { AssistantReferenceLinkProps } from './assistant-links.helpers.ts';
import { assistantLinkReferences } from './assistant-links.helpers.ts';

export default function AssistantReferenceLink({
  href,
  children,
  index,
  onNavigate
}: AssistantReferenceLinkProps) {
  const references = assistantLinkReferences(href, index);
  if (!references.length) return <>{children}</>;
  if (references.length === 1) {
    const reference = references[0];
    return (
      <Link asChild className="assistant-reference-link">
        <NextLink
          href={reference.href}
          scroll={false}
          prefetch={false}
          aria-label={`Open ${reference.description}: ${reference.title}`}
          onClick={() => {
            if (reference.target.type === 'view') onNavigate();
          }}
        >
          {children}
        </NextLink>
      </Link>
    );
  }
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          variant="plain"
          className="assistant-reference-link"
          aria-label={`Choose which ${references[0].title} to open`}
        >
          {children}
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {references.map(reference => (
              <Menu.Item key={reference.href} value={reference.href} asChild>
                <NextLink
                  href={reference.href}
                  scroll={false}
                  prefetch={false}
                  onClick={() => {
                    if (reference.target.type === 'view') onNavigate();
                  }}
                >
                  {reference.description} · {reference.title}
                </NextLink>
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
