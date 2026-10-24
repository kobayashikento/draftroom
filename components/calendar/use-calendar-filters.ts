'use client';
import type { Dispatch, SetStateAction } from 'react';
import type { CalendarFilters } from '../../lib/types.ts';
import { useState } from 'react';

export type CalendarFilterController = ReturnType<typeof useCalendarFilters>;

const emptyFilters = { format: '', seriesId: '', status: '', query: '' };

export default function useCalendarFilters(
  platform: string,
  setPlatform: Dispatch<SetStateAction<string>>,
) {
  const [localFilters, setLocalFilters] = useState(emptyFilters);
  const values = { ...localFilters, platform };
  const activeCount = [values.format, values.seriesId, values.status].filter(Boolean).length;
  function setValue(key: keyof CalendarFilters, value: string) {
    if (key === 'platform') setPlatform(value);
    else setLocalFilters((current) => ({ ...current, [key]: value }));
  }
  function reset() {
    setLocalFilters(emptyFilters);
    setPlatform('');
  }
  return {
    values,
    activeCount,
    hasFilters: !!(activeCount || platform || values.query),
    setValue,
    reset,
  };
}
