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
// import { FixedSizeList as List, ListChildComponentProps } from 'react-window'; // Old import
import { VariableSizeList as List, ListChildComponentProps } from 'react-window'; // Changed to VariableSizeList
import AutoSizer from 'react-virtualized-auto-sizer';
import { MessageCardSkeleton } from '@/components/messages/MessageCardSkeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  // CardDescription is already imported
} from "@/components/ui/card"; // Import Card components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import { Label } from "@/components/ui/label"; // Import Label

const MESSAGE_EXPIRY_DURATION_MS = 24 * 60 * 60 * 1000;
const initialMessagesForHook: TelegramMessage[] = [];
const ESTIMATED_MESSAGE_HEIGHT = 320; // Keep this as a fallback/initial estimate

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
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const { toast } = useToast();
  const [hasMounted, setHasMounted] = useState(false);
  const [filterTokenIds, setFilterTokenIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");


  const tokensRef = useRef(tokens);
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  // Refs for VariableSizeList
  const listRef = useRef<List>(null);
  const itemHeights = useRef<{ [key: number]: number }>({});

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const addNewMessage = useCallback((newMessage: TelegramMessage) => {
    if (!newMessage || typeof newMessage.message_id === 'undefined' || !newMessage.chat || typeof newMessage.chat.id === 'undefined') {
      console.warn("SSE: Received incomplete message, skipping:", newMessage);
      return;
    }
    setMessages(prevMessages => {
      return [newMessage, ...prevMessages]; 
    });
    
    const currentTokens = tokensRef.current;
    const botNameForToast = newMessage.botUsername || 
                          (newMessage.sourceTokenId ? currentTokens.find(t => t.id === newMessage.sourceTokenId)?.botInfo?.username : null) || 
                          'Bot';
    
    toast({ 
      title: "New Message Received", 
      description: `From: ${newMessage.from?.username || newMessage.from?.first_name || 'Unknown'} via ${botNameForToast}` 
    });
  }, [setMessages, toast]);

  useEffect(() => {
    // Moved the check for hasMounted and isLoadingMessages inside the effect
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
  }, [hasMounted, addNewMessage, isLoadingMessages]);

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

  // Callback for MessageRow to report its height
  const setItemHeight = useCallback((index: number, size: number) => {
    const currentSize = itemHeights.current[index];
    if (currentSize !== size) {
      itemHeights.current[index] = size;
      // Force react-window to re-render items after this index has changed height
      // This is crucial for VariableSizeList to update its layout
      listRef.current?.resetAfterIndex(index, false); // 'false' means don't re-measure, just re-render
    }
  }, []); // itemHeights and listRef are refs, so they don't need to be in deps

  const MessageRow = useCallback(({ index, style }: ListChildComponentProps) => {
    const message = displayedMessages[index];
    const rowRef = useRef<HTMLDivElement>(null);

    // Use ResizeObserver to detect size changes of the row
    useEffect(() => {
      const element = rowRef.current;
      if (!element) return;

      const observer = new ResizeObserver(entries => {
        for (let entry of entries) {
          // Ensure we are getting the border-box height
          const newHeight = entry.borderBoxSize && entry.borderBoxSize.length > 0 
                            ? entry.borderBoxSize[0].blockSize 
                            : entry.contentRect.height;
          if (newHeight > 0) { // Only update if height is positive
             setItemHeight(index, newHeight);
          }
        }
      });

      observer.observe(element);
      return () => observer.unobserve(element);
    }, [index, setItemHeight, message]); // Re-run if index or message changes (message for content change)


    if (!message) return null;
    
    // The outer div receives the style from react-window for positioning and sizing the row's "slot".
    // The inner div (with rowRef) is what we measure. It should be free to expand to the full height of its content (MessageCard).
    return (
      <div style={style}> {/* Apply react-window style here for positioning */}
        <div ref={rowRef} className="flex flex-col"> {/* Attach ref here for ResizeObserver, flex-col allows content to determine height */}
          {/* The MessageCard and its padding are inside this div */}
          <div className="px-1 py-1"> {/* Consistent padding for measurement */}
              <MessageCard
                key={`${message.chat.id}-${message.message_id}-${message.sourceTokenId || 'unknown'}-${index}`}
                message={message} 
                onReply={handleReply}
                onDeleteTelegram={handleDeleteInitiate} // Changed from onDelete
                onDeleteLocal={handleDeleteLocal} // Added new prop
                onDownloadFile={handleDownloadFile}
                isBotMessage={message.from?.is_bot || !!message.botUsername}
              />
          </div>
        </div>
      </div>
    );
  }, [displayedMessages, setItemHeight]);

  // Function for VariableSizeList to get item size
  const getItemHeight = (index: number): number => {
    return itemHeights.current[index] || ESTIMATED_MESSAGE_HEIGHT;
  };
  
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

  // Handler functions (not Hooks, their definition order relative to JSX is what matters)
  const handleReply = (message: TelegramMessage) => {
    setReplyingToMessage(message);
  };

  const handleDeleteInitiate = (message: TelegramMessage) => {
    setDeletingMessage(message);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteLocal = (messageToDelete: TelegramMessage) => {
    setMessages(prev => prev.filter(m => 
        !(m.message_id === messageToDelete.message_id && 
          m.chat.id === messageToDelete.chat.id && 
          m.sourceTokenId === messageToDelete.sourceTokenId
        )
    ));
    toast({
      title: "Message Removed Locally",
      description: "The message has been removed from this list.",
    });
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

  return (
    <div className="flex flex-col h-full p-2 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6"> {/* Adjusted padding and spacing for mobile */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-2"> {/* Adjusted gap for mobile */}
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center">
            <Search className="mr-2 h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" /> {/* Adjusted icon size */}
            Message Log
          </h1>
          <CardDescription className="mt-1 text-xs sm:text-sm md:mt-1.5">
            View & interact with bot messages.
          </CardDescription>
        </div>
        <div className="flex flex-row items-center gap-2 self-start sm:self-center"> {/* Ensure horizontal layout on mobile for buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"> {/* Adjusted button size */}
                <Filter className="mr-1.5 h-3.5 w-3.5" /> {/* Adjusted icon size and margin */}
                Filter ({filterTokenIds.length === 0 ? 'All' : filterTokenIds.length})
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
          <Button variant="outline" size="sm" onClick={() => setIsClearAllConfirmOpen(true)} disabled={messages.length === 0}> {/* Changed size to sm */}
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Clear Messages</span>
          </Button>
        </div>
      </div>
      <div className="mb-3 sm:mb-4"> {/* Adjusted margin */}
        <Input 
          type="search"
          placeholder="Search messages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-sm sm:text-base" /* Adjusted text size */
        />
      </div>

      <CardDescription className="text-xs sm:text-sm">
        Displaying {displayedMessages.length} of {messages.length} messages (max 1000, older than 1 day are auto-removed).
      </CardDescription>
      {/* Virtualized List Container - ensure it takes up available space */}
      <div className="flex-grow min-h-0">
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef} // Assign ref to the List
              className="message-list-container"
              height={height}
              itemCount={displayedMessages.length}
              itemSize={getItemHeight} // Use dynamic item size function
              estimatedItemSize={ESTIMATED_MESSAGE_HEIGHT} // Provide an estimate
              width={width}
            >
              {MessageRow}
            </List>
          )}
        </AutoSizer>
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
