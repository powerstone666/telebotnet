
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
import { Loader2 } from 'lucide-react';

export default function TokenManagementPage() {
  const { tokens, addToken, removeToken, updateToken, isLoading: isLoadingTokens } = useStoredTokens();
  const { toast } = useToast();
  const [isLoadingTokenMap, setIsLoadingTokenMap] = useState<Record<string, boolean>>({});
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60); // Default 60 seconds

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


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Token Management</h1>
        <p className="text-muted-foreground">
          Add, view, and manage your Telegram bot tokens. All tokens are stored locally in your browser.
        </p>
      </div>

      <TokenForm onTokenAdded={handleTokenAdded} existingTokens={tokens} />

      <Card>
        <CardHeader>
          <CardTitle>Auto-Refresh Settings</CardTitle>
          <CardDescription>Automatically refresh bot information and webhook status for all tokens.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh-switch"
              checked={autoRefreshEnabled}
              onCheckedChange={setAutoRefreshEnabled}
              aria-label="Enable auto-refresh"
            />
            <Label htmlFor="auto-refresh-switch">Enable Auto-Refresh</Label>
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
