"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StoredToken, TelegramMessage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { sendMessageAction } from '@/app/dashboard/send-message/actions'; // Re-use send message action
import { Loader2 } from 'lucide-react';

interface ReplyModalProps {
  message: TelegramMessage;
  allTokens: StoredToken[];
  isOpen: boolean;
  onClose: () => void;
}

export function ReplyModal({ message, allTokens, isOpen, onClose }: ReplyModalProps) {
  const [replyText, setReplyText] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState<string | undefined>(message.sourceTokenId);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // If the original message's source token is available, pre-select it.
    // Otherwise, if there's only one token, select it.
    // Otherwise, prompt user to select.
    if (message.sourceTokenId && allTokens.find(t => t.id === message.sourceTokenId)) {
      setSelectedTokenId(message.sourceTokenId);
    } else if (allTokens.length === 1) {
      setSelectedTokenId(allTokens[0].id);
    } else {
      setSelectedTokenId(undefined); // Force user selection if multiple tokens and no source token
    }
  }, [message, allTokens]);

  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      toast({ title: "Empty Reply", description: "Please enter a message to send.", variant: "destructive" });
      return;
    }
    if (!selectedTokenId) {
      toast({ title: "No Token Selected", description: "Please select a bot token to send the reply with.", variant: "destructive" });
      return;
    }

    const tokenToUse = allTokens.find(t => t.id === selectedTokenId)?.token;
    if (!tokenToUse) {
        toast({ title: "Token Error", description: "Selected bot token not found.", variant: "destructive" });
        return;
    }

    setIsSending(true);
    const result = await sendMessageAction({
      token: tokenToUse,
      chatId: message.chat.id.toString(),
      text: replyText,
      replyToMessageId: message.message_id.toString(),
    });
    setIsSending(false);

    if (result.success) {
      toast({ title: "Reply Sent", description: "Your reply has been sent successfully." });
      setReplyText("");
      onClose();
    } else {
      toast({ title: "Failed to Send Reply", description: result.error, variant: "destructive" });
    }
  };

  const senderName = message.from?.first_name ? `${message.from.first_name} ${message.from.last_name || ''}`.trim() : (message.from?.username || 'Unknown User');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Reply to {senderName}</DialogTitle>
          <DialogDescription>
            Replying in chat: {message.chat.title || message.chat.username || message.chat.id}.
            <blockquote className="mt-2 p-2 border-l-4 bg-muted/50 rounded-r-md">
              <p className="text-xs text-muted-foreground italic truncate">"{message.text || (message.caption ? `Caption: ${message.caption}` : '[Media Message]')}"</p>
            </blockquote>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reply-message">Your Reply</Label>
            <Textarea
              id="reply-message"
              placeholder="Type your reply here..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reply-token-select">Send with Bot</Label>
            <Select value={selectedTokenId} onValueChange={setSelectedTokenId} disabled={allTokens.length <=1 && !!message.sourceTokenId}>
              <SelectTrigger id="reply-token-select" className="w-full">
                <SelectValue placeholder="Select a bot token..." />
              </SelectTrigger>
              <SelectContent>
                {allTokens.map(token => (
                  <SelectItem key={token.id} value={token.id}>
                    {token.botInfo?.username || `Token ending ...${token.token.slice(-4)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedTokenId && <p className="text-xs text-destructive">Please select a token.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmitReply} disabled={isSending || !replyText.trim() || !selectedTokenId}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
