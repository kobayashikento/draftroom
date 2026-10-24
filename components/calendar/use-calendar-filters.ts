'use client';

import { emptyCalendarFilters, calendarFilterState } from './calendar.helpers.ts';
import type { CalendarFilterController } from './calendar.helpers.ts';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CalendarFilters } from '../../lib/types.ts';

export default function useCalendarFilters(
  platform: string,
  setPlatform: Dispatch<SetStateAction<string>>
): CalendarFilterController {
  const [localFilters, setLocalFilters] = useState(emptyCalendarFilters);
  const values = { ...localFilters, platform };
  const { activeCount, hasFilters } = calendarFilterState(values);
  function setValue(key: keyof CalendarFilters, value: string) {
    if (key === 'platform') setPlatform(value);
    else setLocalFilters(current => ({ ...current, [key]: value }));
  }
  function reset() {
    setLocalFilters(emptyCalendarFilters);
    setPlatform('');
  }
  return {
    values,
    activeCount,
    hasFilters,
    setValue,
    reset
  };
}
