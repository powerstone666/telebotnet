
"use client";

import { useState } from 'react';
import { useStoredTokens } from '@/lib/localStorage';
import type { StoredToken, TelegramMessage, TelegramUpdate, TelegramUser, TelegramChat } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getUpdatesAction } from './actions';
import { Loader2 } from 'lucide-react';
import { MessageCard } from '@/components/messages/MessageCard';

// Helper to update sessionStorage lists
const updateSessionList = <T extends { id: number | string }>(key: string, itemsToAdd: T[]) => {
  if (typeof window === 'undefined' || itemsToAdd.length === 0) return;
  try {
    const existingRaw = window.sessionStorage.getItem(key);
    const existingItems: T[] = existingRaw ? JSON.parse(existingRaw) : [];
    const itemMap = new Map(existingItems.map(item => [item.id, item]));
    itemsToAdd.forEach(item => itemMap.set(item.id, { ...itemMap.get(item.id), ...item })); // Add or update
    window.sessionStorage.setItem(key, JSON.stringify(Array.from(itemMap.values())));
  } catch (error) {
    console.error(`Error updating sessionStorage for ${key}:`, error);
  }
};

// Helper to post message to localStorage for cross-tab communication
const postMessageToLocalStorage = (message: TelegramMessage) => {
  if (typeof window === 'undefined') return;
  try {
    // This key is listened to by UsersPage, GroupsPage, MessageLogPage
    window.localStorage.setItem('telematrix_new_webhook_message', JSON.stringify(message));
    // Clear it shortly after to act like an event rather than persistent storage item
    // Note: Other tabs need to pick this up quickly. This is a simple simulation.
    setTimeout(() => window.localStorage.removeItem('telematrix_new_webhook_message'), 500);
  } catch (error) {
    console.error('Error posting message to localStorage:', error);
  }
};


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

  const processUpdateAndStore = (update: TelegramUpdate, token: StoredToken): TelegramMessage | null => {
    let message: TelegramMessage | null = null;
    if (update.message) message = update.message;
    else if (update.edited_message) message = update.edited_message;
    else if (update.channel_post) message = update.channel_post;
    else if (update.edited_channel_post) message = update.edited_channel_post;

    if (message) {
      const enrichedMessage: TelegramMessage = {
        ...message,
        sourceTokenId: token.id,
        botUsername: token.botInfo?.username,
      };

      // Update users in session storage
      if (enrichedMessage.from) {
        updateSessionList<TelegramUser>('telematrix_users', [enrichedMessage.from]);
      }
      // Update groups in session storage
      if (enrichedMessage.chat && enrichedMessage.chat.type !== 'private') {
        updateSessionList<TelegramChat>('telematrix_groups', [enrichedMessage.chat]);
      }
      // Update message log in session storage
      updateSessionList<TelegramMessage>('telematrix_webhook_messages', [enrichedMessage]);
      
      // Attempt to notify other tabs via localStorage event
      postMessageToLocalStorage(enrichedMessage);

      return enrichedMessage;
    }
    return null;
  };


  const handleFetchUpdates = async () => {
    if (selectedTokenIds.length === 0) {
      toast({ title: "No Tokens Selected", description: "Please select at least one token.", variant: "destructive" });
      return;
    }
    setIsFetching(true);
    // setMessages([]); // Option: Clear previous messages or append. Current behavior appends.
    
    const selectedTokens = getTokensByIds(selectedTokenIds);
    const newMessagesBatch: TelegramMessage[] = [];
    const newOffsets = { ...offsets };

    for (const token of selectedTokens) {
      const offset = newOffsets[token.id] ? newOffsets[token.id] + 1 : undefined;
      const result = await getUpdatesAction(token.token, offset);
      let updatesReceivedCount = 0;
      if (result.success && result.data) {
        updatesReceivedCount = result.data.length;
        result.data.forEach(update => {
          const processedMessage = processUpdateAndStore(update, token);
          if (processedMessage) {
            newMessagesBatch.push(processedMessage);
          }
          if (update.update_id >= (newOffsets[token.id] || 0)) {
            newOffsets[token.id] = update.update_id;
          }
        });
      } else {
        toast({ title: `Failed to Fetch Updates for ${token.botInfo?.username || token.id}`, description: result.error, variant: "destructive" });
      }
      if (updatesReceivedCount > 0) {
         toast({ title: `Updates Fetched for ${token.botInfo?.username || token.id}`, description: `${updatesReceivedCount} updates received.` });
      } else if (result.success) {
         toast({ title: `No New Updates for ${token.botInfo?.username || token.id}`, description: `No new updates since last fetch.` });
      }
    }
    // Add to existing messages and sort, then cap at 200 for display on this page.
    setMessages(prev => [...newMessagesBatch, ...prev].sort((a,b) => b.date - a.date).slice(0, 200));
    setOffsets(newOffsets);
    setIsFetching(false);
  };

  if (isLoadingTokens) {
     return <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading tokens...</p></div>;
  }
  
  // Dummy onReply for MessageCard on this page, actual reply is in MessageLogPage
  const handleDummyReply = () => {
    toast({ title: "Reply Action", description: "Please use the Message Log page to reply.", variant: "default"});
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Get Updates</h1>
        <p className="text-muted-foreground">
          Manually fetch the latest updates for your selected bots. Fetched data also populates Users, Groups, and Message Log pages.
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
            <CardTitle>Fetched Messages (Recent)</CardTitle>
            <CardDescription>Showing {messages.length} most recent messages from this fetch session.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] p-1">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <MessageCard key={`${msg.message_id}-${msg.date}-${index}`} message={msg} onReply={handleDummyReply} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
