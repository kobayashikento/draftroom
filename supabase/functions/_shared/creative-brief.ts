import type { Format, JsonSchema } from './types.ts';

export type CreativeStep = {
  title: string;
  timing: string;
  direction: string;
  overlay: string;
  reference: string;
};
export type CreativeBrief = {
  title: string;
  format: Format;
  goal: string;
  concept: string;
  cadence: string;
  length: string;
  hook: string;
  reference: string;
  steps: CreativeStep[];
  editing: string;
  caption: string;
  rationale: string;
};
export type CreativeReference = { id: string; title: string; src: string; alt: string };
export const CREATIVE_REFERENCES: CreativeReference[] = [
  {
    id: 'matcha-pour',
    title: 'Matcha pour',
    src: '/creative-references/matcha-pour.jpg',
    alt: 'Close-up of matcha pouring into iced milk beside a window'
  },
  {
    id: 'cat-moment',
    title: 'Candid cat moment',
    src: '/creative-references/cat-moment.jpg',
    alt: 'A fluffy cat with a surprised expression in window light'
  },
  {
    id: 'cozy-desk',
    title: 'Cozy gaming desk',
    src: '/creative-references/cozy-desk.jpg',
    alt: 'A home gaming desk with warm lamplight at dusk'
  },
  {
    id: 'little-joys',
    title: 'Little home comforts',
    src: '/creative-references/little-joys.jpg',
    alt: 'A book and ceramic cup on a throw beside an autumn window'
  }
];

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
function text(value: unknown, max: number, empty = false): string {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()))
    throw new Error('The creative brief needs complete, specific directions. Please try again.');
  return value.trim();
}
export function validateCreativeReference(value: unknown): string {
  const reference = text(value, 240, true);
  if (
    reference &&
    !CREATIVE_REFERENCES.some(image => image.id === reference) &&
    !/^media:[a-zA-Z0-9_-]{1,200}$/.test(reference)
  )
    throw new Error('Unknown creative reference.');
  return reference;
}
function validateStep(value: unknown): CreativeStep {
  if (!object(value)) throw new Error('Invalid creative step.');
  return {
    title: text(value.title, 240),
    timing: text(value.timing, 120),
    direction: text(value.direction, 1800),
    overlay: text(value.overlay, 1000, true),
    reference: validateCreativeReference(value.reference)
  };
}
export function validateCreativeBrief(value: unknown): CreativeBrief {
  if (
    !object(value) ||
    !['Reel', 'Carousel'].includes(String(value.format)) ||
    !Array.isArray(value.steps) ||
    value.steps.length < 3 ||
    value.steps.length > 12
  )
    throw new Error('A creative brief needs a format and 3–12 actionable shots or slides.');
  return {
    title: text(value.title, 240),
    format: value.format as Format,
    goal: text(value.goal, 300),
    concept: text(value.concept, 1200),
    cadence: text(value.cadence, 120, true),
    length: text(value.length, 120),
    hook: text(value.hook, 1000),
    reference: validateCreativeReference(value.reference),
    steps: value.steps.map(validateStep),
    editing: text(value.editing, 1800),
    caption: text(value.caption, 2000),
    rationale: text(value.rationale, 1200)
  };
}
export function validateCreativeBriefs(value: unknown): CreativeBrief[] {
  if (!Array.isArray(value) || value.length > 8) throw new Error('Invalid creative briefs.');
  return value.map(validateCreativeBrief);
}

const string: JsonSchema = { type: 'string' };
const reference: JsonSchema = {
  type: 'string',
  description:
    'A relevant inspiration ID from the supplied reference library, media:<exact library post ID>, or empty if none is relevant. Never invent an image URL.'
};
export const CREATIVE_BRIEF_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    title: string,
    format: { type: 'string', enum: ['Reel', 'Carousel'] },
    goal: string,
    concept: string,
    cadence: string,
    length: string,
    hook: string,
    reference,
    steps: {
      type: 'array',
      minItems: 3,
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          title: string,
          timing: string,
          direction: string,
          overlay: string,
          reference
        },
        required: ['title', 'timing', 'direction', 'overlay', 'reference'],
        additionalProperties: false
      }
    },
    editing: string,
    caption: string,
    rationale: string
  },
  required: [
    'title',
    'format',
    'goal',
    'concept',
    'cadence',
    'length',
    'hook',
    'reference',
    'steps',
    'editing',
    'caption',
    'rationale'
  ],
  additionalProperties: false
};
