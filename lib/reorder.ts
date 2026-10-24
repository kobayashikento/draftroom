export function reorder<T extends { id: string }>(list: T[], id: string, delta: number) {
  const i = list.findIndex((x) => x.id === id),
    j = i + delta;
  if (i >= 0 && j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
}
