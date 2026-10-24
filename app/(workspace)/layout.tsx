import type { ReactNode } from 'react';
import DraftroomApp from '../../components/DraftroomApp';

type WorkspaceLayoutProps = { children: ReactNode };

export default function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return <DraftroomApp>{children}</DraftroomApp>;
}
