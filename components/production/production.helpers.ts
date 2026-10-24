import type {
  Item,
  ProductionTask,
  ItemUpdater,
  Task,
  Workspace,
  ProductionQueue
} from '../../lib/types.ts';
import { addDays, kind, monday, productionQueue, uid } from '../../lib/model.ts';

export type ChecklistProps = { item: Item; tasks: ProductionTask[]; finished: boolean };

export type ProductionRange = 'All' | 'Today' | 'This week';
export type ProductionTab = 'active' | 'completed';
export type TaskDateRange = { start: string; end: string };
export type ProductionView = { queue: ProductionQueue; unfinishedReady: Item[] };
export type TaskFields = {
  title: string;
  category: string;
  done: boolean;
  due: string;
  priority?: 'High' | 'Normal';
};
export type TaskFieldSetter = <K extends keyof TaskFields>(
  id: string,
  key: K,
  value: TaskFields[K]
) => void;

export const productionRanges: ProductionRange[] = ['All', 'Today', 'This week'];
export const taskCategories = ['plan', 'film', 'photo', 'edit', 'caption', 'publish'];

export function isProductionTab(value: string): value is ProductionTab {
  return value === 'active' || value === 'completed';
}

export function productionDateRange(range: ProductionRange, currentDate: string): TaskDateRange {
  if (range === 'All') return { start: '', end: '' };
  if (range === 'Today') return { start: currentDate, end: currentDate };
  const start = monday(currentDate);
  return { start, end: addDays(start, 6) };
}

export function productionView(
  state: Workspace,
  range: ProductionRange,
  currentDate: string
): ProductionView {
  return {
    queue: productionQueue(state, productionDateRange(range, currentDate)),
    unfinishedReady: state.items.filter(
      item => kind(state, item) === 'ready' && item.tasks.some(task => !task.done)
    )
  };
}

export function completedTaskCount(item: Item): number {
  return item.tasks.filter(task => task.done).length;
}

export function setTaskField<K extends keyof TaskFields>(
  item: Item,
  id: string,
  key: K,
  value: TaskFields[K]
): void {
  const task = item.tasks.find(task => task.id === id);
  if (task) {
    const fields: TaskFields = task;
    fields[key] = value;
  }
}

export function taskFieldSetter(itemId: string, updateItem: ItemUpdater): TaskFieldSetter {
  return (id, key, value) => updateItem(itemId, draft => setTaskField(draft, id, key, value));
}

export function toggleTaskPriority(item: Item, id: string): void {
  const task = item.tasks.find(task => task.id === id);
  if (task) task.priority = task.priority === 'High' ? 'Normal' : 'High';
}

export function toggleProjectPriority(item: Item): void {
  item.priority = item.priority === 'High' ? 'Normal' : 'High';
}

export function addTask(item: Item): void {
  const task: Task = {
    id: uid(),
    title: 'New task',
    category: 'plan',
    due: '',
    done: false,
    priority: 'Normal'
  };
  item.tasks.push(task);
}

export function removeTask(item: Item, id: string): void {
  item.tasks = item.tasks.filter(task => task.id !== id);
}
