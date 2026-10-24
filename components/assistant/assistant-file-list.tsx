'use client';

import { FileText, Image as ImageIcon, X } from 'lucide-react';
import { AppIcon } from '../icons';
import { Button } from '../ui';
import { planningFileSize } from './assistant.helpers.ts';
import type { AssistantFileListProps } from './assistant.helpers.ts';

export default function AssistantFileList({ files, onRemove, disabled }: AssistantFileListProps) {
  return (
    <ul className="assistant-files" role="list" aria-label="Planning files">
      {files.map((file, index) => (
        <li key={index} className="assistant-file">
          <AppIcon icon={file.mimeType === 'application/pdf' ? FileText : ImageIcon} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm" title={file.name}>
              {file.name}
            </span>
            <span className="block text-xs text-muted">{planningFileSize(file.size)}</span>
          </span>
          {onRemove && (
            <Button
              className="icon-button"
              aria-label={`Remove ${file.name}`}
              disabled={disabled}
              onClick={() => onRemove(index)}
            >
              <AppIcon icon={X} />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
