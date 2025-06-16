"use client";

import { useState, useEffect } from 'react';
import { useStoredTokens } from '@/lib/localStorage';
import type { StoredToken } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { setWebhookAction, deleteWebhookAction } from './actions';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function WebhookOperationsPage() {
  const { tokens, isLoading: isLoadingTokens, updateToken } = useStoredTokens();
  const { toast } = useToast();
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [webhookBaseUrl, setWebhookBaseUrl] = useState('');

  useEffect(() => {
    // Attempt to get the app's base URL for the webhook
    if (typeof window !== 'undefined') {
      const currentBaseUrl = `${window.location.protocol}//${window.location.host}`;
      setWebhookBaseUrl(currentBaseUrl);
      setWebhookUrl(`${currentBaseUrl}/api/webhook`);
    }
  }, []);

  const handleSelectToken = (tokenId: string, checked: boolean) => {
    setSelectedTokenIds(prev =>
      checked ? [...prev, tokenId] : prev.filter(id => id !== tokenId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTokenIds(checked ? tokens.map(t => t.id) : []);
  };

  const getTokensByIds = (ids: string[]): StoredToken[] => {
    return tokens.filter(token => ids.includes(token.id));
  };

  const handleSetWebhooks = async () => {
    if (selectedTokenIds.length === 0) {
      toast({ title: "No Tokens Selected", description: "Please select at least one token.", variant: "destructive" });
      return;
    }
    if (!webhookUrl.startsWith('https://')) {
      toast({ title: "Invalid Webhook URL", description: "Webhook URL must start with https://.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const selectedTokens = getTokensByIds(selectedTokenIds);
    const results = await Promise.all(
      selectedTokens.map(async (token) => {
        const result = await setWebhookAction(token.token, webhookUrl);
        if (result.success) {
          updateToken(token.id, { webhookStatus: 'set', lastWebhookSetAttempt: new Date().toISOString(), isCurrentWebhook: webhookUrl === `${webhookBaseUrl}/api/webhook` });
        } else {
          updateToken(token.id, { webhookStatus: 'failed', lastWebhookSetAttempt: new Date().toISOString() });
        }
        return { botName: token.botInfo?.username || token.id, ...result };
      })
    );
    setIsProcessing(false);

    results.forEach(res => {
      if (res.success) {
        toast({ title: `Webhook Set for ${res.botName}`, description: `Successfully set webhook to ${webhookUrl}.` });
      } else {
        toast({ title: `Failed to Set Webhook for ${res.botName}`, description: res.error, variant: "destructive" });
      }
    });
  };

  const handleDeleteWebhooks = async () => {
    if (selectedTokenIds.length === 0) {
      toast({ title: "No Tokens Selected", description: "Please select at least one token.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    const selectedTokens = getTokensByIds(selectedTokenIds);
    const results = await Promise.all(
      selectedTokens.map(async (token) => {
        const result = await deleteWebhookAction(token.token);
         if (result.success) {
          updateToken(token.id, { webhookStatus: 'unset', lastWebhookSetAttempt: new Date().toISOString(), isCurrentWebhook: false });
        } else {
          // Webhook might already be unset, or it could be a real failure.
          // For simplicity, mark as failed if error, or unset if Telegram says it's already not set (e.g. specific error message)
          // This part might need more nuanced error handling based on Telegram's actual responses.
          updateToken(token.id, { webhookStatus: 'failed', lastWebhookSetAttempt: new Date().toISOString() });
        }
        return { botName: token.botInfo?.username || token.id, ...result };
      })
    );
    setIsProcessing(false);

    results.forEach(res => {
      if (res.success) {
        toast({ title: `Webhook Deleted for ${res.botName}`, description: `Successfully deleted webhook.` });
      } else {
        toast({ title: `Failed to Delete Webhook for ${res.botName}`, description: res.error, variant: "destructive" });
      }
    });
  };


  if (isLoadingTokens) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading tokens...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Webhook Operations</h1>
        <p className="text-muted-foreground">
          Set or delete webhooks for your selected Telegram bots.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Tokens</CardTitle>
          <CardDescription>Choose the bots you want to manage webhooks for.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tokens.length === 0 ? (
            <p className="text-muted-foreground">No tokens available. Please add tokens in Token Management.</p>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all-tokens"
                  checked={selectedTokenIds.length === tokens.length && tokens.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  aria-label="Select all tokens"
                />
                <Label htmlFor="select-all-tokens" className="font-medium">
                  Select All ({selectedTokenIds.length}/{tokens.length})
                </Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-1 rounded-md border">
                {tokens.map(token => (
                  <div key={token.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`token-${token.id}`}
                      checked={selectedTokenIds.includes(token.id)}
                      onCheckedChange={(checked) => handleSelectToken(token.id, Boolean(checked))}
                    />
                    <Label htmlFor={`token-${token.id}`} className="cursor-pointer flex-1 truncate">
                      {token.botInfo?.username || token.id}
                    </Label>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook URL</CardTitle>
          <CardDescription>
            Enter the URL for Telegram to send updates to. This is typically your application's <code>/api/webhook</code> endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="url"
            placeholder="https://your-app-domain.com/api/webhook"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            disabled={isProcessing}
          />
          {!webhookUrl.startsWith('https://') && webhookUrl.length > 0 && (
             <p className="text-sm text-destructive mt-2 flex items-center"><AlertTriangle className="h-4 w-4 mr-1" /> Webhook URL must use HTTPS.</p>
          )}
           <p className="text-xs text-muted-foreground mt-1">
            Your current app's webhook endpoint should be: <code>{webhookBaseUrl}/api/webhook</code>
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button onClick={handleSetWebhooks} disabled={isProcessing || selectedTokenIds.length === 0 || !webhookUrl} className="flex-1">
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set Webhook ({selectedTokenIds.length})
        </Button>
        <Button onClick={handleDeleteWebhooks} variant="destructive" disabled={isProcessing || selectedTokenIds.length === 0} className="flex-1">
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Delete Webhook ({selectedTokenIds.length})
        </Button>
      </div>
    </div>
  );
}
