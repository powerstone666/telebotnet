"use client";

import { useState } from 'react';
import { useStoredTokens } from '@/lib/localStorage';
import type { StoredToken, TelegramMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getUpdatesAction } from './actions';
import { Loader2 } from 'lucide-react';
import { MessageCard } from '@/components/messages/MessageCard'; // To be created

export default function GetUpdatesPage() {
  const { tokens, isLoading: isLoadingTokens } = useStoredTokens();
  const { toast } = useToast();
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [offsets, setOffsets] = useState<Record<string, number>>({}); // Store last update_id per token

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

  const handleFetchUpdates = async () => {
    if (selectedTokenIds.length === 0) {
      toast({ title: "No Tokens Selected", description: "Please select at least one token.", variant: "destructive" });
      return;
    }
    setIsFetching(true);
    setMessages([]); // Clear previous messages or append, for now clear
    const selectedTokens = getTokensByIds(selectedTokenIds);
    
    const newMessages: TelegramMessage[] = [];
    const newOffsets = { ...offsets };

    for (const token of selectedTokens) {
      const offset = newOffsets[token.id] ? newOffsets[token.id] + 1 : undefined;
      const result = await getUpdatesAction(token.token, offset);
      if (result.success && result.data) {
        result.data.forEach(update => {
          if (update.message) {
            newMessages.push({ 
              ...update.message, 
              sourceTokenId: token.id, 
              botUsername: token.botInfo?.username 
            });
          }
          // Handle other update types if needed
          if (update.update_id >= (newOffsets[token.id] || 0)) {
            newOffsets[token.id] = update.update_id;
          }
        });
        toast({ title: `Updates Fetched for ${token.botInfo?.username}`, description: `${result.data.length} updates received.` });
      } else {
        toast({ title: `Failed to Fetch Updates for ${token.botInfo?.username}`, description: result.error, variant: "destructive" });
      }
    }
    setMessages(prev => [...prev, ...newMessages].sort((a,b) => b.date - a.date)); // Add new and sort
    setOffsets(newOffsets);
    setIsFetching(false);
  };

  if (isLoadingTokens) {
     return <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading tokens...</p></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Get Updates</h1>
        <p className="text-muted-foreground">
          Manually fetch the latest updates for your selected bots.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Tokens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tokens.length === 0 ? (
            <p className="text-muted-foreground">No tokens available. Add tokens in Token Management.</p>
          ) : (
             <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all-tokens-updates"
                  checked={selectedTokenIds.length === tokens.length && tokens.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                />
                <Label htmlFor="select-all-tokens-updates" className="font-medium">Select All ({selectedTokenIds.length}/{tokens.length})</Label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-1 rounded-md border">
                {tokens.map(token => (
                  <div key={token.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 transition-colors">
                    <Checkbox
                      id={`token-update-${token.id}`}
                      checked={selectedTokenIds.includes(token.id)}
                      onCheckedChange={(checked) => handleSelectToken(token.id, Boolean(checked))}
                    />
                    <Label htmlFor={`token-update-${token.id}`} className="cursor-pointer flex-1 truncate">{token.botInfo?.username || token.id}</Label>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <Button onClick={handleFetchUpdates} disabled={isFetching || selectedTokenIds.length === 0} className="w-full sm:w-auto">
        {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Fetch Updates for Selected ({selectedTokenIds.length})
      </Button>

      {messages.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Fetched Messages</CardTitle>
            <CardDescription>Showing {messages.length} most recent messages from selected bots.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] p-1">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <MessageCard key={`${msg.message_id}-${index}`} message={msg} onReply={() => { /* TODO */ }} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
