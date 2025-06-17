"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { TelegramMessage, TelegramUpdate } from '@/lib/types';
import { CardDescription } from '@/components/ui/card'; // Ensure all Card components are imported
// import { ScrollArea } from '@/components/ui/scroll-area'; // No longer using ScrollArea directly here
import { MessageCard } from '@/components/messages/MessageCard';
import { ReplyModal } from '@/components/messages/ReplyModal';
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
import { Loader2, Filter, Trash2, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocalStorageMessagesWithExpiry } from '@/hooks/useLocalStorageMessagesWithExpiry';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'; // Import react-window
import AutoSizer from 'react-virtualized-auto-sizer'; // Import AutoSizer
import { MessageCardSkeleton } from '@/components/messages/MessageCardSkeleton'; // Import the skeleton component

const MESSAGE_EXPIRY_DURATION_MS = 24 * 60 * 60 * 1000;
const initialMessagesForHook: TelegramMessage[] = []; // Ensure this line is present
const ESTIMATED_MESSAGE_HEIGHT = 200; // Ensure this line is present

export default function MessageLogPage() {
  const { tokens } = useStoredTokens();
  const [messages, setMessages, clearMessages, isLoadingMessages] = useLocalStorageMessagesWithExpiry(
    'telematrix_webhook_messages_v2',
    initialMessagesForHook, 
    tokens, 
    MESSAGE_EXPIRY_DURATION_MS
  );
  const [replyingToMessage, setReplyingToMessage] = useState<TelegramMessage | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<TelegramMessage | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false); // For clearing messages
  const { toast } = useToast();
  const [hasMounted, setHasMounted] = useState(false);
  const [filterTokenIds, setFilterTokenIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Ref to hold the latest tokens for use in callbacks without adding tokens to dependency arrays
  const tokensRef = useRef(tokens);
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Early return for loading state using skeletons
  if (!hasMounted || isLoadingMessages) {
    return (
      <div className="flex flex-col h-full p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
          {/* Placeholder for filter/search controls area */}
          <div className="h-10 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
        {/* Display multiple skeletons to represent a list loading */}
        <MessageCardSkeleton />
        <MessageCardSkeleton />
        <MessageCardSkeleton />
        <MessageCardSkeleton /> 
      </div>
    );
  }

  const addNewMessage = useCallback((newMessage: TelegramMessage) => {
    if (!newMessage || typeof newMessage.message_id === 'undefined' || !newMessage.chat || typeof newMessage.chat.id === 'undefined') {
      console.warn("SSE: Received incomplete message, skipping:", newMessage);
      return;
    }
    setMessages(prevMessages => {
      // The hook (useLocalStorageMessagesWithExpiry) should handle deduplication, sorting, and capping.
      // Prepend the new message.
      return [newMessage, ...prevMessages]; 
    });
    
    // Use tokensRef.current to avoid making addNewMessage dependent on the 'tokens' array reference
    const currentTokens = tokensRef.current;
    const botNameForToast = newMessage.botUsername || 
                          (newMessage.sourceTokenId ? currentTokens.find(t => t.id === newMessage.sourceTokenId)?.botInfo?.username : null) || 
                          'Bot';
    
    toast({ 
      title: "New Message Received", 
      description: `From: ${newMessage.from?.username || newMessage.from?.first_name || 'Unknown'} via ${botNameForToast}` 
    });
  }, [setMessages, toast]); // Removed 'tokens' from dependencies, using tokensRef

  useEffect(() => {
    if (!hasMounted || isLoadingMessages) return; 

    const clientId = `client-${Math.random().toString(36).substring(2, 15)}`;
    const eventSource = new EventSource(`/api/sse?clientId=${clientId}`);

    eventSource.onopen = () => {
      console.log(`SSE Connection opened with client ID: ${clientId}`);
    };

    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        
        if (eventData.type === 'NEW_MESSAGE' || eventData.type === 'GENERIC_UPDATE') {
          const fullUpdate = eventData.payload.update as TelegramUpdate;
          // const tokenId = eventData.payload.tokenId as string; // This is fullUpdate.sourceTokenId
          
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

          if (messageFromUpdate && typeof messageFromUpdate.message_id !== 'undefined' && messageFromUpdate.chat && typeof messageFromUpdate.chat.id !== 'undefined') {
            // Ensure context fields from TelegramUpdate are on the message object for addNewMessage
            const finalMessage: TelegramMessage = {
              ...messageFromUpdate,
              sourceTokenId: messageFromUpdate.sourceTokenId || fullUpdate.sourceTokenId,
              botUsername: messageFromUpdate.botUsername || fullUpdate.botUsername,
              userId: messageFromUpdate.userId || fullUpdate.userId || messageFromUpdate.from?.id,
              chatId: messageFromUpdate.chatId || fullUpdate.chatId || messageFromUpdate.chat.id,
              isGroupMessage: typeof messageFromUpdate.isGroupMessage === 'boolean' ? messageFromUpdate.isGroupMessage : 
                              typeof fullUpdate.isGroupMessage === 'boolean' ? fullUpdate.isGroupMessage :
                              (messageFromUpdate.chat.type === 'group' || messageFromUpdate.chat.type === 'supergroup'),
            };
            addNewMessage(finalMessage);
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
  }, [hasMounted, addNewMessage, isLoadingMessages]); // Added isLoadingMessages to dependencies

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
    if (!deletingMessage || !deletingMessage.sourceTokenId || !deletingMessage.chat?.id || !deletingMessage.message_id) {
      toast({ title: "Error", description: "Cannot delete message: missing information.", variant: "destructive" });
      setIsDeleteConfirmOpen(false);
      setDeletingMessage(null);
      return;
    }
    const token = tokens.find(t => t.id === deletingMessage.sourceTokenId)?.token;
    if (!token) {
      toast({ title: "Token Error", description: "Bot token not found for deleting message.", variant: "destructive" });
      setIsDeleteConfirmOpen(false);
      setDeletingMessage(null);
      return;
    }

    const result = await deleteMessageAction(token, deletingMessage.chat.id.toString(), deletingMessage.message_id);
    if (result.success) {
      toast({ title: "Message Deleted", description: "The message has been successfully deleted from Telegram." });
      // The hook will handle persistence, just update UI state by removing the message
      setMessages(prev => prev.filter(m => !(m.message_id === deletingMessage.message_id && m.chat.id === deletingMessage.chat.id && m.sourceTokenId === deletingMessage.sourceTokenId)));
    } else {
      toast({ title: "Failed to Delete Message", description: result.error, variant: "destructive" });
    }
    setIsDeleteConfirmOpen(false);
    setDeletingMessage(null);
  };

  const handleClearMessages = async () => {
    await clearMessages(filterTokenIds.length > 0 ? filterTokenIds : undefined);
    toast({
      title: "Messages Cleared",
      description: filterTokenIds.length > 0 
        ? `Messages for selected bot(s) have been cleared from local storage.`
        : `All messages have been cleared from local storage.`,
    });
    setIsClearAllConfirmOpen(false);
  };

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
  
  const displayedMessages = useMemo(() => {
    let filtered = messages;
    if (filterTokenIds.length > 0) {
      filtered = filtered.filter(msg => msg.sourceTokenId && filterTokenIds.includes(msg.sourceTokenId));
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(msg => 
        (msg.text && msg.text.toLowerCase().includes(lowerSearchTerm)) ||
        (msg.from?.first_name && msg.from.first_name.toLowerCase().includes(lowerSearchTerm)) ||
        (msg.from?.last_name && msg.from.last_name.toLowerCase().includes(lowerSearchTerm)) ||
        (msg.from?.username && msg.from.username.toLowerCase().includes(lowerSearchTerm)) ||
        (msg.chat?.title && msg.chat.title.toLowerCase().includes(lowerSearchTerm)) ||
        (msg.chat?.username && msg.chat.username.toLowerCase().includes(lowerSearchTerm)) ||
        (msg.botUsername && msg.botUsername.toLowerCase().includes(lowerSearchTerm))
      );
    }
    return filtered;
  }, [messages, filterTokenIds, searchTerm]);

  // Row component for react-window
  const MessageRow = useCallback(({ index, style }: ListChildComponentProps) => {
    const message = displayedMessages[index];
    if (!message) return null;
    return (
      <div style={style} className="px-1 py-1"> {/* Add some padding around each card if needed */}
        <MessageCard
          key={`${message.chat.id}-${message.message_id}-${message.sourceTokenId || 'unknown'}`}
          message={message} 
          onReply={handleReply}
          onDelete={handleDeleteInitiate}
          onDownloadFile={handleDownloadFile}
          isBotMessage={message.from?.is_bot || !!message.botUsername}
        />
      </div>
    );
  }, [displayedMessages, handleReply, handleDeleteInitiate, handleDownloadFile]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight">Message Log</h1>
            <p className="text-muted-foreground">
              Live feed of messages from your Telegram bots (messages stored for 1 day).
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            {tokens.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter by Bot ({filterTokenIds.length === 0 ? 'All' : filterTokenIds.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
                  <DropdownMenuLabel>Show messages from:</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {tokens.map(token => (
                    <DropdownMenuCheckboxItem
                      key={token.id}
                      checked={filterTokenIds.includes(token.id)}
                      onCheckedChange={(checked) => {
                        setFilterTokenIds(prev =>
                          checked ? [...prev, token.id] : prev.filter(id => id !== token.id)
                        );
                      }}
                    >
                      {token.botInfo?.username || token.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {filterTokenIds.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setFilterTokenIds([])}>Clear Filters</Button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="outline" size="icon" onClick={() => setIsClearAllConfirmOpen(true)} disabled={messages.length === 0}>
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Clear Messages</span>
            </Button>
          </div>
        </div>
        <div className="mb-4">
          <Input 
            type="search"
            placeholder="Search messages (text, user, bot...). Press Enter to search."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <CardDescription>
          Displaying {displayedMessages.length} of {messages.length} messages (max 1000, older than 1 day are auto-removed).
        </CardDescription>
      </div>
      {/* Replace ScrollArea with react-window List */}
      <div className="h-[calc(100vh-300px)] w-full rounded-md border bg-muted/30 overflow-hidden">
        {displayedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">
              {messages.length > 0 ? 'No messages match your current filter.' : 'No messages received yet. Ensure your webhook is set up.'}
            </p>
          </div>
        ) : (
          <AutoSizer>
            {({ height, width }) => (
              <List
                height={height}
                itemCount={displayedMessages.length}
                itemSize={ESTIMATED_MESSAGE_HEIGHT} // Adjust this based on your average MessageCard height
                width={width}
                itemData={displayedMessages} // Pass data to children if needed, though direct access in MessageRow is fine
              >
                {MessageRow}
              </List>
            )}
          </AutoSizer>
        )}
      </div>

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

      {/* Confirmation Dialog for Clearing Messages */}
      <AlertDialog open={isClearAllConfirmOpen} onOpenChange={setIsClearAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {filterTokenIds.length > 0
                ? `This will permanently delete all locally stored messages for the selected bot(s).`
                : `This will permanently delete all locally stored messages.`}
              This action does not affect messages on Telegram servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearMessages} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Yes, Clear Messages
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
