'use client';

import { ArrowUpRight, Eye, Heart, MessageCircle, Share2, Sparkles } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button, Select } from '../ui';
import AccountConnections from '../media/account-connections';
import MediaCard from '../media/media-card';
import MediaDetail from '../media/media-detail';
import MetricTile from '../media/metric-tile';
import useAnalytics from './analytics/use-analytics.ts';
import type { AnalyticsProps } from './analytics/analytics.helpers.ts';
import { analyticsPeriods, isAnalyticsPeriod } from './analytics/analytics.helpers.ts';

export default function Analytics({ item }: AnalyticsProps) {
  const { library, period, setPeriod, setSelected, summary, selectedRecord } = useAnalytics({
    item
  });
  return (
    <section
      className="media-analytics"
      aria-label={item ? `Insights for ${item.title}` : 'Post performance'}
    >
      {!item && <AccountConnections compact />}
      <div className="analytics-period-head">
        <div>
          <p className="meta">A LITTLE PERSPECTIVE</p>
          <h2>{item ? 'How this idea is doing.' : 'Look back. Make something lovely next.'}</h2>
        </div>
        <Select
          aria-label="Analytics post date range"
          value={period}
          options={analyticsPeriods}
          onChange={value => {
            if (isAnalyticsPeriod(value)) setPeriod(value);
          }}
        />
      </div>
      <div className="analytics-metric-grid">
        <MetricTile icon={Eye} label="Recorded views" value={summary.totals.views} />
        <MetricTile icon={Heart} label="Likes" value={summary.totals.likes} />
        <MetricTile icon={MessageCircle} label="Comments" value={summary.totals.comments} />
        <MetricTile icon={Share2} label="Shares" value={summary.totals.shares} />
      </div>
      <p className="text-xs text-muted">
        {summary.posts
          ? `Lifetime totals for ${summary.posts} synced ${summary.posts === 1 ? 'post' : 'posts'} in this publication-date range. Views are available for ${summary.measuredViews}.`
          : 'No measured posts in this range yet. Connect a channel and sync your work to start.'}{' '}
        — means unavailable, not zero. Cross-platform views are not unique people.
      </p>
      {library.error && (
        <p className="warning" role="alert">
          {library.error}
        </p>
      )}
      <div className="analytics-planning-note">
        <span className="media-note-icon">
          <AppIcon icon={Sparkles} size="md" />
        </span>
        <div>
          <h3>Your next idea has a little more to go on.</h3>
          <p className="text-sm text-muted">
            {summary.posts
              ? 'Ask Draftroom what to make next. It can use saved post captions, performance and sync dates to help you plan.'
              : 'Once you sync, your assistant can use real post results alongside your ideas and checklists.'}
          </p>
        </div>
        <Button className="small" onClick={library.openLibrary}>
          Open library
          <AppIcon icon={ArrowUpRight} />
        </Button>
      </div>
      <div className="section-head">
        <h2>
          {summary.leaders.length
            ? 'Most viewed in this collection'
            : 'Your results will have a home here.'}
        </h2>
        {summary.leaders.length > 0 && (
          <span className="text-xs text-muted">A snapshot, not a prediction</span>
        )}
      </div>
      {summary.leaders.length ? (
        <div className="media-grid analytics-post-grid">
          {summary.leaders.map(record => (
            <MediaCard
              key={record.id}
              record={record}
              onOpen={() => (item ? library.openLibrary() : setSelected(record.id))}
            />
          ))}
        </div>
      ) : (
        <div className="analytics-empty-results">
          <AppIcon icon={Eye} size="lg" />
          <h3>
            {item
              ? 'Connect this idea to a posted video.'
              : 'The story starts with your first sync.'}
          </h3>
          <p>
            {item
              ? 'Link a post from the library to this idea, or save its full URL in the Publish tab. Its measured results will appear here.'
              : 'Instagram and TikTok share different metrics. Draftroom keeps the source and sync date with every post, so you can see what the numbers actually mean.'}
          </p>
          <Button className="primary" onClick={library.openLibrary}>
            Explore your library
            <AppIcon icon={ArrowUpRight} />
          </Button>
        </div>
      )}
      {selectedRecord && <MediaDetail record={selectedRecord} close={() => setSelected('')} />}
    </section>
  );
}
