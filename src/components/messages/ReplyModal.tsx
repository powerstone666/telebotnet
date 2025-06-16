
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StoredToken, TelegramMessage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { sendMessageAction } from '@/app/dashboard/send-message/actions';
import { Loader2, SendHorizonal } from "lucide-react"; // Corrected icon name

interface ReplyModalProps {
  message: TelegramMessage;
  allTokens: StoredToken[];
  isOpen: boolean;
  onClose: () => void;
}

export function ReplyModal({ message, allTokens, isOpen, onClose }: ReplyModalProps) {
  const [replyText, setReplyText] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState<string | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // Reset reply text when modal opens for a new message
      setReplyText("");
      // Pre-select token logic
      if (message.sourceTokenId && allTokens.find(t => t.id === message.sourceTokenId)) {
        setSelectedTokenId(message.sourceTokenId);
      } else if (allTokens.length === 1) {
        setSelectedTokenId(allTokens[0].id);
      } else {
        setSelectedTokenId(undefined); // Force user selection
      }
    }
  }, [isOpen, message, allTokens]);

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
      // parseMode can be added here if needed
    });
    setIsSending(false);

    if (result.success) {
      toast({ title: "Reply Sent", description: "Your reply has been sent successfully." });
      onClose(); // Close modal on success
    } else {
      toast({ title: "Failed to Send Reply", description: result.error, variant: "destructive" });
    }
  };

  const senderName = message.from?.first_name ? `${message.from.first_name} ${message.from.last_name || ''}`.trim() : (message.from?.username || 'Unknown User');
  const originalMessagePreview = message.text || (message.caption ? `[Media with caption: ${message.caption}]` : '[Media Message]');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Reply to {senderName}</DialogTitle>
          <DialogDescription>
            In chat: {message.chat.title || message.chat.username || message.chat.id}.
            <blockquote className="mt-2 p-2 border-l-4 bg-muted/50 rounded-r-md text-xs text-muted-foreground italic">
              <p className="truncate">Original: "{originalMessagePreview}"</p>
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
              className="resize-y"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reply-token-select">Send with Bot</Label>
            <Select 
              value={selectedTokenId} 
              onValueChange={setSelectedTokenId}
              disabled={allTokens.length === 0}
            >
              <SelectTrigger id="reply-token-select" className="w-full">
                <SelectValue placeholder={allTokens.length === 0 ? "No tokens available" : "Select a bot token..."} />
              </SelectTrigger>
              <SelectContent>
                {allTokens.map(token => (
                  <SelectItem key={token.id} value={token.id}>
                    {token.botInfo?.username || `Token ending ...${token.token.slice(-6)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedTokenId && allTokens.length > 0 && <p className="text-xs text-destructive">Please select a token.</p>}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmitReply} disabled={isSending || !replyText.trim() || !selectedTokenId}>
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SendHorizonal className="mr-2 h-4 w-4" />}
            Send Reply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
