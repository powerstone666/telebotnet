
"use client";

import type { TelegramMessage, TelegramPhotoSize } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, Video, Download, Reply, Bot, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { format, fromUnixTime } from 'date-fns';
import NextImage from "next/image"; 
import { useState, useEffect } from 'react';

interface MessageCardProps {
  message: TelegramMessage;
  onReply: (message: TelegramMessage) => void;
  onEdit: (message: TelegramMessage) => void;
  onDelete: (message: TelegramMessage) => void;
  onDownloadFile?: (fileId: string, fileName: string | undefined, sourceTokenId?: string) => void;
}

function getInitials(name: string = ""): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const getLargestPhoto = (photos?: TelegramPhotoSize[]): TelegramPhotoSize | undefined => {
  if (!photos || photos.length === 0) return undefined;
  return photos.reduce((largest, current) => (current.width * current.height > largest.width * largest.height ? current : largest));
};

export function MessageCard({ message, onReply, onEdit, onDelete, onDownloadFile }: MessageCardProps) {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    if (typeof message.date === 'number' && !isNaN(message.date)) {
      try {
        setFormattedDate(format(fromUnixTime(message.date), 'PP pp'));
      } catch (e) {
        console.error("Error formatting message date:", message.date, e);
        setFormattedDate("Invalid date");
      }
    } else {
      setFormattedDate("Date unavailable");
    }
  }, [message.date]);

  const senderName = message.from?.first_name ? `${message.from.first_name} ${message.from.last_name || ''}`.trim() : (message.from?.username || 'Unknown User');
  const chatTitle = message.chat.title || message.chat.username || (message.chat.type === 'private' ? `${message.chat.first_name || ''} ${message.chat.last_name || ''}`.trim() : 'Unknown Chat');
  const largestPhoto = getLargestPhoto(message.photo);
  const canDownload = onDownloadFile && message.sourceTokenId;
  const canManage = message.sourceTokenId; // Assume if sourceTokenId is present, we can attempt management actions

  const handleDownload = (fileId?: string, fileName?: string) => {
    if (canDownload && fileId) {
      onDownloadFile(fileId, fileName, message.sourceTokenId);
    } else if (!message.sourceTokenId) {
      console.warn("Download attempted without sourceTokenId for message:", message.message_id);
    }
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-start space-x-3 p-4">
        <Avatar className="h-10 w-10 border">
          <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>{senderName}</span>
            {message.botUsername && (
              <span className="text-xs font-normal text-muted-foreground flex items-center">
                via <Bot className="h-3 w-3 ml-1 mr-0.5" /> {message.botUsername}
              </span>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            in {chatTitle} &bull; {formattedDate || 'Loading date...'} {message.edit_date && `(edited ${format(fromUnixTime(message.edit_date), 'PP pp')})`}
          </p>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {message.text && <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>}
        
        {message.caption && !message.text && <p className="text-sm italic text-muted-foreground whitespace-pre-wrap break-words">Caption: {message.caption}</p>}
        {message.caption && message.text && <p className="text-sm italic text-muted-foreground whitespace-pre-wrap break-words mt-1">Additionally captioned: {message.caption}</p>}


        {largestPhoto && (
          <div className="mt-2 border rounded-md p-2 bg-muted/20">
            <NextImage 
              src={`https://placehold.co/300x200.png?text=Photo+Preview`} 
              alt={message.caption || "Sent photo"} 
              width={300} height={200} 
              className="rounded-md object-contain mx-auto"
              data-ai-hint="photograph image"
            />
            {canDownload && (
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => handleDownload(largestPhoto.file_id, `photo_${largestPhoto.file_unique_id}.jpg`)}>
                <Download className="mr-1 h-4 w-4" /> Download Photo
              </Button>
            )}
          </div>
        )}
        {message.document && (
          <div className="flex items-center space-x-2 p-2 border rounded-md bg-muted/30 hover:bg-muted/50">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm flex-1 truncate" title={message.document.file_name || 'Document'}>{message.document.file_name || 'Document'}</span>
            {canDownload && (
              <Button size="icon" variant="ghost" onClick={() => handleDownload(message.document!.file_id, message.document!.file_name)}>
                <Download className="h-4 w-4" />
                <span className="sr-only">Download Document</span>
              </Button>
            )}
          </div>
        )}
         {message.video && (
          <div className="flex items-center space-x-2 p-2 border rounded-md bg-muted/30 hover:bg-muted/50">
            <Video className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm flex-1 truncate" title={message.video.file_name || 'Video'}>{message.video.file_name || `Video (${message.video.width}x${message.video.height}, ${message.video.duration}s)`}</span>
             {canDownload && (
              <Button size="icon" variant="ghost" onClick={() => handleDownload(message.video!.file_id, message.video!.file_name)}>
                <Download className="h-4 w-4" />
                <span className="sr-only">Download Video</span>
              </Button>
            )}
          </div>
        )}
         {!canDownload && (message.document || message.video || largestPhoto) && (
          <p className="text-xs text-muted-foreground flex items-center">
            <AlertCircle className="h-3 w-3 mr-1"/> Download not available (token info missing).
          </p>
        )}
      </CardContent>
      <CardFooter className="px-4 py-3 border-t flex justify-start gap-1">
        <Button variant="ghost" size="sm" onClick={() => onReply(message)} disabled={!canManage}>
          <Reply className="mr-1 h-4 w-4" /> Reply
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(message)} disabled={!canManage || !message.text}> {/* Only allow edit for text messages for simplicity */}
          <Pencil className="mr-1 h-4 w-4" /> Edit
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90" onClick={() => onDelete(message)} disabled={!canManage}>
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
