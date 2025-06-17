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
  tokensProp: StoredToken[], 
  expiryDurationMs: number
) {
  const [isLoading, setIsLoading] = useState(true);
  const [storedValue, setStoredValue] = useState<TelegramMessage[]>(initialValue);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const tokensRef = useRef(tokensProp);
  useEffect(() => {
    tokensRef.current = tokensProp;
  }, [tokensProp]);

  // Helper function for enriching a single message, uses tokensRef for stability in callbacks
  const enrichSingleMessageWithRef = useCallback((msg: TelegramMessage): TelegramMessage => {
    if (msg.sourceTokenId && !msg.botUsername) {
      const token = tokensRef.current.find(t => t.id === msg.sourceTokenId);
      if (token?.botInfo) {
        return { ...msg, botUsername: token.botInfo.username };
      }
    }
    return msg;
  }, []); // Empty dependency array as tokensRef.current is stable within a render pass

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
          .map(storedItem => enrichSingleMessageWithRef(storedItem.data)); 
        
        const messageMap = new Map(validMessages.map(msg => [`${msg.chat.id}-${msg.message_id}-${msg.sourceTokenId || 'unknown'}`, msg]));
        const uniqueSortedMessages = Array.from(messageMap.values())
                                        .sort((a, b) => (b.date || 0) - (a.date || 0))
                                        .slice(0, 1000); 
        setStoredValue(uniqueSortedMessages);
      } else {
        setStoredValue(initialValue.map(enrichSingleMessageWithRef)); 
      }
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
      setStoredValue(initialValue.map(enrichSingleMessageWithRef)); 
    } finally {
      setIsLoading(false);
    }
  }, [key, expiryDurationMs, initialValue, enrichSingleMessageWithRef]);

  const updateReactStateAndPersist = useCallback((value: TelegramMessage[] | ((val: TelegramMessage[]) => TelegramMessage[])) => {
    if (typeof window === 'undefined') return;

    setStoredValue(currentStoredValue => {
      const newUnsortedMessages = typeof value === 'function' ? value(currentStoredValue) : value;
      const enrichedMessages = newUnsortedMessages.map(enrichSingleMessageWithRef);

      const messageMap = new Map(enrichedMessages.map(msg => {
        const chatId = msg.chat?.id || 'unknown_chat';
        const messageId = msg.message_id || `temp_${Date.now()}_${Math.random()}`;
        const sourceTokenId = msg.sourceTokenId || 'unknown_source';
        return [`${chatId}-${messageId}-${sourceTokenId}`, msg];
      }));
      
      const uniqueSortedMessages = Array.from(messageMap.values())
                                      .sort((a, b) => (b.date || 0) - (a.date || 0))
                                      .slice(0, 1000);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        try {
          const now = Date.now();
          const itemsToStore: StoredMessageItem[] = uniqueSortedMessages
            .map(msg => ({ data: msg, timestamp: now })); 
          window.localStorage.setItem(key, JSON.stringify(itemsToStore));
        } catch (error) {
          console.error(`Error debounced setting ${key} in localStorage:`, error);
        }
      }, 750);

      return uniqueSortedMessages;
    });
  }, [key, enrichSingleMessageWithRef]); 


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
          remainingItems = [];
        }
        window.localStorage.setItem(key, JSON.stringify(remainingItems));
      }
      
      const validAndEnrichedMessages = remainingItems
        .map(i => enrichSingleMessageWithRef(i.data))
        .sort((a, b) => (b.date || 0) - (a.date || 0));
      setStoredValue(validAndEnrichedMessages);

    } catch (error) {
      console.error(`Error clearing messages for key ${key}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [key, expiryDurationMs, enrichSingleMessageWithRef]); 

  return [storedValue, updateReactStateAndPersist, clearStoredMessages, isLoading] as const;
}
