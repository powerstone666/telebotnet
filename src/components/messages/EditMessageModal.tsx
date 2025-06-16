
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
import { editMessageTextAction } from '@/app/dashboard/message-log/actions';
import { Loader2, Pencil } from "lucide-react"; 

interface EditMessageModalProps {
  message: TelegramMessage;
  allTokens: StoredToken[];
  isOpen: boolean;
  onClose: () => void;
  onMessageEdited: (editedMessage: TelegramMessage) => void;
}

export function EditMessageModal({ message, allTokens, isOpen, onClose, onMessageEdited }: EditMessageModalProps) {
  const [editedText, setEditedText] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState<string | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setEditedText(message.text || ""); // Initialize with current message text
      if (message.sourceTokenId && allTokens.find(t => t.id === message.sourceTokenId)) {
        setSelectedTokenId(message.sourceTokenId);
      } else if (allTokens.length === 1) {
        setSelectedTokenId(allTokens[0].id);
      } else {
        setSelectedTokenId(undefined); 
      }
    }
  }, [isOpen, message, allTokens]);

  const handleSubmitEdit = async () => {
    if (!editedText.trim()) {
      toast({ title: "Empty Message", description: "Message text cannot be empty.", variant: "destructive" });
      return;
    }
    if (!selectedTokenId) {
      toast({ title: "No Token Selected", description: "Please select a bot token to send the edit with.", variant: "destructive" });
      return;
    }

    const tokenToUse = allTokens.find(t => t.id === selectedTokenId)?.token;
    if (!tokenToUse) {
        toast({ title: "Token Error", description: "Selected bot token not found.", variant: "destructive" });
        return;
    }

    setIsSending(true);
    const result = await editMessageTextAction(
      tokenToUse,
      message.chat.id.toString(),
      message.message_id,
      editedText
    );
    setIsSending(false);

    if (result.success) {
      toast({ title: "Message Edited", description: "Your message has been edited successfully." });
      if (typeof result.data === 'object' && result.data !== null && 'message_id' in result.data) {
        // If the API returns the full edited message object
        onMessageEdited(result.data as TelegramMessage);
      } else {
        // If API returns true, or for inline messages, we update locally
        onMessageEdited({ ...message, text: editedText, edit_date: Math.floor(Date.now() / 1000) });
      }
      onClose(); 
    } else {
      toast({ title: "Failed to Edit Message", description: result.error, variant: "destructive" });
    }
  };

  const senderName = message.from?.first_name ? `${message.from.first_name} ${message.from.last_name || ''}`.trim() : (message.from?.username || 'Unknown User');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Edit Message from {senderName}</DialogTitle>
          <DialogDescription>
            In chat: {message.chat.title || message.chat.username || message.chat.id}.
            <blockquote className="mt-2 p-2 border-l-4 bg-muted/50 rounded-r-md text-xs text-muted-foreground italic">
              <p className="truncate">Original: "{message.text}"</p>
            </blockquote>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-message-text">New Text</Label>
            <Textarea
              id="edit-message-text"
              placeholder="Enter the new message text..."
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={4}
              className="resize-y"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-token-select">Edit with Bot</Label>
            <Select 
              value={selectedTokenId} 
              onValueChange={setSelectedTokenId}
              disabled={allTokens.length === 0}
            >
              <SelectTrigger id="edit-token-select" className="w-full">
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
          <Button type="submit" onClick={handleSubmitEdit} disabled={isSending || !editedText.trim() || !selectedTokenId}>
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
