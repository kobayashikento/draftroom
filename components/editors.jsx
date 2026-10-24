'use client';
import { useState } from 'react';
import { Dialog, Portal, Tabs } from '@chakra-ui/react';
import { Input, Textarea, Badge, PriorityButton } from './ui';
import { X, ArrowUp, ArrowDown, ArrowRight, Plus } from 'lucide-react';
import { AppIcon } from './icons';
import { useWorkspace, Button, Field, Select, reorder, fmt } from './workspace';
import { uid, createItem, kind } from '../lib/model';
import { reschedulePublication } from '../lib/calendar';
import { Analytics } from './views';
function Modal({ title, children, footer, onClose, eyebrow, compact = false }) {
  return (
    <Dialog.Root
      open
      onOpenChange={({ open }) => {
        if (!open) onClose();
      }}
      placement="center"
      scrollBehavior="inside"
      closeOnInteractOutside={false}
    >
      <Portal>
        <Dialog.Backdrop bg="draftroom.overlay" backdropFilter="blur(3px)" />
        <Dialog.Positioner padding={{ base: '4', md: '8' }}>
          <Dialog.Content
            className="studio-dialog"
            width={compact ? '480px' : '920px'}
            maxWidth="95vw"
            maxHeight="92vh"
            bg="draftroom.canvas"
            color="draftroom.ink"
            overflow="hidden"
          >
            <Dialog.Header className="modal-head">
              <div>
                {eyebrow && <div className="meta">{eyebrow}</div>}
                <Dialog.Title asChild>
                  <h2>{title}</h2>
                </Dialog.Title>
              </div>
              <Button className="icon-button" aria-label="Close editor" onClick={onClose}>
                <AppIcon icon={X} />
              </Button>
            </Dialog.Header>
            <Dialog.Body className="modal-body" overflowY="auto">
              {children}
            </Dialog.Body>
            {footer && <Dialog.Footer className="modal-footer">{footer}</Dialog.Footer>}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
export default function Modals() {
  const { modal, setModal, state } = useWorkspace();
  if (!modal) return null;
  const close = () => setModal(null);
  if (modal.type === 'add')
    return (
      <AddIdea
        key={`add-${modal.seriesId || ''}-${modal.date || ''}-${modal.platform || ''}`}
        modal={modal}
        close={close}
      />
    );
  if (modal.type === 'series')
    return <SeriesEditor key={modal.id || 'new'} id={modal.id} close={close} />;
  if (modal.type === 'stages') return <StageEditor close={close} />;
  const item = state.items.find((p) => p.id === modal.id);
  if (modal.type === 'reschedule') {
    const publication = item?.publications.find((pub) => pub.id === modal.publicationId);
    return publication ? (
      <RescheduleEditor key={publication.id} item={item} publication={publication} close={close} />
    ) : null;
  }
  return item ? (
    <ContentEditor key={item.id} item={item} initialTab={modal.tab} close={close} />
  ) : null;
}
function RescheduleEditor({ item, publication, close }) {
  const { updateItem, notify } = useWorkspace();
  const [date, setDate] = useState(publication.date);
  function save(nextDate) {
    if (!reschedulePublication({ publications: [{ ...publication }] }, publication.id, nextDate)) {
      notify('Choose a valid date for an unposted plan.');
      return;
    }
    updateItem(item.id, (draft) => reschedulePublication(draft, publication.id, nextDate));
    close();
    notify(nextDate ? 'Your plan has a new date.' : 'Plan moved to Unscheduled.');
  }
  return (
    <Modal
      compact
      title="Make a little room."
      eyebrow={`${publication.platform} · ${item.title}`}
      onClose={close}
      footer={
        <>
          <Button
            className="link"
            disabled={!publication.date || publication.state === 'manually_posted'}
            onClick={() => save('')}
          >
            Move to Unscheduled
          </Button>
          <Button
            className="primary"
            type="submit"
            form="reschedule-plan"
            disabled={!date || publication.state === 'manually_posted'}
          >
            Save date
          </Button>
        </>
      }
    >
      <form
        id="reschedule-plan"
        onSubmit={(event) => {
          event.preventDefault();
          if (date) save(date);
        }}
      >
        <Field label="Planned publication date">
          <Input
            autoFocus
            required
            type="date"
            max="9999-12-31"
            value={date}
            onInput={(e) => setDate(e.currentTarget.value)}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <p className="footnote">
          This updates only the {publication.platform} plan. Your other channel dates and checklist
          stay as they are.
        </p>
      </form>
    </Modal>
  );
}
function AddIdea({ modal, close }) {
  const { state, update, open, notify } = useWorkspace();
  const [title, setTitle] = useState(''),
    [seriesId, setSeriesId] = useState(modal.seriesId || ''),
    [format, setFormat] = useState(
      state.series.find((s) => s.id === modal.seriesId)?.format || 'Reel',
    );
  function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const p = createItem(state, { title: title.trim(), format, seriesId });
    if (modal.date) {
      const publication =
        p.publications.find((pub) => pub.platform === modal.platform) || p.publications[0];
      publication.date = modal.date;
    }
    update((s) => s.items.push(p));
    open(p.id, modal.date ? 'Publish' : 'Storyboard');
    notify('A new idea has a home.');
  }
  return (
    <Modal
      title="A spark of something good."
      onClose={close}
      footer={
        <>
          <span className="tiny muted">
            {modal.date
              ? `${modal.platform || 'Instagram'} · ${fmt(modal.date)}`
              : 'Start small. Add the details later.'}
          </span>
          <Button type="submit" form="new-idea" className="primary">
            Create idea <AppIcon icon={ArrowRight} />
          </Button>
        </>
      }
    >
      <form id="new-idea" onSubmit={submit} className="fields">
        <Field label="What’s your idea?" wide>
          <Input
            required
            autoFocus
            placeholder="A little idea goes a long way…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Format">
          <Select options={['Reel', 'Carousel']} value={format} onChange={setFormat} />
        </Field>
        <Field label="Series (optional)">
          <Select
            options={[['', 'No series'], ...state.series.map((s) => [s.id, s.name])]}
            value={seriesId}
            onChange={(v) => {
              setSeriesId(v);
              const s = state.series.find((x) => x.id === v);
              if (s) setFormat(s.format);
            }}
          />
        </Field>
      </form>
    </Modal>
  );
}
function ContentEditor({ item, initialTab, close }) {
  const { state, update, updateItem, notify } = useWorkspace();
  const [tab, setTab] = useState(initialTab || 'Storyboard'),
    [deleting, setDeleting] = useState(false);
  const set = (key, value) => updateItem(item.id, (p) => (p[key] = value));
  if (deleting)
    return (
      <Modal
        title="Delete this idea?"
        onClose={() => setDeleting(false)}
        footer={
          <>
            <Button onClick={() => setDeleting(false)}>Keep idea</Button>
            <Button
              className="danger"
              onClick={() => {
                update((s) => (s.items = s.items.filter((p) => p.id !== item.id)));
                close();
                notify('Idea deleted.');
              }}
            >
              Delete idea
            </Button>
          </>
        }
      >
        <p>{item.title} and its storyboard, tasks, and schedules will be removed.</p>
      </Modal>
    );
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
      <div className="fields">
        <Field label="Working title" wide>
          <Input value={item.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Format">
          <Select
            options={['Reel', 'Carousel']}
            value={item.format}
            onChange={(v) => set('format', v)}
          />
        </Field>
        <Field label="Workflow stage">
          <Select
            options={state.stages.map((s) => [s.id, s.name])}
            value={item.stageId}
            onChange={(v) => set('stageId', v)}
          />
        </Field>
        <Field label="Series">
          <Select
            options={[['', 'No series'], ...state.series.map((s) => [s.id, s.name])]}
            value={item.seriesId}
            onChange={(v) =>
              updateItem(item.id, (p) => {
                p.seriesId = v;
                p.cadence = state.series.find((s) => s.id === v)?.cadence || p.cadence;
              })
            }
          />
        </Field>
        <Field label="Cadence">
          <Input
            placeholder="Your own rhythm"
            value={item.cadence}
            onChange={(e) => set('cadence', e.target.value)}
          />
        </Field>
        <Field label="Cover hook" wide>
          <Input
            placeholder="The first thing your audience sees…"
            value={item.hook}
            onChange={(e) => set('hook', e.target.value)}
          />
        </Field>
      </div>
      <Tabs.Root
        value={tab}
        onValueChange={({ value }) => setTab(value)}
        colorPalette="pistachio"
        variant="subtle"
      >
        <Tabs.List className="tabs" aria-label="Content details">
          {['Storyboard', 'Production', 'Publish', 'Notes', 'Analytics'].map((x) => (
            <Tabs.Trigger key={x} value={x} className={tab === x ? 'active' : ''}>
              {x}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value={tab}>
          {tab === 'Storyboard' && <Storyboard item={item} />}
          {tab === 'Production' && <TaskEditor item={item} />}
          {tab === 'Publish' && <PublishEditor item={item} />}
          {tab === 'Notes' && (
            <div className="fields">
              <Field label="Notes" wide>
                <Textarea
                  rows={6}
                  value={item.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </Field>
              <Field label="Tags">
                <Input
                  placeholder="cozy, home, matcha"
                  value={item.tags}
                  onChange={(e) => set('tags', e.target.value)}
                />
              </Field>
              <Field label="Priority">
                <Select
                  options={['Normal', 'High']}
                  value={item.priority}
                  onChange={(v) => set('priority', v)}
                />
              </Field>
            </div>
          )}
          {tab === 'Analytics' && <Analytics item={item} />}
        </Tabs.Content>
      </Tabs.Root>
    </Modal>
  );
}
function Storyboard({ item }) {
  const { updateItem } = useWorkspace();
  const set = (id, key, value) =>
    updateItem(item.id, (p) => (p.storyboard.find((e) => e.id === id)[key] = value));
  const noun = item.format === 'Reel' ? 'shot' : 'slide';
  return (
    <>
      <p className="subtitle mb-4">
        {item.format === 'Reel'
          ? 'Build your reel, one shot at a time.'
          : 'Tell your story, one slide at a time.'}
      </p>
      {item.storyboard.map((entry, i) => (
        <div className="entry" key={entry.id}>
          <div className="entry-head">
            <span className="number">{String(i + 1).padStart(2, '0')}</span>
            <Input
              type="checkbox"
              aria-label={`Complete ${noun} ${i + 1}`}
              checked={entry.done}
              onChange={(e) => set(entry.id, 'done', e.target.checked)}
            />
            <Input
              aria-label={`Entry ${i + 1} title`}
              type="text"
              value={entry.title}
              onChange={(e) => set(entry.id, 'title', e.target.value)}
            />
            <div className="entry-controls">
              <Button
                className="icon-button"
                aria-label="Move entry up"
                disabled={i === 0}
                onClick={() => updateItem(item.id, (p) => reorder(p.storyboard, entry.id, -1))}
              >
                <AppIcon icon={ArrowUp} />
              </Button>
              <Button
                className="icon-button"
                aria-label="Move entry down"
                disabled={i === item.storyboard.length - 1}
                onClick={() => updateItem(item.id, (p) => reorder(p.storyboard, entry.id, 1))}
              >
                <AppIcon icon={ArrowDown} />
              </Button>
              <Button
                className="icon-button"
                aria-label="Remove entry"
                onClick={() =>
                  updateItem(
                    item.id,
                    (p) => (p.storyboard = p.storyboard.filter((x) => x.id !== entry.id)),
                  )
                }
              >
                <AppIcon icon={X} />
              </Button>
            </div>
          </div>
          <div className="fields">
            <Field label="Overlay text">
              <Input
                placeholder="A few words on screen"
                value={entry.overlay}
                onChange={(e) => set(entry.id, 'overlay', e.target.value)}
              />
            </Field>
            <Field label="Reference image / inspiration URL">
              <Input
                type="url"
                placeholder="https://…"
                value={entry.reference}
                onChange={(e) => set(entry.id, 'reference', e.target.value)}
              />
            </Field>
            <Field
              wide
              label={
                item.format === 'Reel'
                  ? 'Shot notes · framing, action, audio, duration'
                  : 'Personal note · why this little moment matters'
              }
            >
              <Textarea
                value={entry.notes}
                onChange={(e) => set(entry.id, 'notes', e.target.value)}
              />
            </Field>
          </div>
        </div>
      ))}
      <Button
        onClick={() =>
          updateItem(item.id, (p) =>
            p.storyboard.push({
              id: uid(),
              title: 'A new moment',
              overlay: '',
              notes: '',
              reference: '',
              done: false,
            }),
          )
        }
      >
        <AppIcon icon={Plus} />
        Add {noun}
      </Button>
    </>
  );
}
function TaskEditor({ item }) {
  const { state, updateItem } = useWorkspace();
  const set = (id, key, value) =>
    updateItem(item.id, (p) => (p.tasks.find((t) => t.id === id)[key] = value));
  return (
    <>
      {kind(state, item) !== 'prep' && item.tasks.some((t) => !t.done) && (
        <p className="warning">This idea has unfinished tasks. Its stage stays as you set it.</p>
      )}
      {item.tasks.map((t, i) => (
        <div className="task-edit" key={t.id}>
          <Input
            type="checkbox"
            aria-label={`Complete ${t.title}`}
            checked={t.done}
            onChange={(e) => set(t.id, 'done', e.target.checked)}
          />
          <Input
            aria-label="Task title"
            type="text"
            value={t.title}
            onChange={(e) => set(t.id, 'title', e.target.value)}
          />
          <Select
            aria-label="Task category"
            options={['plan', 'film', 'photo', 'edit', 'caption', 'publish']}
            value={t.category}
            onChange={(v) => set(t.id, 'category', v)}
          />
          <Input
            type="date"
            aria-label="Task due date"
            value={t.due}
            onInput={(e) => set(t.id, 'due', e.currentTarget.value)}
            onChange={(e) => set(t.id, 'due', e.target.value)}
          />
          <div className="entry-controls">
            <PriorityButton
              label={`task: ${t.title}`}
              active={t.priority === 'High'}
              onClick={() => set(t.id, 'priority', t.priority === 'High' ? 'Normal' : 'High')}
            />
            <Button
              className="icon-button"
              aria-label="Move task up"
              disabled={i === 0}
              onClick={() => updateItem(item.id, (p) => reorder(p.tasks, t.id, -1))}
            >
              <AppIcon icon={ArrowUp} />
            </Button>
            <Button
              className="icon-button"
              aria-label="Move task down"
              disabled={i === item.tasks.length - 1}
              onClick={() => updateItem(item.id, (p) => reorder(p.tasks, t.id, 1))}
            >
              <AppIcon icon={ArrowDown} />
            </Button>
            <Button
              className="icon-button"
              aria-label="Remove task"
              onClick={() =>
                updateItem(item.id, (p) => (p.tasks = p.tasks.filter((x) => x.id !== t.id)))
              }
            >
              <AppIcon icon={X} />
            </Button>
          </div>
        </div>
      ))}
      <Button
        onClick={() =>
          updateItem(item.id, (p) =>
            p.tasks.push({
              id: uid(),
              title: 'New task',
              category: 'plan',
              due: '',
              done: false,
              priority: 'Normal',
            }),
          )
        }
      >
        <AppIcon icon={Plus} />
        Add task
      </Button>
    </>
  );
}
function PublishEditor({ item }) {
  const { updateItem } = useWorkspace();
  const set = (id, key, value) =>
    updateItem(item.id, (p) => (p.publications.find((pub) => pub.id === id)[key] = value));
  return (
    <>
      <p className="banner">
        Plan each platform separately. Marking a publication posted records your manual update; it
        does not publish online or change the idea’s workflow stage.
      </p>
      {item.publications.map((pub) => (
        <section className="entry" key={pub.id} aria-label={pub.platform}>
          <div className="section-head mt-0 mb-4">
            <h2>{pub.platform}</h2>
            <Badge className="pill">
              {pub.state === 'manually_posted' ? 'Manually posted' : 'Planned'}
            </Badge>
          </div>
          <div className="fields">
            <Field label="Planned publication date">
              <Input
                type="date"
                value={pub.date}
                onInput={(e) => set(pub.id, 'date', e.currentTarget.value)}
                onChange={(e) => set(pub.id, 'date', e.target.value)}
              />
            </Field>
            <Field label="Published post URL">
              <Input
                type="url"
                value={pub.url}
                placeholder="https://…"
                onChange={(e) => set(pub.id, 'url', e.target.value)}
              />
            </Field>
            <Field label="Platform post ID (optional)">
              <Input value={pub.postId} onChange={(e) => set(pub.id, 'postId', e.target.value)} />
            </Field>
            <Field label="Final caption & hashtags" wide>
              <Textarea
                placeholder="Your words, your voice…"
                value={pub.caption}
                onChange={(e) => set(pub.id, 'caption', e.target.value)}
              />
            </Field>
          </div>
          {pub.url && !/^https?:\/\//i.test(pub.url) && (
            <p className="warning">Use a full http or https link.</p>
          )}
          <div className="mt-4">
            <Button
              className="small"
              onClick={() =>
                updateItem(item.id, (p) => {
                  const target = p.publications.find((x) => x.id === pub.id);
                  target.state = target.state === 'planned' ? 'manually_posted' : 'planned';
                  target.publishedAt =
                    target.state === 'manually_posted' ? new Date().toISOString() : null;
                })
              }
            >
              {pub.state === 'manually_posted' ? 'Undo posted status' : 'Mark manually posted'}
            </Button>
          </div>
        </section>
      ))}
    </>
  );
}
function SeriesEditor({ id, close }) {
  const { state, update, notify } = useWorkspace(),
    s = state.series.find((s) => s.id === id);
  const [form, setForm] = useState({
    name: s?.name || '',
    description: s?.description || '',
    format: s?.format || 'Reel',
    cadence: s?.cadence || 'Weekly',
    storyboard: (s?.storyboard || ['Opening hook', 'Main moment', 'Closing shot']).join('\n'),
    tasks: (s?.tasks || ['Plan shots', 'Film clips', 'Edit video', 'Write caption']).join('\n'),
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  function submit(e) {
    e.preventDefault();
    const data = {
      ...form,
      name: form.name.trim(),
      storyboard: form.storyboard.split('\n').filter((x) => x.trim()),
      tasks: form.tasks.split('\n').filter((x) => x.trim()),
    };
    if (!data.name) return;
    update((s) => {
      if (id)
        Object.assign(
          s.series.find((x) => x.id === id),
          data,
        );
      else s.series.push({ ...data, id: uid(), icon: 'sparkles' });
    });
    close();
    notify('Series template saved.');
  }
  return (
    <Modal
      title={id ? 'Shape your series.' : 'A new creative rhythm.'}
      onClose={close}
      footer={
        <>
          <span className="tiny muted">Templates apply to future episodes.</span>
          <Button type="submit" className="primary" form="series-form">
            Save series
          </Button>
        </>
      }
    >
      <form id="series-form" className="fields" onSubmit={submit}>
        <Field label="Series name" wide>
          <Input
            autoFocus
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field label="Description" wide>
          <Input value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Default format">
          <Select
            options={['Reel', 'Carousel']}
            value={form.format}
            onChange={(v) => set('format', v)}
          />
        </Field>
        <Field label="Cadence">
          <Input required value={form.cadence} onChange={(e) => set('cadence', e.target.value)} />
        </Field>
        <Field label="Storyboard template · one shot or slide per line" wide>
          <Textarea
            rows={6}
            value={form.storyboard}
            onChange={(e) => set('storyboard', e.target.value)}
          />
        </Field>
        <Field label="Checklist template · one task per line" wide>
          <Textarea rows={5} value={form.tasks} onChange={(e) => set('tasks', e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
function StageEditor({ close }) {
  const { state, update, notify } = useWorkspace();
  function remove(id) {
    if (state.stages.length === 1) {
      notify('Keep at least one stage.');
      return;
    }
    update((s) => {
      s.stages = s.stages.filter((x) => x.id !== id);
      s.items.filter((p) => p.stageId === id).forEach((p) => (p.stageId = s.stages[0].id));
    });
  }
  return (
    <Modal
      title="Your workflow, your way."
      onClose={close}
      footer={
        <>
          <span className="tiny muted">Changes save automatically</span>
          <Button className="primary" onClick={close}>
            Done
          </Button>
        </>
      }
    >
      <p className="banner">
        Stage behavior controls production queues. Removing a stage moves its ideas to the first
        remaining stage.
      </p>
      {state.stages.map((s, i) => (
        <div className="stage-row" key={s.id}>
          <Input
            aria-label="Stage name"
            value={s.name}
            onChange={(e) => {
              const name = e.target.value;
              update((d) => (d.stages.find((x) => x.id === s.id).name = name));
            }}
          />
          <Select
            aria-label="Stage behavior"
            options={[
              ['prep', 'Needs prep'],
              ['ready', 'Ready'],
              ['posted', 'Posted'],
            ]}
            value={s.kind}
            onChange={(v) => update((d) => (d.stages.find((x) => x.id === s.id).kind = v))}
          />
          <Button
            className="icon-button"
            aria-label="Move stage up"
            disabled={i === 0}
            onClick={() => update((d) => reorder(d.stages, s.id, -1))}
          >
            <AppIcon icon={ArrowUp} />
          </Button>
          <Button
            className="icon-button"
            aria-label="Move stage down"
            disabled={i === state.stages.length - 1}
            onClick={() => update((d) => reorder(d.stages, s.id, 1))}
          >
            <AppIcon icon={ArrowDown} />
          </Button>
          <Button className="icon-button" aria-label="Remove stage" onClick={() => remove(s.id)}>
            <AppIcon icon={X} />
          </Button>
        </div>
      ))}
      <Button
        onClick={() => update((s) => s.stages.push({ id: uid(), name: 'New stage', kind: 'prep' }))}
      >
        <AppIcon icon={Plus} />
        Add stage
      </Button>
    </Modal>
  );
}
