
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
import { saveAs } from 'file-saver';

// Helper hook for sessionStorage
function useSessionStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.sessionStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.error(`Error reading ${key} from sessionStorage:`, error);
        setStoredValue(initialValue); // Fallback to initial value on error
      }
    }
  }, [key]); // Removed initialValue from deps as it's a fallback

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting ${key} in sessionStorage:`, error);
    }
  };
  return [storedValue, setValue] as const;
}


export default function MessageLogPage() {
  const [messages, setMessages] = useSessionStorage<TelegramMessage[]>('telematrix_webhook_messages', []);
  const { tokens } = useStoredTokens();
  const [replyingToMessage, setReplyingToMessage] = useState<TelegramMessage | null>(null);
  const { toast } = useToast();

  const handleNewMessage = useCallback((event: MessageEvent) => {
    try {
      if (event.origin !== window.location.origin) return; 
      if (event.data && event.data.type === 'NEW_TELEGRAM_MESSAGE') {
        const newMessage = event.data.payload as TelegramMessage;
        
        if (newMessage.sourceTokenId) {
          const sourceToken = tokens.find(t => t.id === newMessage.sourceTokenId);
          if (sourceToken && sourceToken.botInfo) {
            newMessage.botUsername = sourceToken.botInfo.username;
          }
        }

        setMessages(prevMessages => [newMessage, ...prevMessages].slice(0, 200)); 
        toast({ title: "New Message Received", description: `From: ${newMessage.from?.username || newMessage.from?.first_name || 'Unknown'} via ${newMessage.botUsername || 'Unknown Bot'}` });
      }
    } catch (error) {
      console.error("Error processing new message from BroadcastChannel/StorageEvent", error);
    }
  }, [setMessages, toast, tokens]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'telematrix_new_webhook_message' && event.newValue) {
        try {
          const newMessage = JSON.parse(event.newValue) as TelegramMessage;
          if (newMessage.sourceTokenId) {
            const sourceToken = tokens.find(t => t.id === newMessage.sourceTokenId);
            if (sourceToken && sourceToken.botInfo) {
              newMessage.botUsername = sourceToken.botInfo.username;
            }
          }
          setMessages(prevMessages => [newMessage, ...prevMessages].slice(0, 200));
           toast({ title: "New Message via Webhook", description: `From: ${newMessage.from?.username || newMessage.from?.first_name || 'Unknown'} via ${newMessage.botUsername || 'Unknown Bot'}` });
        } catch (e) { console.error("Error parsing message from storage", e); }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleNewMessage, setMessages, toast, tokens]);


  const handleReply = (message: TelegramMessage) => {
    setReplyingToMessage(message);
  };

  const handleCloseReplyModal = () => {
    setReplyingToMessage(null);
  };
  
  const handleDownloadFile = async (fileId: string, fileName: string = "downloaded_file", sourceTokenId?: string) => {
    if (!sourceTokenId) {
        toast({ title: "Error", description: "Source token ID missing for file download.", variant: "destructive"});
        return;
    }
    const token = tokens.find(t => t.id === sourceTokenId)?.token;
    if (!token) {
        toast({ title: "Error", description: "Bot token not found for file download.", variant: "destructive"});
        return;
    }

    toast({ title: "Downloading...", description: `Preparing ${fileName} for download.`});
    try {
        const result = await downloadFileAction(token, fileId);
        if (result.success && result.data) {
            const blob = new Blob([result.data.data], { type: result.data.mimeType || 'application/octet-stream' });
            saveAs(blob, result.data.fileName || fileName);
            toast({ title: "Download Complete", description: `${result.data.fileName || fileName} downloaded.`});
        } else {
            toast({ title: "Download Failed", description: result.error || "Could not download file.", variant: "destructive"});
        }
    } catch (error) {
        toast({ title: "Download Error", description: "An unexpected error occurred.", variant: "destructive"});
        console.error("File download error:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Message Log</h1>
        <p className="text-muted-foreground">
          Displays messages received via webhook from your Telegram bots. Data is stored in session storage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
          <CardDescription>Showing the last {messages.length} messages. Updates in real-time.</CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No messages received yet. Ensure your webhook is set up correctly.</p>
          ) : (
            <ScrollArea className="h-[600px] p-1">
              <div className="space-y-4">
                {messages.map((msg, index) => (
                  <MessageCard 
                    key={`${msg.message_id}-${msg.date}-${index}`} 
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
