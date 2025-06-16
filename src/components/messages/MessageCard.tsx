"use client";

import type { TelegramMessage, TelegramPhotoSize } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, Video, Download, Reply, Bot } from "lucide-react";
import { format, fromUnixTime } from 'date-fns';
import Image from "next/image";

interface MessageCardProps {
  message: TelegramMessage;
  onReply: (message: TelegramMessage) => void;
  onDownloadFile?: (fileId: string, fileName: string | undefined, token?: string) => void; // Token might be needed if stored per message
}

function getInitials(name: string = "") {
  const parts = name.split(" ");
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Function to find the largest photo
const getLargestPhoto = (photos?: TelegramPhotoSize[]): TelegramPhotoSize | undefined => {
  if (!photos || photos.length === 0) return undefined;
  return photos.reduce((largest, current) => (current.width * current.height > largest.width * largest.height ? current : largest));
};

// Placeholder for generating file URL - in real app this would hit an API endpoint
const getFilePreviewUrl = (fileId: string, token: string | undefined) => {
  if(!token) return "https://placehold.co/100x100.png?text=No+Token"; // Fallback if token not available
  // This is a conceptual URL, actual display of images/videos requires fetching via /getFile and then the file itself
  // For preview, it's complex without a backend to serve the image. Using placeholder.
  // A real solution might involve an API route like /api/file-preview?file_id=...&token=...
  return `https://placehold.co/200x150.png?text=FilePreview`;
};


export function MessageCard({ message, onReply, onDownloadFile }: MessageCardProps) {
  const senderName = message.from?.first_name ? `${message.from.first_name} ${message.from.last_name || ''}`.trim() : (message.from?.username || 'Unknown User');
  const chatTitle = message.chat.title || message.chat.username || message.chat.first_name || 'Unknown Chat';
  const largestPhoto = getLargestPhoto(message.photo);

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader className="flex flex-row items-start space-x-3 p-4">
        <Avatar className="h-10 w-10 border">
          {/* Future: Could try to fetch user profile photo if available */}
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
            in {chatTitle} &bull; {format(fromUnixTime(message.date), 'PP pp')}
          </p>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {message.text && <p className="text-sm whitespace-pre-wrap">{message.text}</p>}
        {message.caption && <p className="text-sm italic text-muted-foreground whitespace-pre-wrap">Caption: {message.caption}</p>}

        {largestPhoto && (
          <div className="mt-2">
             {/* Using placeholder due to complexity of serving actual Telegram images directly */}
            <Image 
              src={getFilePreviewUrl(largestPhoto.file_id, message.sourceTokenId ? tokens.find(t => t.id === message.sourceTokenId)?.token : undefined)} 
              alt={message.caption || "Sent photo"} 
              width={200} height={150} 
              className="rounded-md border object-cover"
              data-ai-hint="photo message"
            />
          </div>
        )}
        {message.document && (
          <div className="flex items-center space-x-2 p-2 border rounded-md bg-secondary/30">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm flex-1 truncate">{message.document.file_name || 'Document'}</span>
            {onDownloadFile && message.sourceTokenId && (
              <Button size="sm" variant="outline" onClick={() => onDownloadFile(message.document!.file_id, message.document!.file_name, message.sourceTokenId)}>
                <Download className="mr-1 h-4 w-4" /> Download
              </Button>
            )}
          </div>
        )}
         {message.video && (
          <div className="flex items-center space-x-2 p-2 border rounded-md bg-secondary/30">
            <Video className="h-5 w-5 text-primary" />
            <span className="text-sm flex-1 truncate">{message.video.file_name || 'Video'}</span>
             {onDownloadFile && message.sourceTokenId && (
              <Button size="sm" variant="outline" onClick={() => onDownloadFile(message.video!.file_id, message.video!.file_name, message.sourceTokenId)}>
                <Download className="mr-1 h-4 w-4" /> Download
              </Button>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="px-4 py-3 border-t">
        <Button variant="ghost" size="sm" onClick={() => onReply(message)}>
          <Reply className="mr-1 h-4 w-4" /> Reply
        </Button>
      </CardFooter>
    </Card>
  );
}
