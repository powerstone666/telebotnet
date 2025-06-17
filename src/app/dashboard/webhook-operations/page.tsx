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
import { Loader2, AlertTriangle, Info, Search } from 'lucide-react'; // Added Search icon

export default function WebhookOperationsPage() {
  const { tokens, isLoading: isLoadingTokens, updateToken } = useStoredTokens();
  const { toast } = useToast();
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [webhookBaseUrl, setWebhookBaseUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentBaseUrl = `${window.location.protocol}//${window.location.host}`;
      setWebhookBaseUrl(currentBaseUrl);
    }
    setHasMounted(true);
  }, []);

  const handleSelectToken = (tokenId: string, checked: boolean) => {
    setSelectedTokenIds(prev =>
      checked ? [...prev, tokenId] : prev.filter(id => id !== tokenId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTokenIds(checked ? filteredTokens.map(t => t.id) : []); // Use filteredTokens for select all
  };

  const getTokensByIds = (ids: string[]): StoredToken[] => {
    return tokens.filter(token => ids.includes(token.id));
  };

  const handleSetWebhooks = async () => {
    if (selectedTokenIds.length === 0) {
      toast({ title: "No Tokens Selected", description: "Please select at least one token.", variant: "destructive" });
      return;
    }
    if (!webhookBaseUrl.startsWith("https://")) {
        toast({ 
            title: "HTTPS Required", 
            description: "Your application must be served over HTTPS for webhooks to work. Please ensure your deployment uses HTTPS.", 
            variant: "destructive",
            duration: 7000 
        });
        return;
    }

    setIsProcessing(true);
    const selectedTokens = getTokensByIds(selectedTokenIds);
    const results = await Promise.all(
      selectedTokens.map(async (token) => {
        const individualWebhookUrl = `${webhookBaseUrl}/api/webhook/${token.id}`; // Use token.id for unique URL
        const result = await setWebhookAction(token.token, individualWebhookUrl);
        if (result.success) {
          updateToken(token.id, { webhookStatus: 'set', lastWebhookSetAttempt: new Date().toISOString(), isCurrentWebhook: true }); // Assume true if set to our unique URL
        } else {
          updateToken(token.id, { webhookStatus: 'failed', lastWebhookSetAttempt: new Date().toISOString() });
        }
        return { botName: token.botInfo?.username || token.id, ...result, setUrl: individualWebhookUrl };
      })
    );
    setIsProcessing(false);

    results.forEach(res => {
      if (res.success) {
        toast({ title: `Webhook Set for ${res.botName}`, description: `Successfully set webhook to ${res.setUrl}.` });
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

  // Filter tokens based on search term
  const filteredTokens = tokens.filter(token => {
    const botUsername = token.botInfo?.username?.toLowerCase() || '';
    const tokenId = token.id.toLowerCase();
    const search = searchTerm.toLowerCase();
    return botUsername.includes(search) || tokenId.includes(search);
  });


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
          Set or delete webhooks for your selected Telegram bots. Your application must be publicly accessible via HTTPS.
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
              <div className="flex items-center space-x-2 mb-4"> {/* Added mb-4 for spacing */}
                <div className="relative flex-grow">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search bots by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full" // Added padding for icon
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all-tokens"
                  checked={selectedTokenIds.length === filteredTokens.length && filteredTokens.length > 0} // Use filteredTokens
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  aria-label="Select all tokens"
                />
                <Label htmlFor="select-all-tokens" className="font-medium">
                  Select All ({selectedTokenIds.length}/{filteredTokens.length}) {/* Use filteredTokens */}
                </Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-1 rounded-md border">
                {filteredTokens.map(token => ( // Use filteredTokens
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
          <CardTitle>Webhook URL Configuration</CardTitle>
          <CardDescription className="space-y-1">
            <p>
              The webhook URL will be automatically constructed for each selected bot using the format:
              <code className="block bg-muted p-1 rounded my-1 text-sm">{webhookBaseUrl}/api/webhook/[BOT_ID]</code>
            </p>
            <p className="flex items-start">
              <Info className="h-4 w-4 mr-1.5 mt-0.5 text-blue-500 flex-shrink-0" />
              <span>Your application must be publicly accessible and served over HTTPS for Telegram webhooks to function correctly.</span>
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasMounted ? (
            <>
              <Input
                type="text"
                aria-label="Webhook Base URL"
                placeholder="Base URL will be auto-detected (e.g., https://your-app-domain.com)"
                value={webhookBaseUrl} // Display detected base URL
                readOnly // Make it read-only as it's auto-detected
                className="bg-muted/50"
              />
              {!webhookBaseUrl.startsWith('https://') && webhookBaseUrl.length > 0 && (
                 <p className="text-sm text-destructive mt-2 flex items-center"><AlertTriangle className="h-4 w-4 mr-1" /> Your application must be served over HTTPS for webhooks to work. Telegram requires HTTPS for webhook URLs.</p>
              )}
               <p className="text-xs text-muted-foreground mt-1">
                Example for a bot: <code className="bg-muted p-0.5 rounded">{webhookBaseUrl}/api/webhook/123456789</code>
              </p>
            </>
          ) : (
            <div className="space-y-2">
              <div className="h-10 bg-muted rounded-md animate-pulse w-full" />
              <div className="h-4 bg-muted rounded-md animate-pulse w-3/4" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={handleSetWebhooks} 
          disabled={!hasMounted || isProcessing || selectedTokenIds.length === 0 || !webhookBaseUrl} // Changed from !webhookUrl to !webhookBaseUrl
          className="flex-1"
        >
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set Webhook ({selectedTokenIds.length})
        </Button>
        <Button onClick={handleDeleteWebhooks} variant="destructive" disabled={!hasMounted || isProcessing || selectedTokenIds.length === 0} className="flex-1">
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Delete Webhook ({selectedTokenIds.length})
        </Button>
      </div>
    </div>
  );
}
