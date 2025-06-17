"use client";

import { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useStoredTokens } from '@/lib/localStorage';
import type { ChatUserInfoFormData, TelegramChat, ChatMember } from '@/lib/types';
import { getChatAction, getChatMemberAction, getChatAdministratorsAction } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search } from "lucide-react";
import { Label } from "@/components/ui/label"; // Added Label

const chatUserInfoFormSchema = z.object({
  tokenId: z.string().min(1, "Please select a bot token."),
  operation: z.enum(['getChat', 'getChatMember', 'getChatAdministrators'], {
    required_error: "Please select an operation.",
  }),
  targetId: z.string().min(1, "Target ID (User or Chat) is required."),
  secondaryId: z.string().optional(),
}).refine(data => {
  if (data.operation === 'getChatMember' && (!data.secondaryId || data.secondaryId.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: "User ID is required for fetching chat member details.",
  path: ["secondaryId"],
});

type ChatUserInfoFormValues = z.infer<typeof chatUserInfoFormSchema>;

export default function ChatUserInfoPage() {
  const { tokens, isLoading: isLoadingTokens } = useStoredTokens();
  const { toast } = useToast();
  const [isFetching, setIsFetching] = useState(false);
  const [resultData, setResultData] = useState<TelegramChat | ChatMember | ChatMember[] | null>(null);
  const [currentOperation, setCurrentOperation] = useState<ChatUserInfoFormValues['operation'] | undefined>(undefined);
  const [botSearchTerm, setBotSearchTerm] = useState(''); // New state for bot search


  const form = useForm<ChatUserInfoFormValues>({
    resolver: zodResolver(chatUserInfoFormSchema),
    defaultValues: {
      tokenId: "",
      targetId: "",
      secondaryId: "",
    },
  });
  
  const watchedOperation = form.watch("operation");

  async function onSubmit(data: ChatUserInfoFormValues) {
    setIsFetching(true);
    setResultData(null);
    setCurrentOperation(data.operation);

    const tokenToUse = tokens.find(t => t.id === data.tokenId)?.token;
    if (!tokenToUse) {
      toast({ title: "Token Error", description: "Selected bot token not found.", variant: "destructive" });
      setIsFetching(false);
      return;
    }

    let result;
    switch (data.operation) {
      case 'getChat':
        result = await getChatAction(tokenToUse, data.targetId);
        break;
      case 'getChatMember':
        // SecondaryId is guaranteed by zod refinement if operation is getChatMember
        result = await getChatMemberAction(tokenToUse, data.targetId, data.secondaryId!);
        break;
      case 'getChatAdministrators':
        result = await getChatAdministratorsAction(tokenToUse, data.targetId);
        break;
      default:
        toast({ title: "Invalid Operation", variant: "destructive" });
        setIsFetching(false);
        return;
    }
    setIsFetching(false);

    if (result.success && result.data) {
      setResultData(result.data);
      toast({ title: "Information Fetched", description: "Data retrieved successfully." });
    } else {
      toast({ title: "Failed to Fetch Information", description: result.error, variant: "destructive" });
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

  const getOperationLabel = (op: ChatUserInfoFormValues['operation'] | undefined) => {
    if (!op) return "Details";
    switch(op) {
        case "getChat": return "User/Chat Details";
        case "getChatMember": return "Chat Member Details";
        case "getChatAdministrators": return "Chat Administrators";
        default: return "Details";
    }
  };

  if (isLoadingTokens) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading tokens...</p></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Chat & User Information</h1>
        <p className="text-muted-foreground">
          Fetch details about Telegram users, chats (groups/channels), chat members, or administrators.
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Query Telegram Info</CardTitle>
          <CardDescription>Select a bot, operation, and provide the required ID(s).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-6">
            <Label htmlFor="bot-search-chatinfo">Search Bot (ID, Username, Name, Token)</Label>
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                id="bot-search-chatinfo"
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
                    <FormLabel>Query with Bot</FormLabel>
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
                            {tokens.length > 0 ? "No bots match your search." : "No bots available."}
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
                name="operation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operation</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select operation type..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="getChat">User/Chat Details</SelectItem>
                        <SelectItem value="getChatMember">Chat Member Details</SelectItem>
                        <SelectItem value="getChatAdministrators">Chat Administrators</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="targetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {watchedOperation === 'getChatMember' || watchedOperation === 'getChatAdministrators' 
                        ? 'Chat ID' 
                        : 'User ID or Chat ID'}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={
                        watchedOperation === 'getChatMember' || watchedOperation === 'getChatAdministrators' 
                        ? "Enter Chat ID (e.g., -100123... or @channelusername)" 
                        : "Enter User ID (e.g., 123456789) or Chat ID / @username"
                        } {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedOperation === 'getChatMember' && (
                <FormField
                  control={form.control}
                  name="secondaryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User ID (for Chat Member)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter User ID of the member" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <Button type="submit" disabled={isFetching || tokens.length === 0} className="w-full">
                {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Search className="mr-2 h-4 w-4" />
                Fetch Information
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {resultData && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Results: {getOperationLabel(currentOperation)}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] max-h-[60vh] p-1 border rounded-md bg-muted/30">
              <pre className="text-sm p-4">{JSON.stringify(resultData, null, 2)}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
