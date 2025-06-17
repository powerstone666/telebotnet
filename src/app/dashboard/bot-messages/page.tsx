"use client";

import { useState, useEffect, useCallback } from 'react';
import type { TelegramMessage, StoredToken, ApiResult, TelegramUpdate } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCard } from '@/components/messages/MessageCard';
import { EditMessageModal } from '@/components/messages/EditMessageModal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { sendMessageAction, deleteMessageAction } from './actions'; 
import { Loader2, Send, Search } from 'lucide-react'; // Added Search
import { useMemo } from 'react';
import { Input } from "@/components/ui/input"; // Added Input
import { Label } from "@/components/ui/label"; // Added Label

// Store for messages actively managed (sent/edited/deleted) by this page instance for the selectedTokenId
const pageManagedMessagesStore: { [key: string]: TelegramMessage[] } = {};

export default function BotMessagesPage() {
  const { tokens } = useStoredTokens();
  const [selectedTokenId, setSelectedTokenId] = useState<string>("");
  const [chatId, setChatId] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  
  // State for messages sent/managed by this page instance for the selectedTokenId
  const [pageManagedMessages, setPageManagedMessages] = useState<TelegramMessage[]>([]);
  // State for other bot messages received via SSE from any registered bot
  const [otherBotMessages, setOtherBotMessages] = useState<TelegramMessage[]>([]);

  const [editingMessage, setEditingMessage] = useState<TelegramMessage | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<TelegramMessage | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const [botSearchTerm, setBotSearchTerm] = useState(''); // New state for bot search

  useEffect(() => {
    if (tokens.length > 0 && !selectedTokenId) {
      setSelectedTokenId(tokens[0].id);
    }
  }, [tokens, selectedTokenId]);

  // Effect to load/update pageManagedMessages from pageManagedMessagesStore based on selectedTokenId
  useEffect(() => {
    if (selectedTokenId) {
      setPageManagedMessages(pageManagedMessagesStore[selectedTokenId] || []);
    } else {
      setPageManagedMessages([]); // Clear if no token selected
    }
  }, [selectedTokenId]);

  // SSE Listener for incoming bot messages
  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onmessage = (event) => {
      try {
        const update: TelegramUpdate = JSON.parse(event.data); // Use TelegramUpdate type

        // Ensure it's a message, from a bot, and one of our registered bots
        if (update.message && update.message.from?.is_bot && update.sourceTokenId && tokens.some(t => t.id === update.sourceTokenId)) {
          const botMessage: TelegramMessage = {
            ...update.message,
            // Ensure all context fields from the update are mapped to the message if not already present
            sourceTokenId: update.sourceTokenId,
            botUsername: update.botUsername || tokens.find(t => t.id === update.sourceTokenId)?.botInfo?.username,
            userId: update.userId || update.message.from?.id,
            chatId: update.chatId || update.message.chat.id,
            isGroupMessage: update.isGroupMessage === undefined 
              ? (update.message.chat.type === 'group' || update.message.chat.type === 'supergroup') 
              : update.isGroupMessage,
          };

          setOtherBotMessages(prev => {
            const exists = prev.some(m => m.message_id === botMessage.message_id && m.chat.id === botMessage.chat.id && m.sourceTokenId === botMessage.sourceTokenId);
            if (exists) return prev;
            return [botMessage, ...prev.slice(0, 199)]; 
          });
        }
      } catch (error) {
        console.error("Error processing SSE message for bot messages:", error);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error (Bot Messages):", err);
    };

    return () => {
      eventSource.close();
    };
  }, [tokens]); // Effect depends on tokens to identify "our" bots

  const filteredTokens = tokens.filter(token => {
    const searchTermLower = botSearchTerm.toLowerCase();
    return (
      token.id.toLowerCase().includes(searchTermLower) ||
      (token.botInfo?.username && token.botInfo.username.toLowerCase().includes(searchTermLower)) ||
      (token.botInfo?.first_name && token.botInfo.first_name.toLowerCase().includes(searchTermLower)) ||
      (token.token && token.token.toLowerCase().includes(searchTermLower))
    );
  });

  const handleSendMessage = async () => {
    if (!selectedTokenId || !chatId || !messageText.trim()) {
      toast({ title: "Error", description: "Please select a bot, enter a Chat ID, and write a message.", variant: "destructive" });
      return;
    }
    const tokenInfo = tokens.find(t => t.id === selectedTokenId);
    if (!tokenInfo || !tokenInfo.token) {
      toast({ title: "Error", description: "Selected bot token not found.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    const result = await sendMessageAction(tokenInfo.token, chatId, messageText);
    setIsSending(false);

    if (result.success && result.data) {
      toast({ title: "Message Sent", description: "Your message has been sent successfully." });
      const newSentMessage: TelegramMessage = { 
        ...result.data, 
        sourceTokenId: selectedTokenId, 
        botUsername: tokenInfo.botInfo?.username,
        userId: result.data.from?.id, 
        chatId: result.data.chat.id,
        isGroupMessage: result.data.chat.type === 'group' || result.data.chat.type === 'supergroup',
      };
      setPageManagedMessages(prev => {
        const updated = [newSentMessage, ...prev];
        pageManagedMessagesStore[selectedTokenId] = updated;
        return updated;
      });
      setMessageText(""); // Clear input after sending
    } else {
      toast({ title: "Failed to Send Message", description: result.error, variant: "destructive" });
    }
  };

  const handleEdit = (message: TelegramMessage) => {
    setEditingMessage(message);
  };

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
      setPageManagedMessages(prev => {
        const updated = prev.filter(m => !(m.message_id === deletingMessage.message_id && m.chat.id === deletingMessage.chat.id));
        if (selectedTokenId && pageManagedMessagesStore[selectedTokenId]) {
            pageManagedMessagesStore[selectedTokenId] = updated;
        }
        return updated;
      });
      setOtherBotMessages(prev => prev.filter(m => !(m.message_id === deletingMessage.message_id && m.chat.id === deletingMessage.chat.id)));
    } else {
      toast({ title: "Failed to Delete Message", description: result.error, variant: "destructive" });
    }
    setIsDeleteConfirmOpen(false);
    setDeletingMessage(null);
  };

  const handleMessageEdited = (editedMessageFull: TelegramMessage) => {
    setPageManagedMessages(prevMessages => {
      const currentBotInfo = tokens.find(t => t.id === selectedTokenId)?.botInfo;
      const updated = prevMessages.map(msg =>
        (msg.message_id === editedMessageFull.message_id && msg.chat.id === editedMessageFull.chat.id)
          ? { ...msg, ...editedMessageFull, sourceTokenId: selectedTokenId, botUsername: currentBotInfo?.username }
          : msg
      );
      if (selectedTokenId) {
        pageManagedMessagesStore[selectedTokenId] = updated;
      }
      return updated;
    });
  };

  const handleCloseEditModal = () => setEditingMessage(null);

  const handleDeleteLocal_BotMessages = (messageToDelete: TelegramMessage) => {
    if (!messageToDelete?.chat?.id || !messageToDelete?.message_id) {
      toast({ title: "Error", description: "Cannot remove message: missing information.", variant: "destructive" });
      return;
    }

    // Remove from pageManagedMessages and update store
    setPageManagedMessages(prev => {
      const updated = prev.filter(m => 
        !(m.message_id === messageToDelete.message_id && m.chat.id === messageToDelete.chat.id && m.sourceTokenId === messageToDelete.sourceTokenId)
      );
      if (selectedTokenId && pageManagedMessagesStore[selectedTokenId]) {
        pageManagedMessagesStore[selectedTokenId] = updated;
      }
      return updated;
    });

    // Remove from otherBotMessages
    setOtherBotMessages(prev => prev.filter(m => 
      !(m.message_id === messageToDelete.message_id && m.chat.id === messageToDelete.chat.id && m.sourceTokenId === messageToDelete.sourceTokenId)
    ));

    toast({ title: "Message Removed", description: "The message has been removed from the local view." });
  };

  const combinedMessages = useMemo(() => {
    const allMessagesMap = new Map<string, TelegramMessage>();

    // Add pageManagedMessages, these are messages sent/edited from this page for the selected bot
    pageManagedMessages.forEach(msg => {
      if (msg.chat?.id && msg.message_id) {
        allMessagesMap.set(`${msg.chat.id}-${msg.message_id}`, msg);
      }
    });

    // Add otherBotMessages (from any registered bot via SSE)
    otherBotMessages.forEach(msg => {
      if (msg.chat?.id && msg.message_id) {
        const key = `${msg.chat.id}-${msg.message_id}`;
        if (!allMessagesMap.has(key)) { // Add if not already present from pageManagedMessages
            allMessagesMap.set(key, msg);
        }
      }
    });
    
    return Array.from(allMessagesMap.values()).sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [pageManagedMessages, otherBotMessages]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage Bot Messages</CardTitle>
          <CardDescription>
            Send messages, and view/edit/delete messages sent by the selected bot in a specific chat.
            Also shows other messages received by any of your registered bots.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <Label htmlFor="bot-search-botmessages">Search & Select Bot</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <Input
                  id="bot-search-botmessages"
                  type="search"
                  placeholder="Filter bots..."
                  value={botSearchTerm}
                  onChange={(e) => setBotSearchTerm(e.target.value)}
                  className="flex-grow"
                />
              </div>
              <Select value={selectedTokenId} onValueChange={setSelectedTokenId} disabled={tokens.length === 0} >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={tokens.length === 0 ? "No bots available. Add tokens first." : "Select a bot"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredTokens.length > 0 ? (
                    filteredTokens.map(token => (
                      <SelectItem key={token.id} value={token.id}>
                        {token.botInfo?.username || token.botInfo?.first_name || `Bot ID: ${token.id.substring(0,8)}...`}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-match" disabled>
                      {botSearchTerm ? "No bots match your search." : (tokens.length === 0 ? "No bots available. Add tokens first." : "Select a bot from the list")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="chat-id-botmessages">Chat ID</Label>
              <Textarea
                id="chat-id-botmessages"
                placeholder="Enter User ID, Group ID, or Channel ID"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                rows={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="message-text-botmessages">Message</Label>
              <Textarea
                id="message-text-botmessages"
                placeholder="Type your message here..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
            <Button onClick={handleSendMessage} disabled={isSending || !selectedTokenId || !chatId.trim() || !messageText.trim()}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Send Message
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent Messages Log ({tokens.find(t=>t.id === selectedTokenId)?.botInfo?.username || 'Selected Bot'})</CardTitle>
          <CardDescription>Messages sent by the selected bot in this session. These are not persisted long-term.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] w-full rounded-md border p-4 bg-muted/30">
            {combinedMessages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No bot messages to display. Send a message or wait for incoming bot activity.</p>
              </div>
            )}
            <div className="space-y-4">
              {combinedMessages.map((message) => {
                // A message is considered "page managed" if it's in the pageManagedMessages list for the currently selected token
                // OR if its sourceTokenId matches the selectedTokenId (for messages that might have arrived via SSE but were initiated by this bot)
                const isDirectlyManagedBySelectedBot = pageManagedMessages.some(
                  pm => pm.message_id === message.message_id && pm.chat.id === message.chat.id
                ) || message.sourceTokenId === selectedTokenId;
                
                return (
                  <MessageCard
                    key={`${message.chat.id}-${message.message_id}-${message.sourceTokenId}`}
                    message={message}
                    onReply={() => { /* No direct reply action from this page; users reply in Telegram */ }}
                    onEdit={isDirectlyManagedBySelectedBot && message.text ? handleEdit : undefined} // Edit only for text messages managed by the selected bot
                    onDeleteTelegram={handleDeleteInitiate} // Corrected: Was onDelete
                    onDeleteLocal={handleDeleteLocal_BotMessages} // Added for local deletion
                    isBotMessage={true} // All messages on this page are considered bot messages
                    // onDownloadFile could be added if bots send downloadable files
                  />
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {editingMessage && (
        <EditMessageModal
          message={editingMessage}
          allTokens={tokens} // Pass all tokens, modal can find the right one by sourceTokenId
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
