'use client';

import type { CalendarFiltersProps } from './calendar.helpers.ts';
import { Search, SlidersHorizontal, Inbox } from 'lucide-react';
import { AppIcon } from '../icons';
import { Input, Button, Select } from '../ui';
import { useWorkspace } from '../workspace/workspace-context';

export default function CalendarFilters({
  filters,
  showFilters,
  setShowFilters,
  showUnscheduled,
  setShowUnscheduled,
  unscheduledCount
}: CalendarFiltersProps) {
  const { state } = useWorkspace();
  const { platform, query, format, seriesId, status } = filters.values;
  const filterCount = filters.activeCount;
  const setPlatform = (value: string) => filters.setValue('platform', value);
  const setQuery = (value: string) => filters.setValue('query', value);
  const setFormat = (value: string) => filters.setValue('format', value);
  const setSeriesId = (value: string) => filters.setValue('seriesId', value);
  const setStatus = (value: string) => filters.setValue('status', value);
  return (
    <>
      <div className="planner-filters">
        <Select
          aria-label="Calendar channel"
          options={[['', 'All channels'], 'Instagram', 'TikTok']}
          value={platform}
          onChange={setPlatform}
        />
        <div className="planner-search">
          <AppIcon icon={Search} />
          <Input
            type="search"
            aria-label="Search calendar"
            placeholder="Search ideas and tasks…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <Button
          className={`small ${showFilters || filterCount ? 'filter-active' : ''}`}
          aria-expanded={showFilters}
          aria-controls="calendar-filters"
          onClick={() => setShowFilters(!showFilters)}
        >
          <AppIcon icon={SlidersHorizontal} />
          Filters{filterCount > 0 && <span className="planner-count">{filterCount}</span>}
        </Button>
        <Button
          className={`small planner-inbox ${showUnscheduled ? 'filter-active' : ''}`}
          aria-expanded={showUnscheduled}
          aria-controls="unscheduled-plans"
          onClick={() => setShowUnscheduled(!showUnscheduled)}
        >
          <AppIcon icon={Inbox} />
          Unscheduled<span className="planner-count">{unscheduledCount}</span>
        </Button>
      </div>

      <div className="planner-extra-filters" id="calendar-filters" hidden={!showFilters}>
        <Select
          aria-label="Calendar format"
          options={[['', 'All formats'], 'Reel', 'Carousel']}
          value={format}
          onChange={setFormat}
        />
        <Select
          aria-label="Calendar series"
          options={[['', 'All series'], ...state.series.map(s => [s.id, s.name])]}
          value={seriesId}
          onChange={setSeriesId}
        />
        <Select
          aria-label="Publication status"
          options={[
            ['', 'All publication statuses'],
            ['planned', 'Planned'],
            ['manually_posted', 'Manually posted']
          ]}
          value={status}
          onChange={setStatus}
        />
        {(filterCount > 0 || query || platform) && (
          <Button className="link" onClick={filters.reset}>
            Clear filters
          </Button>
        )}
        <p className="w-full text-xs text-muted">
          Content filters apply to ideas. Your day tasks stay visible and can be searched by name.
        </p>
      </div>
    </>
  );
}
