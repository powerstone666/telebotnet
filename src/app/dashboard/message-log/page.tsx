
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { TelegramMessage, StoredToken } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCard } from '@/components/messages/MessageCard';
import { ReplyModal } from '@/components/messages/ReplyModal';
import { useToast } from '@/hooks/use-toast';
import { useStoredTokens } from '@/lib/localStorage';
import { downloadFileAction } from './actions';
import { saveAs } from 'file-saver'; // For client-side saving
import { Loader2 } from 'lucide-react';

// Helper hook for sessionStorage
function useSessionStorageMessages(key: string, initialValue: TelegramMessage[]) {
  const [storedValue, setStoredValue] = useState<TelegramMessage[]>(initialValue);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.sessionStorage.getItem(key);
        if (item) {
          const parsedItems = JSON.parse(item);
          if (Array.isArray(parsedItems)) {
            // Sort messages by date descending, new messages usually come first
            setStoredValue(parsedItems.sort((a, b) => b.date - a.date));
          } else {
             setStoredValue(initialValue);
          }
        } else {
          setStoredValue(initialValue);
        }
      } catch (error) {
        console.error(`Error reading ${key} from sessionStorage:`, error);
        setStoredValue(initialValue);
      }
    }
  }, [key, initialValue]);

  const setValue = (value: TelegramMessage[] | ((val: TelegramMessage[]) => TelegramMessage[])) => {
    try {
      const valueToStoreCallback = typeof value === 'function' ? value : () => value;
      setStoredValue(currentStoredValue => {
        const newUnsortedMessages = valueToStoreCallback(currentStoredValue);
        // Keep unique messages, sort, and cap at 200
        const messageMap = new Map(newUnsortedMessages.map(msg => [`${msg.chat.id}-${msg.message_id}`, msg]));
        const uniqueSortedMessages = Array.from(messageMap.values())
                                        .sort((a, b) => b.date - a.date)
                                        .slice(0, 200);
        
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(key, JSON.stringify(uniqueSortedMessages));
        }
        return uniqueSortedMessages;
      });
    } catch (error) {
      console.error(`Error setting ${key} in sessionStorage:`, error);
    }
  };
  return [storedValue, setValue] as const;
}


export default function MessageLogPage() {
  const [messages, setMessages] = useSessionStorageMessages('telematrix_webhook_messages', []);
  const { tokens } = useStoredTokens(); // For finding token for reply/download
  const [replyingToMessage, setReplyingToMessage] = useState<TelegramMessage | null>(null);
  const { toast } = useToast();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const enrichMessageWithBotInfo = useCallback((message: TelegramMessage): TelegramMessage => {
    if (message.sourceTokenId && !message.botUsername) {
      const sourceToken = tokens.find(t => t.id === message.sourceTokenId);
      if (sourceToken && sourceToken.botInfo) {
        return { ...message, botUsername: sourceToken.botInfo.username };
      }
    }
    return message;
  }, [tokens]);

  const addNewMessage = useCallback((newMessage: TelegramMessage) => {
    const enrichedNewMessage = enrichMessageWithBotInfo(newMessage);
    setMessages(prevMessages => {
      // Add to start, then let setValue in hook handle sorting, uniqueness and capping
      return [enrichedNewMessage, ...prevMessages]; 
    });
    toast({ 
      title: "New Message Received", 
      description: `From: ${enrichedNewMessage.from?.username || enrichedNewMessage.from?.first_name || 'Unknown'} via ${enrichedNewMessage.botUsername || 'Bot'}` 
    });
  }, [setMessages, toast, enrichMessageWithBotInfo]);


  useEffect(() => {
    if (!hasMounted) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'telematrix_new_webhook_message' && event.newValue) {
        try {
          const newMessage = JSON.parse(event.newValue) as TelegramMessage;
          addNewMessage(newMessage);
        } catch (e) { 
          console.error("Error parsing message from localStorage event", e); 
        }
      } else if (event.key === 'telematrix_webhook_messages' && event.newValue) {
        // If the whole list is updated by another tab (e.g. by Get Updates)
        try {
          const newMessagesArray = JSON.parse(event.newValue) as TelegramMessage[];
          if (Array.isArray(newMessagesArray)) {
             setMessages(newMessagesArray.map(enrichMessageWithBotInfo));
          }
        } catch(e) {
          console.error("Error parsing full message list from storage event", e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [hasMounted, addNewMessage, setMessages, enrichMessageWithBotInfo]);


  const handleReply = (message: TelegramMessage) => {
    setReplyingToMessage(message);
  };

  const handleCloseReplyModal = () => {
    setReplyingToMessage(null);
  };

  const handleDownloadFile = async (fileId: string, fileNameFromMessage?: string, sourceTokenId?: string) => {
    if (!sourceTokenId) {
        toast({ title: "Error", description: "Source token ID missing for file download.", variant: "destructive"});
        return;
    }
    const token = tokens.find(t => t.id === sourceTokenId)?.token;
    if (!token) {
        toast({ title: "Error", description: "Bot token not found for file download.", variant: "destructive"});
        return;
    }

    const defaultFileName = fileNameFromMessage || "downloaded_file";
    toast({ title: "Downloading...", description: `Preparing ${defaultFileName} for download.`});
    try {
        const result = await downloadFileAction(token, fileId);
        if (result.success && result.data) {
            const blob = new Blob([result.data.data], { type: result.data.mimeType || 'application/octet-stream' });
            saveAs(blob, result.data.fileName || defaultFileName); // Use file-saver
            toast({ title: "Download Complete", description: `${result.data.fileName || defaultFileName} downloaded.`});
        } else {
            toast({ title: "Download Failed", description: result.error || "Could not download file.", variant: "destructive"});
        }
    } catch (error) {
        toast({ title: "Download Error", description: "An unexpected error occurred.", variant: "destructive"});
        console.error("File download error:", error);
    }
  };
  
  // Enrich messages on initial load or when tokens change
  useEffect(() => {
    if (hasMounted && tokens.length > 0) {
      setMessages(currentMessages => currentMessages.map(enrichMessageWithBotInfo));
    }
  }, [hasMounted, tokens, setMessages, enrichMessageWithBotInfo]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Message Log</h1>
        <p className="text-muted-foreground">
          Displays messages received from your Telegram bots. Data is stored in session storage and updated via "Get Updates" or webhook events.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
          {hasMounted && <CardDescription>Showing the last {messages.length} messages. Updates in real-time based on session activity.</CardDescription>}
        </CardHeader>
        <CardContent>
          {!hasMounted ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No messages recorded yet. Use "Get Updates" or ensure your webhook is set up and bots are active.</p>
          ) : (
            <ScrollArea className="h-[600px] p-1">
              <div className="space-y-4">
                {messages.map((msg, index) => ( // Added index to key for potential date collisions if precision is low
                  <MessageCard
                    key={`${msg.message_id}-${msg.date}-${msg.chat.id}-${index}`}
                    message={msg}
                    onReply={handleReply}
                    onDownloadFile={handleDownloadFile}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {replyingToMessage && (
        <ReplyModal
          message={replyingToMessage}
          allTokens={tokens}
          isOpen={!!replyingToMessage}
          onClose={handleCloseReplyModal}
        />
      )}
    </div>
  );
}
