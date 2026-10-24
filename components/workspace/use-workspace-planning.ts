'use client';

import { useState } from 'react';
import { monday } from '../../lib/model.ts';
import { today } from '../../lib/display.ts';
import type { WorkspacePlanning } from './workspace.helpers.ts';

export default function useWorkspacePlanning(): WorkspacePlanning {
  const [week, setWeek] = useState(() => monday(today()));
  const [platform, setPlatform] = useState('');
  return { week, setWeek, platform, setPlatform };
}
