// src/hooks/useLocalStorageMessagesWithExpiry.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { TelegramMessage, StoredToken } from '@/lib/types';

interface StoredMessageItem {
  data: TelegramMessage;
  timestamp: number;
}

export function useLocalStorageMessagesWithExpiry(
  key: string,
  initialValue: TelegramMessage[],
  tokens: StoredToken[],
  expiryDurationMs: number
) {
  const [isLoading, setIsLoading] = useState(true);
  const [storedValue, setStoredValue] = useState<TelegramMessage[]>(initialValue);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const enrichMessage = useCallback((msg: TelegramMessage): TelegramMessage => {
    if (msg.sourceTokenId && !msg.botUsername) {
      const token = tokens.find(t => t.id === msg.sourceTokenId);
      if (token?.botInfo) {
        return { ...msg, botUsername: token.botInfo.username };
      }
    }
    return msg;
  }, [tokens]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsedItems: StoredMessageItem[] = JSON.parse(item);
        const now = Date.now();
        const validMessages = parsedItems
          .filter(storedItem => (now - storedItem.timestamp) <= expiryDurationMs)
          .map(storedItem => enrichMessage(storedItem.data));
        
        // Deduplicate and sort
        const messageMap = new Map(validMessages.map(msg => [`${msg.chat.id}-${msg.message_id}-${msg.sourceTokenId || 'unknown'}`, msg]));
        const uniqueSortedMessages = Array.from(messageMap.values())
                                        .sort((a, b) => (b.date || 0) - (a.date || 0))
                                        .slice(0, 200); // Max 200
        setStoredValue(uniqueSortedMessages);
      } else {
        setStoredValue(initialValue.map(enrichMessage));
      }
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      setStoredValue(initialValue.map(enrichMessage));
    } finally {
      setIsLoading(false);
    }
  }, [key, expiryDurationMs, enrichMessage, initialValue]);

  const updateReactStateAndPersist = useCallback((value: TelegramMessage[] | ((val: TelegramMessage[]) => TelegramMessage[])) => {
    if (typeof window === 'undefined') return;

    setStoredValue(currentStoredValue => {
      const newUnsortedMessages = typeof value === 'function' ? value(currentStoredValue) : value;
      const enrichedMessages = newUnsortedMessages.map(enrichMessage);

      const messageMap = new Map(enrichedMessages.map(msg => {
        // Ensure key parts are present, provide defaults if necessary for map key
        const chatId = msg.chat?.id || 'unknown_chat';
        const messageId = msg.message_id || `temp_${Date.now()}_${Math.random()}`;
        const sourceTokenId = msg.sourceTokenId || 'unknown_source';
        return [`${chatId}-${messageId}-${sourceTokenId}`, msg];
      }));
      
      const uniqueSortedMessages = Array.from(messageMap.values())
                                      .sort((a, b) => (b.date || 0) - (a.date || 0))
                                      .slice(0, 200); // Keep only the latest 200

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        try {
          const now = Date.now();
          const itemsToStore: StoredMessageItem[] = uniqueSortedMessages
            .map(msg => ({ data: msg, timestamp: now })); // Update timestamp on save for all currently valid messages
          window.localStorage.setItem(key, JSON.stringify(itemsToStore));
        } catch (error) {
          console.error(`Error debounced setting ${key} in localStorage:`, error);
        }
      }, 750);

      return uniqueSortedMessages;
    });
  }, [key, enrichMessage]);


  const clearStoredMessages = useCallback(async (tokenIdsFilter?: string[]) => {
    if (typeof window === 'undefined') return;
    setIsLoading(true);
    try {
      const item = window.localStorage.getItem(key);
      let remainingItems: StoredMessageItem[] = [];
      if (item) {
        const parsedItems: StoredMessageItem[] = JSON.parse(item);
        const now = Date.now();
        const stillValidItems = parsedItems.filter(storedItem => (now - storedItem.timestamp) <= expiryDurationMs);

        if (tokenIdsFilter && tokenIdsFilter.length > 0) {
          remainingItems = stillValidItems.filter(storedItem => 
            !storedItem.data.sourceTokenId || !tokenIdsFilter.includes(storedItem.data.sourceTokenId)
          );
        } else {
          // No tokenIdsFilter means clear all (for this key)
          remainingItems = [];
        }
        window.localStorage.setItem(key, JSON.stringify(remainingItems));
      }
      // Update React state
      const validAndEnrichedMessages = remainingItems
        .map(i => enrichMessage(i.data))
        .sort((a, b) => (b.date || 0) - (a.date || 0));
      setStoredValue(validAndEnrichedMessages);

    } catch (error) {
      console.error(`Error clearing messages for key ${key}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [key, expiryDurationMs, enrichMessage]);

  return [storedValue, updateReactStateAndPersist, clearStoredMessages, isLoading] as const;
}
