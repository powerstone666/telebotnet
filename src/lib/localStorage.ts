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

  const updateStoredTokens = useCallback((updater: (prevState: StoredToken[]) => StoredToken[]) => {
    try {
      setTokens(prevTokens => {
        const newTokens = updater(prevTokens);
        window.localStorage.setItem(TOKENS_KEY, JSON.stringify(newTokens));
        return newTokens;
      });
    } catch (error) {
      console.error("Error saving tokens to localStorage", error);
    }
  }, [setTokens]);

  const addToken = useCallback((tokenToAdd: StoredToken) => {
    updateStoredTokens(prevTokens => {
      if (prevTokens.find(t => t.id === tokenToAdd.id || t.token === tokenToAdd.token)) {
        // Prevent duplicate tokens by id or token string
        console.log("Token already exists, not adding:", tokenToAdd.id);
        return prevTokens;
      }
      console.log("Adding new token:", tokenToAdd.id);
      return [...prevTokens, tokenToAdd];
    });
  }, [updateStoredTokens]);

  const removeToken = useCallback((tokenIdToRemove: string) => {
    updateStoredTokens(prevTokens => prevTokens.filter(t => t.id !== tokenIdToRemove));
  }, [updateStoredTokens]);

  const updateToken = useCallback((tokenIdToUpdate: string, updates: Partial<StoredToken>) => {
    updateStoredTokens(prevTokens => 
      prevTokens.map(t => t.id === tokenIdToUpdate ? { ...t, ...updates } : t)
    );
  }, [updateStoredTokens]);

  const setTokensStateAndStorage = useCallback((newTokensOrUpdater: StoredToken[] | ((prevState: StoredToken[]) => StoredToken[])) => {
    setTokens(currentTokens => {
        const valueToStore = typeof newTokensOrUpdater === 'function' ? newTokensOrUpdater(currentTokens) : newTokensOrUpdater;
        try {
            window.localStorage.setItem(TOKENS_KEY, JSON.stringify(valueToStore));
        } catch (error) {
            console.error("Error saving tokens to localStorage (direct set)", error);
        }
        return valueToStore;
    });
}, [setTokens]);


  return { tokens, addToken, removeToken, updateToken, isLoading, setTokensDirectly: setTokensStateAndStorage };
}
