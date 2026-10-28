'use client';

import { useEffect, useState } from 'react';
import type { AssistantHistoryNavigationProps } from './assistant.helpers.ts';

export default function useAssistantHistory({
  assistant,
  inputRef
}: AssistantHistoryNavigationProps) {
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => {
    if (assistant.historyRequest) setShowHistory(true);
  }, [assistant.historyRequest]);
  function returnToChat() {
    setShowHistory(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }
  function newChat() {
    if (assistant.newChat()) returnToChat();
  }
  function selectChat(id: string) {
    if (assistant.selectChat(id)) returnToChat();
  }
  return { showHistory, setShowHistory, returnToChat, newChat, selectChat };
}
