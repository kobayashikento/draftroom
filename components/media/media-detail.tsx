'use client';

import {
  Archive,
  ArrowUpRight,
  Bookmark,
  Eye,
  Heart,
  Link2,
  MessageCircle,
  Share2,
  Sparkles,
  Undo2,
  Users
} from 'lucide-react';
import { AppIcon, PlatformIcon } from '../icons';
import { Badge, Button, Field, Select } from '../ui';
import Modal from '../editors/modal';
import useMediaDetail from './use-media-detail.ts';
import type { MediaDetailProps } from './media.helpers.ts';
import { freshnessLabel, mediaDate } from './media.helpers.ts';
import MediaPlayer from './media-player';
import MetricTile from './metric-tile';

export default function MediaDetail({ record, close, readOnly = false }: MediaDetailProps) {
  const { library, state, error, idea, account, archive, linkIdea, openIdea } = useMediaDetail({
    record,
    close
  });
  return (
    <Modal
      title="A closer look."
      eyebrow={
        record.platform ? `${record.platform.toUpperCase()} · YOUR WORK` : 'YOUR PRIVATE CLIP'
      }
      onClose={close}
      footer={
        <>
          {!readOnly && (
            <Button className="link" disabled={Boolean(library.busy)} onClick={archive}>
              <AppIcon icon={record.archived_at ? Undo2 : Archive} />
              {record.archived_at ? 'Restore to library' : 'Archive'}
            </Button>
          )}
          <span className="tiny muted">
            {record.source === 'upload'
              ? 'Stored privately in your Draftroom'
              : freshnessLabel(record.metrics_updated_at)}
          </span>
          <Button onClick={close}>Done</Button>
        </>
      }
    >
      <div className="media-detail">
        <MediaPlayer record={record} />
        <div className="media-detail-copy">
          <div className="row gap-2">
            <Badge className="pill">
              {record.platform && <PlatformIcon platform={record.platform} />}
              {record.platform || 'Uploaded clip'}
            </Badge>
            <span className="text-xs text-muted">
              {record.published_at
                ? mediaDate(record.published_at)
                : `Added ${mediaDate(record.created_at)}`}
            </span>
          </div>
          <h2>{record.title}</h2>
          <div className="media-detail-metrics">
            <MetricTile icon={Eye} label="Views" value={record.metrics.views} />
            <MetricTile icon={Heart} label="Likes" value={record.metrics.likes} />
            <MetricTile icon={MessageCircle} label="Comments" value={record.metrics.comments} />
            <MetricTile icon={Share2} label="Shares" value={record.metrics.shares} />
            <MetricTile icon={Bookmark} label="Saves" value={record.metrics.saves} />
            <MetricTile icon={Users} label="Reach" value={record.metrics.reach} />
          </div>
          <p className="text-xs text-muted">
            {record.source === 'api'
              ? account?.metric_note || 'Lifetime platform totals. — means unavailable, not zero.'
              : record.source === 'link'
                ? 'Saved links can be previewed. Connect and sync the account to fetch measured post insights.'
                : 'This saved private clip has no measured social performance. Sync its published Instagram or TikTok post for insights.'}
          </p>
          <div className="media-ai-note">
            <AppIcon icon={Sparkles} />
            <p>
              {record.source === 'api'
                ? 'Draftroom can use this post’s caption and measured results to plan what comes next. It does not receive the video file.'
                : 'The assistant can use this post’s measured results after you connect and sync the account.'}
            </p>
          </div>
          {record.caption && (
            <div className="media-caption">
              <p className="meta">THE CAPTION</p>
              <p>{record.caption}</p>
            </div>
          )}
          {!readOnly && (
            <Field label="Connected idea">
              <Select
                aria-label="Link video to an idea"
                value={idea?.id || ''}
                disabled={Boolean(library.busy)}
                options={[
                  ['', 'No idea linked'],
                  ...state.items.map(item => [item.id, item.title])
                ]}
                onChange={linkIdea}
              />
            </Field>
          )}
          {idea && (
            <Button className="link" onClick={openIdea}>
              <AppIcon icon={Link2} />
              Open {idea.title}
              <AppIcon icon={ArrowUpRight} />
            </Button>
          )}
          {error && (
            <p className="warning" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
