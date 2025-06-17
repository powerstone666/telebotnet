"use client";

import { useState, useEffect, useCallback } from 'react';
import { TokenForm } from '@/components/token/TokenForm';
import { TokenTable } from '@/components/token/TokenTable';
import { useStoredTokens } from '@/lib/localStorage';
import type { StoredToken } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getBotInfoAction, checkWebhookAction } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Search, RefreshCw } from 'lucide-react'; // Added RefreshCw
import { Button } from '@/components/ui/button'; // Added Button

export default function TokenManagementPage() {
  const { tokens, addToken, removeToken, updateToken, isLoading: isLoadingTokens } = useStoredTokens(); // Added removeToken
  const { toast } = useToast();
  const [isLoadingTokenMap, setIsLoadingTokenMap] = useState<Record<string, boolean>>({});
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60); // Default 60 seconds
  const [botSearchTerm, setBotSearchTerm] = useState("");
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);

  const handleTokenAdded = (newToken: StoredToken) => {
    addToken(newToken);
    // Optionally, refresh info for the newly added token immediately
    refreshSingleTokenInfo(newToken, true); 
  };

  const handleDeleteToken = (tokenId: string) => {
    const tokenToDelete = tokens.find(t => t.id === tokenId);
    if (tokenToDelete) {
      removeToken(tokenId);
      toast({
        title: 'Token Removed',
        description: `Token for bot "${tokenToDelete.botInfo?.username || 'Unknown'}" removed.`,
      });
    }
  };
  
  const refreshSingleTokenInfo = useCallback(async (tokenToRefresh: StoredToken, suppressToast = false) => {
    if (isLoadingTokenMap[tokenToRefresh.id]) return; // Prevent multiple refreshes for the same token
    setIsLoadingTokenMap(prev => ({ ...prev, [tokenToRefresh.id]: true }));
    
    try {
      const botInfoResult = await getBotInfoAction(tokenToRefresh.token);
      const webhookCheckResult = await checkWebhookAction(tokenToRefresh.token);

      let newBotInfo = tokenToRefresh.botInfo;
      if (botInfoResult.success && botInfoResult.data) {
        newBotInfo = botInfoResult.data;
      } else if (!suppressToast) {
        toast({ title: `Refresh Error (${newBotInfo?.username || 'token'})`, description: `Failed to fetch bot info: ${botInfoResult.error}`, variant: "destructive" });
      }

      let webhookStatus: StoredToken['webhookStatus'] = tokenToRefresh.webhookStatus;
      let isCurrentWebhook = tokenToRefresh.isCurrentWebhook;

      if (webhookCheckResult.success && webhookCheckResult.data) {
        webhookStatus = webhookCheckResult.data.webhookInfo ? 'set' : 'unset';
        isCurrentWebhook = webhookCheckResult.data.isCurrentWebhook;
      } else {
        webhookStatus = 'failed';
         if (!suppressToast) {
            toast({ title: `Refresh Error (${newBotInfo?.username || 'token'})`, description: `Failed to check webhook: ${webhookCheckResult.error}`, variant: "destructive" });
         }
      }
      
      updateToken(tokenToRefresh.id, { 
        botInfo: newBotInfo, 
        webhookStatus,
        isCurrentWebhook, // This is the new field
        lastActivity: new Date().toISOString() 
      });

      if (!suppressToast) {
        toast({ title: 'Token Refreshed', description: `Information for "${newBotInfo?.username || 'token'}" updated.` });
      }
    } catch (error) {
      if (!suppressToast) {
        toast({ title: `Refresh Error (${tokenToRefresh.botInfo?.username || 'token'})`, description: error instanceof Error ? error.message : 'Unknown error during refresh.', variant: "destructive" });
      }
    } finally {
      setIsLoadingTokenMap(prev => ({ ...prev, [tokenToRefresh.id]: false }));
    }
  }, [updateToken, toast, isLoadingTokenMap]);


  useEffect(() => {
    // Initial refresh for tokens with 'unknown' or undefined webhook status
    if (!isLoadingTokens && tokens.length > 0) {
        tokens.forEach(token => {
          if (token.webhookStatus === 'unknown' || typeof token.webhookStatus === 'undefined' || typeof token.isCurrentWebhook === 'undefined') { 
              refreshSingleTokenInfo(token, true); // Suppress toast for initial batch refresh
          }
        });
    }
  }, [isLoadingTokens, tokens, refreshSingleTokenInfo]);


  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (autoRefreshEnabled && tokens.length > 0 && refreshInterval >= 10) { // Minimum 10 seconds interval
      intervalId = setInterval(() => {
        console.log("Auto-refreshing tokens...");
        tokens.forEach(token => refreshSingleTokenInfo(token, true)); // Suppress toasts for auto-refresh
      }, refreshInterval * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefreshEnabled, tokens, refreshInterval, refreshSingleTokenInfo]);

  const filteredTokens = tokens.filter(token => {
    const searchTermLower = botSearchTerm.toLowerCase();
    return (
      token.id.toLowerCase().includes(searchTermLower) ||
      (token.botInfo?.username && token.botInfo.username.toLowerCase().includes(searchTermLower)) ||
      (token.token && token.token.toLowerCase().includes(searchTermLower))
    );
  });

  const handleManualRefreshAllTokens = async () => {
    if (isLoadingTokens || isManuallyRefreshing) return;
    setIsManuallyRefreshing(true);
    toast({ title: "Refreshing All Tokens...", description: "Fetching latest bot info and webhook status for all tokens." });
    
    // Option 1: Use a function from useStoredTokens if it handles individual refreshes and state updates
    // await refreshAllTokens(); // Assuming refreshAllTokens is implemented in useStoredTokens to do this

    // Option 2: Iterate and call refreshSingleTokenInfo if refreshAllTokens is not available or suitable
    // This provides more granular feedback via isLoadingTokenMap if desired.
    const refreshPromises = tokens.map(token => refreshSingleTokenInfo(token, true)); // true to suppress individual toasts
    await Promise.all(refreshPromises);

    setIsManuallyRefreshing(false);
    toast({ title: "All Tokens Refreshed", description: "Successfully updated information for all tokens." });
  };


  return (
    <div className="space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Token Management</h1>
        <p className="text-muted-foreground">
          Add, view, and manage your Telegram bot tokens. All tokens are stored locally in your browser.
        </p>
      </div>

      <TokenForm onTokenAdded={handleTokenAdded} existingTokens={tokens} />

      <Card>
        <CardHeader>
          <CardTitle>Your Bot Tokens</CardTitle>
          <CardDescription>View and manage your added bot tokens. Search by Bot Username, Token ID, or part of the token itself.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex-grow flex items-center gap-2 w-full sm:w-auto">
              <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <Input
                type="search"
                placeholder="Search bots (username, ID, token)..."
                value={botSearchTerm}
                onChange={(e) => setBotSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleManualRefreshAllTokens} disabled={isLoadingTokens || isManuallyRefreshing} title="Refresh All Tokens">
              {isManuallyRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="sr-only">Refresh All Tokens</span>
            </Button>
          </div>
          {isLoadingTokens ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading tokens...</p>
            </div>
          ) : filteredTokens.length === 0 ? (
             <p className="text-muted-foreground text-center py-4">
                {tokens.length > 0 ? "No bots match your search." : "No tokens added yet."}
             </p>
          ) : (
            <TokenTable
              tokens={filteredTokens} // Use filtered tokens
              onDeleteToken={handleDeleteToken}
              onRefreshInfo={refreshSingleTokenInfo}
              isLoadingTokenMap={isLoadingTokenMap}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto-Refresh Settings</CardTitle>
          <CardDescription>
            Periodically update bot information and webhook status in the background.
            The manual refresh button in the table header provides on-demand updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh-switch"
              checked={autoRefreshEnabled}
              onCheckedChange={setAutoRefreshEnabled}
              aria-label="Enable auto-refresh"
            />
            <Label htmlFor="auto-refresh-switch">Enable Background Auto-Refresh</Label>
          </div>
          {autoRefreshEnabled && (
            <div className="flex items-center space-x-2">
              <Label htmlFor="refresh-interval-input" className="whitespace-nowrap">Refresh every</Label>
              <Input
                id="refresh-interval-input"
                type="number"
                min="10" // Sensible minimum to avoid spamming API
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Math.max(10, parseInt(e.target.value, 10) || 60))}
                className="w-24"
                aria-label="Refresh interval in seconds"
              />
              <Label htmlFor="refresh-interval-input">seconds</Label>
            </div>
          )}
        </CardContent>
      </Card>
      
      {isLoadingTokens ? (
         <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading tokens...</p>
         </div>
      ) : (
        <TokenTable
          tokens={tokens}
          onDeleteToken={handleDeleteToken}
          onRefreshInfo={refreshSingleTokenInfo}
          isLoadingTokenMap={isLoadingTokenMap}
        />
      )}
    </div>
  );
}
