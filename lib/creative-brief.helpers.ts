import type { Item } from './types.ts';
import type { CreativeBrief } from '../supabase/functions/_shared/creative-brief.ts';

export function writeCreativeBrief(item: Item, brief: CreativeBrief, id: string): void {
  if (item.format !== brief.format)
    throw new Error('The creative brief must match this idea’s format.');
  item.hook = brief.hook;
  item.notes = [
    `Goal: ${brief.goal}`,
    brief.concept,
    `Length: ${brief.length}${brief.cadence ? ` · ${brief.cadence}` : ''}`,
    `Editing: ${brief.editing}`,
    `Why this idea: ${brief.rationale}`
  ].join('\n\n');
  item.storyboard = brief.steps.map((step, index) => ({
    id: `${id}-shot-${index}`,
    title: step.title,
    notes: `${step.timing}\n${step.direction}`,
    overlay: step.overlay,
    reference: step.reference,
    done: false
  }));
  for (const publication of item.publications) {
    if (
      publication.state === 'planned' &&
      !publication.linkedPost &&
      !publication.url &&
      !publication.postId
    )
      publication.caption = brief.caption;
  }
}
