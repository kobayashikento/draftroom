import type { Workspace, Item, AssistantMessage } from './types.ts';
import type {
  CreateIdeaAction,
  CreateTaskAction,
  ExistingTaskAction,
  ActionReceipt,
} from '../supabase/functions/_shared/types.ts';
import { createItem } from './model.ts';
import { validateReply } from '../supabase/functions/_shared/assistant-protocol.ts';

type PreparedChange =
  | (CreateIdeaAction & { id: string; item: Item })
  | ((CreateTaskAction | ExistingTaskAction) & { id: string });
export type AssistantTurn = { requestId: string; reply: string; changes: PreparedChange[] };

export function assistantMessages(state: Workspace): AssistantMessage[] {
  return Array.isArray(state.assistant?.messages) ? state.assistant.messages : [];
}
export function appendAssistantMessage(state: Workspace, message: AssistantMessage) {
  state.assistant ||= { messages: [] };
  state.assistant.messages = [
    ...assistantMessages(state).filter((entry) => entry.id !== message.id),
    message,
  ].slice(-60);
}

export function prepareAssistantTurn(
  state: Workspace,
  requestId: string,
  response: unknown,
): AssistantTurn {
  const { reply, actions } = validateReply(response);
  const changes: PreparedChange[] = actions.map((action, index) => {
    const id = `assistant-${requestId}-${index}`;
    if (action.type !== 'create_idea') return { ...action, id };
    const item = createItem(state, action);
    item.id = id;
    if (action.tasks.length)
      item.tasks = action.tasks.map((task, taskIndex) => ({
        ...task,
        id: `${id}-task-${taskIndex}`,
        done: false,
      }));
    return { ...action, id, item };
  });
  return { requestId, reply, changes };
}

// Runs inside the existing workspace updater against its latest draft. All-or-nothing, with stable IDs on replay.
export function applyAssistantTurn(state: Workspace, turn: AssistantTurn) {
  if (assistantMessages(state).some((message) => message.id === `${turn.requestId}-reply`)) return;
  const receipts: ActionReceipt[] = [];
  let failure = '';
  for (const change of turn.changes) {
    const item =
      change.type === 'create_idea'
        ? undefined
        : state.items.find((item) => item.id === change.itemId);
    if (change.type === 'create_idea') {
      if (change.seriesId && !state.series.some((series) => series.id === change.seriesId))
        failure = 'That series has changed.';
      if (!state.stages.some((stage) => stage.id === change.item.stageId))
        failure = 'Your stages have changed.';
    } else if (!item) failure = 'An idea in this plan is no longer available.';
    else if (change.type !== 'create_task' && !item.tasks.some((task) => task.id === change.taskId))
      failure = 'A task in this plan is no longer available.';
  }
  if (!failure)
    for (const change of turn.changes) {
      const item =
        change.type === 'create_idea'
          ? undefined
          : state.items.find((item) => item.id === change.itemId);
      if (change.type === 'create_idea') {
        if (!state.items.some((item) => item.id === change.id))
          state.items.push(structuredClone(change.item));
        receipts.push({ itemId: change.id, label: `Created idea: ${change.title}` });
      } else if (item) {
        if (change.type === 'create_task') {
          if (!item.tasks.some((task) => task.id === change.id))
            item.tasks.push({
              id: change.id,
              title: change.title,
              category: change.category,
              due: change.due,
              priority: change.priority,
              done: false,
            });
          receipts.push({ itemId: item.id, label: `Added task: ${change.title}` });
        } else {
          const task = item.tasks.find((task) => task.id === change.taskId)!;
          if (change.type === 'complete_task') task.done = true;
          else task.priority = 'High';
          receipts.push({
            itemId: item.id,
            label: `${change.type === 'complete_task' ? 'Completed' : 'Prioritized'}: ${task.title}`,
          });
        }
        item.updatedAt = new Date().toISOString();
      }
    }
  appendAssistantMessage(state, {
    id: `${turn.requestId}-reply`,
    role: 'assistant',
    text: failure
      ? `${failure} No changes were made. Please ask me again with the updated idea or task.`
      : turn.reply,
    receipts,
    createdAt: new Date().toISOString(),
  });
}
