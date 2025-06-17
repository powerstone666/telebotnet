
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { TelegramMessage, StoredToken, ApiResult } from '@/lib/types';
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
import { Loader2, Send } from 'lucide-react';

// Simple in-memory store for sent messages for this page session
// In a real app, these might be fetched from a DB or a more persistent log
const sentMessagesStore: { [key: string]: TelegramMessage[] } = {};

export default function BotMessagesPage() {
  const { tokens } = useStoredTokens();
  const [selectedTokenId, setSelectedTokenId] = useState<string>("");
  const [chatId, setChatId] = useState<string>("");
  const [messageText, setMessageText] = useState<string>("");
  const [sentMessages, setSentMessages] = useState<TelegramMessage[]>([]);
  const [editingMessage, setEditingMessage] = useState<TelegramMessage | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<TelegramMessage | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (tokens.length > 0 && !selectedTokenId) {
      setSelectedTokenId(tokens[0].id);
    }
  }, [tokens, selectedTokenId]);

  useEffect(() => {
    if (selectedTokenId) {
      setSentMessages(sentMessagesStore[selectedTokenId] || []);
    }
  }, [selectedTokenId]);

  const handleSendMessage = async () => {
    if (!selectedTokenId || !chatId || !messageText.trim()) {
      toast({ title: "Error", description: "Please select a bot, enter a Chat ID, and write a message.", variant: "destructive" });
      return;
    }
    const token = tokens.find(t => t.id === selectedTokenId)?.token;
    if (!token) {
      toast({ title: "Error", description: "Selected bot token not found.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    const result = await sendMessageAction(token, chatId, messageText);
    setIsSending(false);

    if (result.success && result.data) {
      toast({ title: "Message Sent", description: "Your message has been sent successfully." });
      const newSentMessage = { 
        ...result.data, 
        sourceTokenId: selectedTokenId, // So we know which token sent it for edit/delete
        botUsername: tokens.find(t => t.id === selectedTokenId)?.botInfo?.username
      };
      setSentMessages(prev => {
        const updated = [newSentMessage, ...prev];
        sentMessagesStore[selectedTokenId] = updated;
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
      setSentMessages(prev => {
        const updated = prev.filter(m => m.message_id !== deletingMessage.message_id || m.chat.id !== deletingMessage.chat.id);
        sentMessagesStore[selectedTokenId] = updated;
        return updated;
      });
    } else {
      toast({ title: "Failed to Delete Message", description: result.error, variant: "destructive" });
    }
    setIsDeleteConfirmOpen(false);
    setDeletingMessage(null);
  };

  const handleMessageEdited = (editedMessageFull: TelegramMessage) => {
    setSentMessages(prevMessages => {
      const updated = prevMessages.map(msg =>
        (msg.message_id === editedMessageFull.message_id && msg.chat.id === editedMessageFull.chat.id)
          ? { ...msg, ...editedMessageFull, sourceTokenId: selectedTokenId, botUsername: tokens.find(t => t.id === selectedTokenId)?.botInfo?.username }
          : msg
      );
      sentMessagesStore[selectedTokenId] = updated;
      return updated;
    });
  };

  const handleCloseEditModal = () => setEditingMessage(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Bot Message Center</h1>
        <p className="text-muted-foreground">
          Send, view, and manage messages sent by your bots.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send New Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="bot-select" className="block text-sm font-medium text-gray-700 mb-1">Select Bot</label>
            <Select value={selectedTokenId} onValueChange={setSelectedTokenId}>
              <SelectTrigger id="bot-select">
                <SelectValue placeholder="Select a bot" />
              </SelectTrigger>
              <SelectContent>
                {tokens.map(token => (
                  <SelectItem key={token.id} value={token.id}>
                    {token.botInfo?.username || token.id} (ID: {token.id.substring(0,6)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="chat-id" className="block text-sm font-medium text-gray-700 mb-1">Chat ID (User ID, Group ID, or Channel ID)</label>
            <Textarea
              id="chat-id"
              placeholder="Enter target Chat ID (e.g., 123456789, -100123456789, or @channelusername)"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              rows={1}
            />
          </div>
          <div>
            <label htmlFor="message-text" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <Textarea
              id="message-text"
              placeholder="Type your message here..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleSendMessage} disabled={isSending || !selectedTokenId || !chatId.trim() || !messageText.trim()}>
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Send Message
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sent Messages Log ({tokens.find(t=>t.id === selectedTokenId)?.botInfo?.username || 'Selected Bot'})</CardTitle>
          <CardDescription>Messages sent by the selected bot in this session. These are not persisted long-term.</CardDescription>
        </CardHeader>
        <CardContent>
          {sentMessages.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No messages sent by this bot in this session yet.</p>
          ) : (
            <ScrollArea className="h-[400px] p-1">
              <div className="space-y-4">
                {sentMessages.map((msg, index) => (
                  <MessageCard
                    key={`${msg.message_id}-${msg.date}-${msg.chat?.id}-${index}`}
                    message={msg}
                    onReply={() => {}} // No reply for bot's own messages
                    onEdit={handleEdit} // Allow edit for bot messages
                    onDelete={handleDeleteInitiate}
                    isBotMessage={true} // Mark as bot message to enable edit
                    // onDownloadFile can be omitted if not applicable to bot-sent messages or handled differently
                  />
                ))}
              </div>
            </ScrollArea>
          )}
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
