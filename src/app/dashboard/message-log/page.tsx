"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TelegramMessage, TelegramUpdate, StoredToken } from '@/lib/types'; // Added TelegramUpdate
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCard } from '@/components/messages/MessageCard';
import { ReplyModal } from '@/components/messages/ReplyModal';
// import { EditMessageModal } from '@/components/messages/EditMessageModal'; // Edit button removed
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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Effect for initial load from sessionStorage
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // initialValue is stable, so key is the main dependency for re-running this if needed.

  // Function to update React state (this will be returned and used as setMessages)
  const updateReactStateAndPrepareForStorage = useCallback((value: TelegramMessage[] | ((val: TelegramMessage[]) => TelegramMessage[])) => {
    try {
      const valueToStoreCallback = typeof value === 'function' ? value : () => value;
      setStoredValue(currentStoredValue => {
        const newUnsortedMessages = valueToStoreCallback(currentStoredValue);
        // Ensure message_id and chat.id exist before creating map keys
        const validMessages = newUnsortedMessages.filter(msg => msg && typeof msg.message_id !== 'undefined' && msg.chat && typeof msg.chat.id !== 'undefined');
        const messageMap = new Map(validMessages.map(msg => [`${msg.chat.id}-${msg.message_id}`, msg]));
        
        const uniqueSortedMessages = Array.from(messageMap.values())
                                        .sort((a, b) => b.date - a.date)
                                        .slice(0, 200); // Keep only the latest 200 messages
        return uniqueSortedMessages;
      });
    } catch (error) {
      console.error(`Error updating React state for ${key}:`, error);
    }
  }, [key]);

  // Effect for debounced writing to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        // console.log(`Debounced: Writing ${storedValue.length} messages to sessionStorage for key ${key}`);
        window.sessionStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.error(`Error debounced setting ${key} in sessionStorage:`, error);
      }
    }, 500); // 500ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [key, storedValue]); // Re-run when storedValue or key changes

  return [storedValue, updateReactStateAndPrepareForStorage] as const;
}


export default function MessageLogPage() {
  const [messages, setMessages] = useSessionStorageMessages('telematrix_webhook_messages', []);
  const { tokens } = useStoredTokens(); 
  const [replyingToMessage, setReplyingToMessage] = useState<TelegramMessage | null>(null);
  // const [editingMessage, setEditingMessage] = useState<TelegramMessage | null>(null); // Edit button removed
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
    if (!newMessage || typeof newMessage.message_id === 'undefined' || !newMessage.chat || typeof newMessage.chat.id === 'undefined') {
      console.warn("SSE: Received incomplete message, skipping:", newMessage);
      return;
    }
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

    const clientId = `client-${Math.random().toString(36).substring(2, 15)}`;
    const eventSource = new EventSource(`/api/sse?clientId=${clientId}`);

    eventSource.onopen = () => {
      console.log(`SSE Connection opened with client ID: ${clientId}`);
    };

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        
        if (eventData.type === 'NEW_MESSAGE' || eventData.type === 'GENERIC_UPDATE') {
          const { update: fullUpdate, tokenId } = eventData.payload;
          
          let messageFromUpdate: TelegramMessage | undefined = undefined;

          if (fullUpdate.message) {
            messageFromUpdate = fullUpdate.message;
          } else if (fullUpdate.edited_message) {
            messageFromUpdate = fullUpdate.edited_message;
          } else if (fullUpdate.channel_post) {
            messageFromUpdate = fullUpdate.channel_post;
          } else if (fullUpdate.edited_channel_post) {
            messageFromUpdate = fullUpdate.edited_channel_post;
          }
          // Add other update types like callback_query if they contain messages to log

          if (messageFromUpdate && typeof messageFromUpdate.message_id !== 'undefined' && messageFromUpdate.chat && typeof messageFromUpdate.chat.id !== 'undefined') {
            // The webhook should have already set sourceTokenId, userId, chatId, isGroupMessage
            // If sourceTokenId is somehow missing on the message but present in payload, add it.
            if (!messageFromUpdate.sourceTokenId && tokenId) {
                messageFromUpdate.sourceTokenId = tokenId;
            }
            addNewMessage(messageFromUpdate as TelegramMessage);
          } else {
            console.warn(`SSE: Received ${eventData.type} with no processable message in update, skipping:`, fullUpdate);
          }
        } else if (eventData.type === 'HEARTBEAT') {
          // console.log('SSE: Received HEARTBEAT');
        } else {
          // console.log('SSE: Received other event data', eventData);
        }
      } catch (e) {
        console.error("SSE: Error parsing message from event data", e, event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE: EventSource failed:', error);
    };

    return () => {
      console.log(`SSE Connection closing for client ID: ${clientId}`);
      eventSource.close();
    };
  }, [hasMounted, addNewMessage]);

  const handleReply = (message: TelegramMessage) => {
    setReplyingToMessage(message);
  };

  // const handleEdit = (message: TelegramMessage) => { // Edit button removed
  //   setEditingMessage(message);
  // };

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

  // const handleMessageEdited = (editedMessageFull: TelegramMessage) => { // Edit button removed
  //   setMessages(prevMessages => 
  //     prevMessages.map(msg => 
  //       (msg.message_id === editedMessageFull.message_id && msg.chat.id === editedMessageFull.chat.id) 
  //       ? { ...msg, ...enrichMessageWithBotInfo(editedMessageFull) } 
  //       : msg
  //     )
  //   );
  // };

  const handleCloseReplyModal = () => setReplyingToMessage(null);
  // const handleCloseEditModal = () => setEditingMessage(null); // Edit button removed

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
            <div className="flex flex-col items-center justify-center h-[600px]"> {/* Changed h-32 to h-[600px] and added flex-col for centering text below spinner */}
              <Loader2 className="h-12 w-12 animate-spin text-primary" /> {/* Optionally increase spinner size */}
              <p className="mt-4 text-muted-foreground">Loading messages...</p> {/* Adjusted margin for better spacing */}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[600px]"> {/* Also apply to no messages state for consistency */}
              <p className="text-muted-foreground text-center py-10">No messages recorded yet. Use "Get Updates" or ensure your webhook is set up and bots are active.</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px] p-1">
              <div className="space-y-4">
                {messages.map((msg, index) => ( 
                  <MessageCard
                    key={`${msg.message_id}-${msg.date}-${msg.chat.id}-${index}`}
                    message={msg}
                    onReply={handleReply}
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

      {/* {editingMessage && ( // Edit button removed
        <EditMessageModal
          message={editingMessage}
          allTokens={tokens}
          isOpen={!!editingMessage}
          onClose={handleCloseEditModal}
          onMessageEdited={handleMessageEdited}
        />
      )} */}

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
