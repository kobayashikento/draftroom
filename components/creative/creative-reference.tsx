'use client';

import { ImageOff } from 'lucide-react';
import NextLink from 'next/link';
import { Link } from '@chakra-ui/react';
import { AppIcon } from '../icons';
import { useMedia } from '../media/media-context';
import { useMediaThumbnail } from '../media/use-media-display.ts';
import { creativeReferenceImage } from './creative-reference.helpers.ts';
import type { CreativeReferenceProps } from './creative-reference.helpers.ts';

export default function CreativeReference({ reference }: CreativeReferenceProps) {
  const { media } = useMedia();
  const image = creativeReferenceImage(reference, media);
  const thumbnail = useMediaThumbnail(image?.src || '');
  if (!image) return null;
  return (
    <div className="creative-reference">
      {image.src && !thumbnail.failed ? (
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={thumbnail.onError}
        />
      ) : (
        <div className="creative-reference-empty">
          <AppIcon icon={ImageOff} />
          <span>Preview unavailable</span>
        </div>
      )}
      {image.href ? (
        <Link asChild className="text-xs text-muted">
          <NextLink
            href={image.href}
            target={image.href.startsWith('https:') ? '_blank' : undefined}
            rel="noreferrer"
            prefetch={false}
          >
            {image.label}
          </NextLink>
        </Link>
      ) : (
        <span className="text-xs text-muted">{image.label}</span>
      )}
    </div>
  );
}
