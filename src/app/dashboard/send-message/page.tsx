"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useStoredTokens } from '@/lib/localStorage';
import type { MessageType } from '@/lib/types'; 
import { sendMessageAction, sendPhotoAction, sendDocumentAction, sendVideoAction } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, SendHorizontal, Paperclip, Search } from "lucide-react"; // Added Search
import { useState, useRef } from "react";

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const sendMessageFormSchema = z.object({
  tokenId: z.string().min(1, "Please select a bot token."),
  chatId: z.string().min(1, "Chat ID is required."),
  messageType: z.custom<MessageType>(val => ['Text', 'Photo', 'Document', 'Video'].includes(val as string), {
    message: "Please select a message type.",
  }),
  text: z.string().max(4096, "Text/caption is too long.").optional(),
  mediaFile: z.custom<File>(val => val instanceof File, "Please select a file.").optional(),
  replyToMessageId: z.string().optional(),
  parseMode: z.enum(['MarkdownV2', 'HTML', 'Markdown']).optional(),
}).refine(data => {
  if (data.messageType === 'Text') {
    return !!data.text && data.text.trim() !== "";
  }
  return true;
}, {
  message: "Message text cannot be empty for Text type.",
  path: ["text"],
}).refine(data => {
  if (data.messageType !== 'Text') {
    return !!data.mediaFile;
  }
  return true;
}, {
  message: "A file is required for Photo, Document, or Video types.",
  path: ["mediaFile"],
}).refine(data => {
    if (data.mediaFile && data.mediaFile.size > MAX_FILE_SIZE_BYTES) {
        return false;
    }
    return true;
}, {
    message: `File size must be less than ${MAX_FILE_SIZE_MB} MB.`,
    path: ["mediaFile"],
});

type SendMessageFormValues = z.infer<typeof sendMessageFormSchema>;

