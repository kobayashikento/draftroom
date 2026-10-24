'use client';

import { useState } from 'react';
import { changeIdeaFilter, emptyIdeaFilters } from './ideas.helpers.ts';
import type { IdeaFilters } from './ideas.helpers.ts';

export default function useIdeaFilters() {
  const [values, setValues] = useState(emptyIdeaFilters);
  function setValue(key: keyof IdeaFilters, value: string) {
    setValues(current => changeIdeaFilter(current, key, value));
  }
  return { values, setValue };
}
