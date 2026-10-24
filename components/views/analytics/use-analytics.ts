'use client';

import { useState } from 'react';
import { useMedia } from '../../media/media-context';
import { mediaForItem } from '../../media/media.helpers.ts';
import type { AnalyticsPeriod, AnalyticsProps } from './analytics.helpers.ts';
import { analyticsSummary } from './analytics.helpers.ts';

export default function useAnalytics({ item }: AnalyticsProps) {
  const library = useMedia();
  const [period, setPeriod] = useState<AnalyticsPeriod>('all');
  const [selected, setSelected] = useState('');
  const records = item ? mediaForItem(library.media, item) : library.media;
  const summary = analyticsSummary(records, period);
  const selectedRecord = library.media.find(record => record.id === selected);
  return { library, period, setPeriod, setSelected, summary, selectedRecord };
}
