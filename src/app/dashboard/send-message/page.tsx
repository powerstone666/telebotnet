"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { useToast } from "@/hooks/use-toast";
import { useStoredTokens } from '@/lib/localStorage';
import type { SendMessageFormData } from '@/lib/types';
import { sendMessageAction } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, SendHorizonal } from "lucide-react";
import { useState } from "react";

const sendMessageFormSchema = z.object({
  tokenId: z.string().min(1, "Please select a bot token."),
  chatId: z.string().min(1, "Chat ID is required."),
  text: z.string().min(1, "Message text cannot be empty.").max(4096, "Message is too long."),
  replyToMessageId: z.string().optional(),
  parseMode: z.enum(['MarkdownV2', 'HTML', 'Markdown']).optional(),
});

type SendMessageFormValues = z.infer<typeof sendMessageFormSchema>;

export default function SendMessagePage() {
  const { tokens, isLoading: isLoadingTokens } = useStoredTokens();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [enableMarkdown, setEnableMarkdown] = useState(false);

  const form = useForm<SendMessageFormValues>({
    resolver: zodResolver(sendMessageFormSchema),
    defaultValues: {
      tokenId: "",
      chatId: "",
      text: "",
      replyToMessageId: "",
    },
  });
  
  async function onSubmit(data: SendMessageFormValues) {
    setIsSending(true);
    const tokenToUse = tokens.find(t => t.id === data.tokenId)?.token;
    if (!tokenToUse) {
      toast({ title: "Token Error", description: "Selected bot token not found.", variant: "destructive" });
      setIsSending(false);
      return;
    }

    const payload = {
        token: tokenToUse,
        chatId: data.chatId,
        text: data.text,
        replyToMessageId: data.replyToMessageId || undefined,
        parseMode: enableMarkdown ? 'MarkdownV2' : undefined, // Default to MarkdownV2 if enabled
    };

    const result = await sendMessageAction(payload);
    setIsSending(false);

    if (result.success) {
      toast({ title: "Message Sent", description: "Your message has been sent successfully." });
      form.resetField("text"); // Keep token and chat ID
    } else {
      toast({ title: "Failed to Send Message", description: result.error, variant: "destructive" });
    }
  }

  if (isLoadingTokens) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading tokens...</p></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Send Message</h1>
        <p className="text-muted-foreground">
          Compose and send messages to any chat using one of your configured bots.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Compose Message</CardTitle>
          <CardDescription>Select a bot, specify the recipient, and write your message.</CardDescription>
        </CardHeader>
        <CardContent>
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
                          <SelectValue placeholder={tokens.length === 0 ? "No tokens available" : "Select a bot token..."} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tokens.map(token => (
                          <SelectItem key={token.id} value={token.id}>
                            {token.botInfo?.username || `Token ID: ${token.id}`}
                          </SelectItem>
                        ))}
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
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Text</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Type your message here..." className="min-h-[120px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center space-x-2">
                <Checkbox
                    id="enable-markdown"
                    checked={enableMarkdown}
                    onCheckedChange={(checked) => setEnableMarkdown(Boolean(checked))}
                />
                <Label htmlFor="enable-markdown" className="text-sm font-normal">
                    Enable MarkdownV2 formatting
                </Label>
              </div>


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
                <SendHorizonal className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
