'use client';

import { Clapperboard, Film, Play, Sparkles } from 'lucide-react';
import { AppIcon } from '../icons';

export default function LibraryEmpty() {
  return (
    <div className="media-empty">
      <div className="media-empty-art" aria-hidden="true">
        <span className="empty-film empty-film-one">
          <AppIcon icon={Clapperboard} size="lg" />
          <span>little moments</span>
        </span>
        <span className="empty-film empty-film-two">
          <AppIcon icon={Play} size="lg" />
          <span>made by you</span>
        </span>
        <span className="empty-film empty-film-three">
          <AppIcon icon={Film} size="lg" />
          <span>worth keeping</span>
        </span>
        <span className="empty-film-spark">
          <AppIcon icon={Sparkles} size="lg" />
        </span>
      </div>
      <p className="meta">A HOME FOR WHAT YOU’VE MADE</p>
      <h2>Your posts, all together.</h2>
      <p>
        Post to Instagram or TikTok from your phone, then sync your channel here.
        <br />
        Or paste a published post link to watch it and connect it to an idea.
      </p>
      <span className="media-empty-footnote">
        Synced posts bring their captions and available insights along.
      </span>
    </div>
  );
}
