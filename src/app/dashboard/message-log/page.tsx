
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { TelegramMessage, StoredToken } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCard } from '@/components/messages/MessageCard';
import { ReplyModal } from '@/components/messages/ReplyModal';
import { EditMessageModal } from '@/components/messages/EditMessageModal'; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { useStoredTokens } from '@/lib/localStorage';
import { downloadFileAction, deleteMessageAction } from './actions';
import { saveAs } from 'file-saver'; 
import { Loader2 } from 'lucide-react';


function useSessionStorageMessages(key: string, initialValue: TelegramMessage[]) {
  const [storedValue, setStoredValue] = useState<TelegramMessage[]>(initialValue);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.sessionStorage.getItem(key);
        if (item) {
          const parsedItems = JSON.parse(item);
          if (Array.isArray(parsedItems)) {
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
  const { tokens } = useStoredTokens(); 
  const [replyingToMessage, setReplyingToMessage] = useState<TelegramMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<TelegramMessage | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<TelegramMessage | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
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

  const handleEdit = (message: TelegramMessage) => {
    setEditingMessage(message);
  };

  const handleDeleteInitiate = (message: TelegramMessage) => {
    setDeletingMessage(message);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMessage || !deletingMessage.sourceTokenId) {
      toast({ title: "Error", description: "Cannot delete message: missing information.", variant: "destructive"});
      setIsDeleteConfirmOpen(false);
      setDeletingMessage(null);
      return;
    }
    const token = tokens.find(t => t.id === deletingMessage.sourceTokenId)?.token;
    if (!token) {
        toast({ title: "Token Error", description: "Bot token not found for deleting message.", variant: "destructive"});
        setIsDeleteConfirmOpen(false);
        setDeletingMessage(null);
        return;
    }
    
    const result = await deleteMessageAction(token, deletingMessage.chat.id, deletingMessage.message_id);
    if (result.success) {
      toast({ title: "Message Deleted", description: "The message has been successfully deleted."});
      setMessages(prev => prev.filter(m => m.message_id !== deletingMessage.message_id || m.chat.id !== deletingMessage.chat.id));
    } else {
      toast({ title: "Failed to Delete Message", description: result.error, variant: "destructive"});
    }
    setIsDeleteConfirmOpen(false);
    setDeletingMessage(null);
  };

  const handleMessageEdited = (editedMessageFull: TelegramMessage) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        (msg.message_id === editedMessageFull.message_id && msg.chat.id === editedMessageFull.chat.id) 
        ? { ...msg, ...enrichMessageWithBotInfo(editedMessageFull) } // enrich again as sourceTokenId might not be in editedMessageFull
        : msg
      )
    );
  };

  const handleCloseReplyModal = () => setReplyingToMessage(null);
  const handleCloseEditModal = () => setEditingMessage(null);

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
            saveAs(blob, result.data.fileName || defaultFileName); 
            toast({ title: "Download Complete", description: `${result.data.fileName || defaultFileName} downloaded.`});
        } else {
            toast({ title: "Download Failed", description: result.error || "Could not download file.", variant: "destructive"});
        }
    } catch (error) {
        toast({ title: "Download Error", description: "An unexpected error occurred.", variant: "destructive"});
        console.error("File download error:", error);
    }
  };
  
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
                {messages.map((msg, index) => ( 
                  <MessageCard
                    key={`${msg.message_id}-${msg.date}-${msg.chat.id}-${index}`}
                    message={msg}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onDelete={handleDeleteInitiate}
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

      {editingMessage && (
        <EditMessageModal
          message={editingMessage}
          allTokens={tokens}
          isOpen={!!editingMessage}
          onClose={handleCloseEditModal}
          onMessageEdited={handleMessageEdited}
        />
      )}

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the message from the Telegram chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingMessage(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
