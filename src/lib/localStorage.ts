"use client";

import type { StoredToken } from './types';
import { useState, useEffect, useCallback } from 'react';

const TOKENS_KEY = 'telematrix_tokens';

export function useStoredTokens() {
  const [tokens, setTokens] = useState<StoredToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    try {
      const item = window.localStorage.getItem(TOKENS_KEY);
      if (item) {
        setTokens(JSON.parse(item));
      }
    } catch (error) {
      console.error("Error reading tokens from localStorage", error);
      setTokens([]); // Fallback to empty array on error
    }
    setIsLoading(false);
  }, []);

  const updateStoredTokens = useCallback((newTokens: StoredToken[] | ((prevState: StoredToken[]) => StoredToken[])) => {
    try {
      const valueToStore = typeof newTokens === 'function' ? newTokens(tokens) : newTokens;
      setTokens(valueToStore);
      window.localStorage.setItem(TOKENS_KEY, JSON.stringify(valueToStore));
    } catch (error) {
      console.error("Error saving tokens to localStorage", error);
    }
  }, [tokens]);

  const addToken = useCallback((token: StoredToken) => {
    updateStoredTokens(prevTokens => {
      if (prevTokens.find(t => t.id === token.id || t.token === token.token)) {
        // Prevent duplicate tokens by id or token string
        return prevTokens;
      }
      return [...prevTokens, token];
    });
  }, [updateStoredTokens]);

  const removeToken = useCallback((tokenId: string) => {
    updateStoredTokens(prevTokens => prevTokens.filter(t => t.id !== tokenId));
  }, [updateStoredTokens]);

  const updateToken = useCallback((tokenId: string, updates: Partial<StoredToken>) => {
    updateStoredTokens(prevTokens => 
      prevTokens.map(t => t.id === tokenId ? { ...t, ...updates } : t)
    );
  }, [updateStoredTokens]);


  return { tokens, addToken, removeToken, updateToken, isLoading, setTokensDirectly: updateStoredTokens };
}