export default function SendMessagePage() {
  const { tokens, isLoading: isLoadingTokens } = useStoredTokens();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [enableMarkdown, setEnableMarkdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null); // Made current mutable
  const [botSearchTerm, setBotSearchTerm] = useState(''); // New state for bot search

  const form = useForm<SendMessageFormValues>({
    resolver: zodResolver(sendMessageFormSchema),
    defaultValues: {
      tokenId: "",
      chatId: "",
      messageType: "Text" as MessageType, // Explicit type
      text: "",
      mediaFile: undefined, // Explicitly undefined
      replyToMessageId: "",
      parseMode: undefined, // Explicitly undefined
    },
  });
  
  const watchedMessageType = form.watch("messageType");

  async function onSubmit(data: SendMessageFormValues) {
    setIsSending(true);
    const tokenToUse = tokens.find(t => t.id === data.tokenId)?.token;
    if (!tokenToUse) {
      toast({ title: "Token Error", description: "Selected bot token not found.", variant: "destructive" });
      setIsSending(false);
      return;
    }

    let result;
    const formData = new FormData();
    formData.append('token', tokenToUse);
    formData.append('chatId', data.chatId);
    if (data.replyToMessageId) formData.append('replyToMessageId', data.replyToMessageId);
    if (enableMarkdown && data.parseMode) formData.append('parseMode', data.parseMode);

    if (data.messageType === 'Text') {
      if (!data.text) { // Should be caught by Zod, but as a safeguard
        toast({ title: "Input Error", description: "Text message cannot be empty.", variant: "destructive" });
        setIsSending(false);
        return;
      }
      result = await sendMessageAction({
        token: tokenToUse,
        chatId: data.chatId,
        text: data.text,
        replyToMessageId: data.replyToMessageId || undefined,
        parseMode: enableMarkdown ? data.parseMode || 'MarkdownV2' : undefined,
      });
    } else if (data.mediaFile) {
      formData.append(data.messageType.toLowerCase(), data.mediaFile);
      if (data.text) formData.append('caption', data.text); // Text is caption for media

      switch (data.messageType) {
        case 'Photo':
          result = await sendPhotoAction(formData);
          break;
        case 'Document':
          result = await sendDocumentAction(formData);
          break;
        case 'Video':
          result = await sendVideoAction(formData);
          break;
        default:
          toast({ title: "Invalid Message Type", variant: "destructive" });
          setIsSending(false);
          return;
      }
    } else {
      toast({ title: "File Missing", description: `A file is required for ${data.messageType} type.`, variant: "destructive" });
      setIsSending(false);
      return;
    }

    setIsSending(false);

    if (result.success) {
      toast({ title: "Message Sent", description: "Your message has been sent successfully." });
      form.resetField("text");
      if (data.messageType !== 'Text') form.resetField("mediaFile");
      if (fileInputRef.current) fileInputRef.current.value = ""; // Clear file input
    } else {
      toast({ title: "Failed to Send Message", description: result.error, variant: "destructive" });
    }
  }

  const filteredTokens = tokens.filter(token => {
    const searchTermLower = botSearchTerm.toLowerCase();
    return (
      token.id.toLowerCase().includes(searchTermLower) ||
      (token.botInfo?.username && token.botInfo.username.toLowerCase().includes(searchTermLower)) ||
      (token.botInfo?.first_name && token.botInfo.first_name.toLowerCase().includes(searchTermLower)) ||
      (token.token && token.token.toLowerCase().includes(searchTermLower))
    );
  });

  if (isLoadingTokens) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading tokens...</p></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Send Message or Media</h1>
        <p className="text-muted-foreground">
          Compose and send text messages, photos, documents, or videos using one of your configured bots.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Compose Message</CardTitle>
          <CardDescription>Select a bot, recipient, message type, and content.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-6">
            <Label htmlFor="bot-search-sendmessage">Search Bot (ID, Username, Name, Token)</Label>
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                id="bot-search-sendmessage"
                placeholder="Enter bot ID, username, name, or part of token..."
                value={botSearchTerm}
                onChange={(e) => setBotSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="tokenId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Send with Bot</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={tokens.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingTokens ? "Loading bots..." : (tokens.length === 0 ? "No bots found. Add tokens first." : "Select a bot")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingTokens ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : filteredTokens.length > 0 ? (
                          filteredTokens.map(token => (
                            <SelectItem key={token.id} value={token.id}>
                              {token.botInfo?.username ? `${token.botInfo.username} (${token.botInfo.first_name || 'N/A'})` : `Bot ID: ${token.id.substring(0, 8)}...`}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="notfound" disabled>
                            {botSearchTerm ? "No bots match your search." : (tokens.length === 0 ? "No bots found. Add tokens first." : "No bots available.")}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chatId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chat ID or Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Chat ID (e.g., 123456789) or @username" {...field} />
                    </FormControl>
                    <FormDescription>Can be a user ID, group ID, channel ID, or @channelusername.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="messageType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Type</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value as MessageType);
                      form.resetField("mediaFile"); // Use resetField
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select message type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Text">Text</SelectItem>
                        <SelectItem value="Photo">Photo</SelectItem>
                        <SelectItem value="Document">Document</SelectItem>
                        <SelectItem value="Video">Video</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {watchedMessageType !== "Text" && (
                <FormField
                  control={form.control}
                  name="mediaFile"
                  render={({ field: { onChange, onBlur, name, ref: fieldRefFn } }) => ( // Removed value from destructuring as it's not directly used here
                    <FormItem>
                      <FormLabel>Media File ({watchedMessageType})</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          onBlur={onBlur}
                          name={name}
                          onChange={(e) => {
                            onChange(e.target.files ? e.target.files[0] : undefined);
                          }} 
                          ref={(instance: HTMLInputElement | null) => { // Added type for instance
                            fieldRefFn(instance);
                            if (fileInputRef) { // Keep this check as fileInputRef could be null during initial renders or if not properly managed by React
                                fileInputRef.current = instance;
                            }
                          }}
                          accept={ // Corrected syntax for accept prop
                            watchedMessageType === 'Photo' ? 'image/*' :
                            watchedMessageType === 'Video' ? 'video/*' :
                            undefined /* all for document */
                          }
                        />
                      </FormControl>
                      <FormDescription>Max file size: {MAX_FILE_SIZE_MB}MB. The file will be uploaded when you click send.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{watchedMessageType === "Text" ? "Message Text" : "Caption (Optional)"}</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder={watchedMessageType === "Text" ? "Type your message here..." : "Type your caption here..."}
                        className="min-h-[100px]" 
                        {...field} 
                       />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center space-x-2">
                <Checkbox
                    id="enable-markdown"
                    checked={enableMarkdown}
                    onCheckedChange={(checked) => {
                      setEnableMarkdown(Boolean(checked));
                      if (Boolean(checked)) {
                        form.setValue('parseMode', 'MarkdownV2'); // This should be fine now with explicit defaultValues
                      } else {
                        form.resetField('parseMode'); // Use resetField
                      }
                    }}
                />
                <Label htmlFor="enable-markdown" className="text-sm font-normal">
                    Enable Parse Mode
                </Label>
              </div>
              
              {enableMarkdown && (
                 <FormField
                    control={form.control}
                    name="parseMode"
                    render={({ field }) => (
                    <FormItem className="mt-2">
                        <FormLabel>Parse Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || 'MarkdownV2'}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select parse mode..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="MarkdownV2">MarkdownV2</SelectItem>
                            <SelectItem value="HTML">HTML</SelectItem>
                            <SelectItem value="Markdown">Markdown (Legacy)</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormDescription>Note: Ensure your text/caption adheres to the selected formatting rules.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}


              <FormField
                control={form.control}
                name="replyToMessageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reply to Message ID (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter message ID to reply to" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={isSending || tokens.length === 0} className="w-full">
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {watchedMessageType !== "Text" ? <Paperclip className="mr-2 h-4 w-4" /> : <SendHorizontal className="mr-2 h-4 w-4" /> }
                Send {watchedMessageType}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
