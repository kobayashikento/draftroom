'use client';

import {
  productionView,
  productionRanges,
  isProductionTab,
  setTaskField
} from './production/production.helpers.ts';
import type { ProductionRange, ProductionTab } from './production/production.helpers.ts';
import { useState } from 'react';
import { Tabs } from '@chakra-ui/react';
import { ArrowRight, Check, FolderCheck, ListTodo } from 'lucide-react';
import { Button } from './ui';
import { AppIcon } from './icons';
import { useWorkspace } from './workspace/workspace-context';
import { fmt, today } from '../lib/display.ts';
import Checklist from './production/checklist';

export default function Production() {
  const { state, updateItem, open } = useWorkspace();
  const [range, setRange] = useState<ProductionRange>('All');
  const [tab, setTab] = useState<ProductionTab>('active');
  const { queue, unfinishedReady } = productionView(state, range, today());
  const groups = tab === 'active' ? queue.active : queue.completed;
  const next = queue.next;
  return (
    <Tabs.Root
      value={tab}
      onValueChange={({ value }) => {
        if (isProductionTab(value)) setTab(value);
      }}
      colorPalette="pistachio"
      variant="subtle"
    >
      <div className="toolbar production-controls">
        <Tabs.List className="production-tabs" aria-label="Production checklists">
          <Tabs.Trigger value="active">
            <AppIcon icon={ListTodo} />
            To do <span className="tab-count">{queue.active.length}</span>
          </Tabs.Trigger>
          <Tabs.Trigger value="completed">
            <AppIcon icon={FolderCheck} />
            Completed <span className="tab-count">{queue.completed.length}</span>
          </Tabs.Trigger>
        </Tabs.List>
        <div className="segmented" role="group" aria-label="Task due date">
          {productionRanges.map(value => (
            <Button
              key={value}
              className={range === value ? 'active' : ''}
              aria-pressed={range === value}
              onClick={() => setRange(value)}
            >
              {value}
            </Button>
          ))}
        </div>
        <span className="tiny muted" role="status">
          {queue.remaining} {queue.remaining === 1 ? 'task' : 'tasks'} left in this range
        </span>
      </div>
      <p className="production-hint">
        Flag a task or reel to bring it forward. Priority tasks come first, then priority projects,
        then due dates.
      </p>
      <Tabs.Content value={tab} className="production-content">
        {tab === 'active' && next && (
          <section className="panel production-next" aria-label="Up next">
            <div className="next-copy" aria-live="polite">
              <div className="meta">
                UP NEXT
                {next.t.priority === 'High' || next.p.priority === 'High' ? ' · PRIORITY' : ''}
              </div>
              <h2>{next.t.title}</h2>
              <Button className="link next-project" onClick={() => open(next.p.id, 'Production')}>
                {next.p.title} <AppIcon icon={ArrowRight} />
              </Button>
              <span className="tiny muted">
                {next.t.due ? `Due ${fmt(next.t.due)}` : 'No due date'} · {next.p.format}
              </span>
            </div>
            <Button
              className="primary"
              onClick={() => updateItem(next.p.id, p => setTaskField(p, next.t.id, 'done', true))}
            >
              <AppIcon icon={Check} />
              Complete & next
            </Button>
          </section>
        )}
        {groups.map(({ item, tasks }) => (
          <Checklist key={item.id} item={item} tasks={tasks} finished={tab === 'completed'} />
        ))}
        {!groups.length && (
          <div className="panel empty">
            {tab === 'completed'
              ? 'Your finished checklists will have a home here.'
              : 'A little breathing room. No unfinished checklists in this range.'}
            {tab === 'active' && queue.completed.length > 0 && (
              <div>
                <Button className="link" onClick={() => setTab('completed')}>
                  View completed checklists <AppIcon icon={ArrowRight} />
                </Button>
              </div>
            )}
          </div>
        )}
        {tab === 'completed' && groups.length > 0 && (
          <p className="footnote">
            Expand a checklist to review it or uncheck a task to reopen it. If the idea is Ready or
            Posted, move it back to a working stage to return it to To do.
          </p>
        )}
      </Tabs.Content>
      {unfinishedReady.map(p => (
        <p className="warning" key={p.id}>
          {p.title} is Ready with unfinished tasks.{' '}
          <Button className="link" onClick={() => open(p.id, 'Production')}>
            Review checklist
          </Button>
        </p>
      ))}
    </Tabs.Root>
  );
}
