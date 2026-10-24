'use client';

import { Check, Film, Image, Images, Link2, Play, TriangleAlert } from 'lucide-react';
import { AppIcon, PlatformIcon } from '../icons';
import { Badge, Button } from '../ui';
import MediaDetail from '../media/media-detail';
import MediaArtwork from '../media/media-artwork';
import { calendarPostFormat } from './calendar-posts.helpers.ts';
import type { CalendarPostCardProps, CalendarPostCardsProps } from './calendar.helpers.ts';
import useCalendarPost from './use-calendar-post.ts';

export function CalendarPostCards({ posts, compact = false }: CalendarPostCardsProps) {
  return posts.map(post => <CalendarPostCard key={post.record.id} post={post} compact={compact} />);
}

export default function CalendarPostCard({ post, compact = false }: CalendarPostCardProps) {
  const { record, item } = post;
  const preview = useCalendarPost(post);
  const format = calendarPostFormat(record);
  return (
    <article
      className={`planner-card is-posted ${compact ? 'is-compact' : ''}`}
      data-synced-post={record.id}
    >
      <Button
        className="planner-card-open"
        aria-label={`View synced ${record.platform} post: ${record.title}`}
        onClick={preview.openPreview}
      >
        <div className="planner-card-channel">
          <PlatformIcon platform={record.platform} />
          <span>{record.platform}</span>
          <AppIcon icon={Check} />
        </div>
        <div className="planner-card-art">
          <MediaArtwork record={record} />
        </div>
        <div className="planner-card-copy">
          <h3>{record.title}</h3>
          <span className="planner-card-format">
            <AppIcon icon={format === 'Photo' ? Image : format === 'Carousel' ? Images : Film} />
            {format}
          </span>
          <Badge className="pill">Synced post</Badge>
          {post.issues.length > 0 && (
            <span className="publication-review" title={post.issues.join(' ')}>
              <AppIcon icon={TriangleAlert} />
              Check linked plan
              <span className="sr-only">{post.issues.join(' ')}</span>
            </span>
          )}
        </div>
      </Button>
      <footer>
        <span title={`Published ${post.date}`}>
          {new Date(record.published_at).toLocaleTimeString('en', {
            hour: 'numeric',
            minute: '2-digit'
          })}
        </span>
        {item && (
          <Button
            className="icon-button"
            aria-label={`Open linked idea: ${item.title}`}
            title="Open linked idea"
            onClick={preview.openIdea}
          >
            <AppIcon icon={Link2} />
          </Button>
        )}
        <Button
          className="icon-button"
          aria-label={`Preview ${record.platform} post: ${record.title}`}
          title="Preview post"
          onClick={preview.openPreview}
        >
          <AppIcon icon={record.media_type === 'video' ? Play : Image} />
        </Button>
      </footer>
      {preview.previewOpen && <MediaDetail record={record} close={preview.closePreview} />}
    </article>
  );
}
