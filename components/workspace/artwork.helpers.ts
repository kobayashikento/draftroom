export type CoverSubject = 'diary' | 'ritual' | 'collection' | 'moments';
export type CoverIllustrationProps = { subject: CoverSubject };
export type IdeaSketchProps = { variant?: number };
export type TaskProgressProps = { completed: number; total: number; label: string };

const subjects: CoverSubject[] = ['diary', 'ritual', 'collection', 'moments'];
const seriesSubjects: Record<string, CoverSubject> = {
  emi: 'diary',
  matcha: 'ritual',
  obsessed: 'collection',
  joys: 'moments'
};

export function coverSubject(seriesId: string, fallback: string): CoverSubject {
  if (Object.hasOwn(seriesSubjects, seriesId)) return seriesSubjects[seriesId];
  const hash = Array.from(seriesId || fallback).reduce(
    (value, letter) => value + letter.charCodeAt(0),
    0
  );
  return subjects[hash % subjects.length];
}
