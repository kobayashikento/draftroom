import type { Workspace } from './types.ts';
import type { ActionReceipt } from '../supabase/functions/_shared/types.ts';
import type { AssistantServiceAction } from '../supabase/functions/_shared/assistant-action-types.ts';
import type { MediaController, MediaRecord } from '../components/media/media.helpers.ts';
import { canonicalPost } from '../supabase/functions/_shared/media-helpers.ts';
import { parseWorkspaceLink, workspaceLinkHref } from './workspace-links.ts';
import { linkedWorkspaceModal } from '../components/workspace/workspace-links.helpers.ts';
import { assistantItem } from './assistant-workspace-actions.ts';
import { preparePublicationPostLink } from '../components/media/publication-link.helpers.ts';
import { downloadWorkspace } from './workspace-data.ts';
import { assistantConversationContent } from './assistant-conversations.ts';

export type AssistantServiceContext = {
  state: Workspace;
  library: MediaController;
  navigate: (href: string) => void;
  openCalendar: (date: string, platform: string) => void;
  newConversation: () => void;
  openConversation: (id: string) => void;
  showConversations: () => void;
  openReview: (messageId: string) => void;
  retrySync?: () => Promise<void>;
  signOut?: () => Promise<void>;
};

export function assistantMedia(media: MediaRecord[], id: string): MediaRecord {
  const record = media.find(record => record.id === id);
  if (!record) throw new Error('This library post is no longer available.');
  return record;
}
function publicationId(state: Workspace, itemId: string, platform: string): string {
  const publication = assistantItem(state, itemId).publications.find(
    pub => pub.platform === platform
  );
  if (!publication) throw new Error('This platform plan is no longer available.');
  return publication.id;
}

export function assistantServiceLabel(
  state: Workspace,
  media: MediaRecord[],
  action: AssistantServiceAction
): string {
  switch (action.type) {
    case 'navigate': {
      const link = parseWorkspaceLink(action.href);
      if (!link || (link.type !== 'view' && !linkedWorkspaceModal(link, state, media)))
        throw new Error('Choose an available Draftroom page or record.');
      return `Open ${link.type === 'view' ? link.view : link.type === 'idea' ? assistantItem(state, link.id).title : link.type === 'post' ? assistantMedia(media, link.id).title : 'series'}`;
    }
    case 'sync_posts':
      return `${action.older ? 'Import older' : 'Refresh'} ${action.platform} posts`;
    case 'open_calendar':
      return `Open calendar: ${action.date}${action.platform ? ` · ${action.platform}` : ''}`;
    case 'import_post':
      canonicalPost(action.url);
      if (action.itemId) assistantItem(state, action.itemId);
      return `Import ${action.title || 'published post link'}`;
    case 'update_media': {
      const record = assistantMedia(media, action.mediaId);
      if (action.itemId) assistantItem(state, action.itemId);
      if (action.itemId === undefined && action.archived === undefined)
        throw new Error('Specify a library change.');
      return `${action.archived === true ? 'Archive' : action.archived === false ? 'Restore' : action.itemId ? 'Link idea to' : 'Unlink idea from'} library post: ${record.title}`;
    }
    case 'link_publication':
      preparePublicationPostLink(state, media, {
        itemId: action.itemId,
        publicationId: publicationId(state, action.itemId, action.platform),
        mediaId: action.mediaId
      });
      return `Match ${action.platform} post to ${assistantItem(state, action.itemId).title} and mark that channel live`;
    case 'unlink_publication':
      publicationId(state, action.itemId, action.platform);
      return `Remove ${action.platform} publication match: ${assistantItem(state, action.itemId).title}`;
    case 'connect_account':
      return `Open ${action.platform} account connection`;
    case 'disconnect_account':
      return `Disconnect ${action.platform}; keep imported posts`;
    case 'export_workspace':
      return 'Download workspace backup';
    case 'retry_sync':
      return 'Retry cloud save';
    case 'sign_out':
      return 'Start sign-out flow';
    case 'new_conversation':
      return 'Start a new conversation';
    case 'open_conversation':
      if (!assistantConversationContent(state, action.id))
        throw new Error('This conversation is no longer available.');
      return 'Open saved conversation';
    case 'review_changes':
      if (
        !state.assistant?.messages.some(
          message => message.id === action.messageId && message.proposal?.status === 'pending'
        )
      )
        throw new Error('This proposal is no longer awaiting review.');
      return 'Open proposed changes for review';
    case 'show_conversations':
      return 'Show saved conversations';
  }
}

export async function executeAssistantServiceAction(
  context: AssistantServiceContext,
  action: AssistantServiceAction
): Promise<ActionReceipt> {
  const { state, library } = context;
  const label = assistantServiceLabel(state, library.media, action);
  let href: string | undefined;
  switch (action.type) {
    case 'navigate':
      context.navigate(action.href);
      href = action.href;
      break;
    case 'open_calendar':
      context.openCalendar(action.date, action.platform);
      href = '/calendar/';
      break;
    case 'sync_posts':
      await library.sync(action.platform, action.older);
      href = '/library/';
      break;
    case 'import_post': {
      const id = await library.importLink(action.url, action.title, action.itemId);
      href = workspaceLinkHref({ type: 'post', id });
      break;
    }
    case 'update_media': {
      const record = assistantMedia(library.media, action.mediaId);
      await library.updateMedia(
        record,
        action.itemId ?? record.linked_item_id,
        action.archived ?? Boolean(record.archived_at)
      );
      href = '/library/';
      break;
    }
    case 'link_publication':
      await library.linkPublication({
        itemId: action.itemId,
        publicationId: publicationId(state, action.itemId, action.platform),
        mediaId: action.mediaId
      });
      href = workspaceLinkHref({ type: 'idea', id: action.itemId, tab: 'Publish' });
      break;
    case 'unlink_publication':
      await library.unlinkPublication(
        action.itemId,
        publicationId(state, action.itemId, action.platform)
      );
      href = workspaceLinkHref({ type: 'idea', id: action.itemId, tab: 'Publish' });
      break;
    case 'connect_account':
      await library.connect(action.platform);
      break;
    case 'disconnect_account':
      await library.disconnect(action.platform);
      break;
    case 'export_workspace':
      downloadWorkspace(state);
      break;
    case 'retry_sync':
      if (!context.retrySync) throw new Error('Cloud saving is not available in this workspace.');
      await context.retrySync();
      break;
    case 'sign_out':
      if (!context.signOut) throw new Error('Sign-out is not available in this workspace.');
      await context.signOut();
      break;
    case 'new_conversation':
      context.newConversation();
      break;
    case 'open_conversation':
      context.openConversation(action.id);
      break;
    case 'review_changes':
      context.openReview(action.messageId);
      break;
    case 'show_conversations':
      context.showConversations();
      break;
  }
  return { itemId: '', label, ...(href ? { href } : {}) };
}
