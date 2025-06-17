"use client";

import type { TelegramMessage, TelegramPhotoSize } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, Video, Download, Reply, Bot, AlertCircle, Pencil, Trash2 } from "lucide-react"; // Added Pencil back
import { format, fromUnixTime } from 'date-fns';
import NextImage from "next/image"; 
import { useState, useEffect } from 'react';

interface MessageCardProps {
  message: TelegramMessage;
  onReply: (message: TelegramMessage) => void;
  onEdit?: (message: TelegramMessage) => void; // Made onEdit optional
  onDelete: (message: TelegramMessage) => void;
  onDownloadFile?: (fileId: string, fileName: string | undefined, sourceTokenId?: string) => void;
  isBotMessage?: boolean; // New prop to identify bot messages
  style?: React.CSSProperties; // Added for react-window
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

export function MessageCard({ message, onReply, onEdit, onDelete, onDownloadFile, isBotMessage = false, style }: MessageCardProps) {
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
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 w-full" style={style}> {/* Apply style here, ensure w-full */}
      <CardHeader className="flex flex-row items-start space-x-2 sm:space-x-3 p-3 sm:p-4">
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border">
          <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0"> {/* Added min-w-0 for better flex truncation/wrapping */}
          <CardTitle className="text-sm sm:text-base font-semibold flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <span className="truncate mr-1">{senderName}</span>
            {message.botUsername && (
              <span className="text-xs font-normal text-muted-foreground flex items-center whitespace-nowrap">
                via <Bot className="h-3 w-3 ml-1 mr-0.5" /> {message.botUsername}
              </span>
            )}
          </CardTitle>
          {/* Metadata container for better responsive stacking if needed later */}
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p className="truncate" title={`${chatTitle} (Chat ID: ${message.chat.id})`}>
              in {chatTitle} (ID: {message.chat.id})
            </p>
            <p className="truncate">
              User ID: {message.from?.id || 'N/A'} &bull; Msg ID: {message.message_id}
            </p>
            {message.chat.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate" title={message.chat.description}>
                Chat Desc: <span className="italic">{message.chat.description}</span>
              </p>
            )}
            <p className="mt-0.5 sm:mt-1">
              {formattedDate || 'Loading date...'} {message.edit_date && `(edited ${format(fromUnixTime(message.edit_date), 'PP pp')})`}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4"> {/* Increased padding and space-y */}
        {message.text && <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>}
        
        {/* Media container to group all media types and their captions/downloads */}
        {(largestPhoto || message.document || message.video) && (
          <div className="space-y-3 mt-3 border rounded-lg p-3 bg-muted/20"> {/* Increased mt, p, space-y and rounded-lg */}
            {message.caption && !message.text && <p className="text-sm italic text-muted-foreground whitespace-pre-wrap break-words mb-2">Caption: {message.caption}</p>} {/* Increased mb */}
            {message.caption && message.text && <p className="text-sm italic text-muted-foreground whitespace-pre-wrap break-words mt-1 mb-2">Additionally captioned: {message.caption}</p>} {/* Increased mb */}

            {largestPhoto && (
              <div className="space-y-2"> {/* Increased space-y */}
                <NextImage 
                  src={`https://placehold.co/300x200.png?text=Photo+Preview`} 
                  alt={message.caption || "Sent photo"} 
                  width={300} height={200} 
                  className="rounded-md object-contain mx-auto max-w-full h-auto" 
                  data-ai-hint="photograph image"
                />
                {canDownload && (
                  <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => handleDownload(largestPhoto.file_id, `photo_${largestPhoto.file_unique_id}.jpg`)}>
                    <Download className="mr-1.5 h-4 w-4" /> Download Photo {/* Increased mr */}
                  </Button>
                )}
              </div>
            )}
            {message.document && (
              <div className="flex items-center space-x-3 p-2 rounded-md bg-background hover:bg-muted/50"> {/* Increased space-x and p */}
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
              <div className="flex items-center space-x-3 p-2 rounded-md bg-background hover:bg-muted/50"> {/* Increased space-x and p */}
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
            {!canDownload && (
              <p className="text-xs text-muted-foreground flex items-center pt-1.5"> {/* Increased pt */}
                <AlertCircle className="h-3 w-3 mr-1.5"/> Download not available (token info missing). {/* Increased mr */}
              </p>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="px-4 sm:px-6 py-2.5 sm:py-3.5 border-t flex flex-wrap justify-start gap-1.5 sm:gap-2"> {/* Increased padding and gap */}
        {onEdit && isBotMessage && message.text && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(message)} disabled={!canManage} className="text-xs px-2 py-1 h-auto sm:text-sm sm:px-3 sm:py-1.5 sm:h-9">
                <Pencil className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Edit
            </Button>
        )}
        {message.from && !message.from.is_bot && (
            <Button variant="ghost" size="sm" onClick={() => onReply(message)} disabled={!canManage} className="text-xs px-2 py-1 h-auto sm:text-sm sm:px-3 sm:py-1.5 sm:h-9">
                <Reply className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Reply
            </Button>
        )}
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90 text-xs px-2 py-1 h-auto sm:text-sm sm:px-3 sm:py-1.5 sm:h-9" onClick={() => onDelete(message)} disabled={!canManage}>
          <Trash2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
