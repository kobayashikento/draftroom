'use client';

import { Archive, Search } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button, Input, Select } from '../ui';
import type { MediaToolbarProps } from './media.helpers.ts';
import { isMediaScope, isMediaSort, mediaScopeOptions, mediaSortOptions } from './media.helpers.ts';

export default function LibraryToolbar({ filters, count, onChange }: MediaToolbarProps) {
  return (
    <div className="media-toolbar">
      <div className="media-library-tabs" role="group" aria-label="Library collection">
        <Button
          className={!filters.archived ? 'active' : ''}
          aria-pressed={!filters.archived}
          onClick={() => onChange('archived', false)}
        >
          Your library
        </Button>
        <Button
          className={filters.archived ? 'active' : ''}
          aria-pressed={filters.archived}
          onClick={() => onChange('archived', true)}
        >
          <AppIcon icon={Archive} />
          Archived
        </Button>
      </div>
      <div className="media-library-filters">
        <div className="planner-search">
          <AppIcon icon={Search} />
          <Input
            type="search"
            aria-label="Search your media"
            placeholder="Find a little moment…"
            value={filters.query}
            onChange={event => onChange('query', event.target.value)}
          />
        </div>
        <Select
          aria-label="Filter media channel"
          value={filters.scope}
          options={mediaScopeOptions}
          onChange={value => {
            if (isMediaScope(value)) onChange('scope', value);
          }}
        />
        <Select
          aria-label="Sort media"
          value={filters.sort}
          options={mediaSortOptions}
          onChange={value => {
            if (isMediaSort(value)) onChange('sort', value);
          }}
        />
      </div>
      <p className="media-results-label text-xs text-muted" role="status">
        {count} {count === 1 ? 'moment' : 'moments'}
        {filters.archived ? ' in the archive' : ' in view'}
      </p>
    </div>
  );
}
