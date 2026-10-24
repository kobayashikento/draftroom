'use client';

import { editorTabs, isEditorTab } from './editors.helpers.ts';
import type { ContentEditorProps } from './editors.helpers.ts';
import { useState } from 'react';
import { Tabs } from '@chakra-ui/react';
import { Button } from '../ui';
import ContentFields from './content-fields';
import NotesEditor from './notes-editor';
import DeleteIdeaDialog from './delete-idea-dialog';
import Analytics from '../views/analytics';
import Modal from './modal';
import Storyboard from './storyboard-editor';
import TaskEditor from './task-editor';
import PublishEditor from './publish-editor';

export default function ContentEditor({ item, initialTab, close }: ContentEditorProps) {
  const [tab, setTab] = useState(initialTab || 'Storyboard');
  const [deleting, setDeleting] = useState(false);
  if (deleting)
    return <DeleteIdeaDialog item={item} onCancel={() => setDeleting(false)} close={close} />;
  return (
    <Modal
      title="Make room for this idea."
      eyebrow="YOUR DRAFTROOM"
      onClose={close}
      footer={
        <>
          <Button className="link danger" onClick={() => setDeleting(true)}>
            Delete idea
          </Button>
          <span className="tiny muted">Changes save automatically</span>
          <Button className="primary" onClick={close}>
            Done
          </Button>
        </>
      }
    >
      <ContentFields item={item} />
      <Tabs.Root
        value={tab}
        onValueChange={({ value }) => {
          if (isEditorTab(value)) setTab(value);
        }}
        colorPalette="pistachio"
        variant="subtle"
      >
        <Tabs.List className="tabs" aria-label="Content details">
          {editorTabs.map(x => (
            <Tabs.Trigger key={x} value={x} className={tab === x ? 'active' : ''}>
              {x}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value={tab}>
          {tab === 'Storyboard' && <Storyboard item={item} />}
          {tab === 'Production' && (
            <TaskEditor item={item} onOpenPublish={() => setTab('Publish')} />
          )}
          {tab === 'Publish' && <PublishEditor item={item} />}
          {tab === 'Notes' && <NotesEditor item={item} />}
          {tab === 'Analytics' && <Analytics item={item} />}
        </Tabs.Content>
      </Tabs.Root>
    </Modal>
  );
}
