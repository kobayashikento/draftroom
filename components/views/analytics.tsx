'use client';

import {
  analyticsPlatforms,
  metricLabels,
  publicationRecordLabel
} from './analytics/analytics.helpers.ts';
import type { AnalyticsProps } from './analytics/analytics.helpers.ts';
import { Badge, Button } from '../ui';
import { PlatformIcon } from '../icons';
import { useWorkspace } from '../workspace/workspace-context';

export default function Analytics({ item }: AnalyticsProps) {
  const { state, open } = useWorkspace();
  return (
    <>
      <div className="banner">
        Your ideas and published links stay connected here. Platform analytics will appear only
        after an authorized integration is added.
      </div>
      <div className="analytics-grid">
        {analyticsPlatforms.map(platform => (
          <section className="panel analytics-card" key={platform}>
            <PlatformIcon platform={platform} size="lg" />
            <h2>{platform}</h2>
            <Badge className="pill">Not connected</Badge>
            <div className="no-metrics">
              {metricLabels.map(x => (
                <div key={x}>
                  <strong>—</strong>
                  <span className="tiny muted">{x}</span>
                </div>
              ))}
            </div>
            <p className="subtitle">No data available · Never synced</p>
            <p className="footnote">
              API connection is not available in this prototype. A manual link does not fetch
              metrics.
            </p>
          </section>
        ))}
      </div>
      {!item && (
        <>
          <div className="section-head">
            <h2>Your publication records</h2>
          </div>
          <div className="panel">
            {state.items.map(p => (
              <div key={p.id} className="list-item">
                <Button className="link grow" onClick={() => open(p.id, 'Publish')}>
                  {p.title}
                </Button>
                {p.publications.map(pub => (
                  <span key={pub.id} className="tiny">
                    {publicationRecordLabel(pub)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
