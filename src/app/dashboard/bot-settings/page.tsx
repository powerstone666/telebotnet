"use client";

import { useState, useEffect } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useStoredTokens } from '@/lib/localStorage';
import type { BotCommand, StoredToken } from '@/lib/types'; // Added StoredToken
import { getMyCommandsAction, setMyCommandsAction, deleteMyCommandsAction, getBotInfoAction } from './actions'; // Added getBotInfoAction
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ListChecks, Settings, Trash2, RefreshCw, Search, InfoIcon } from "lucide-react"; // Added Search and InfoIcon
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from "@/components/ui/input"; // Added Input
import { Reply } from "lucide-react"; // Import Reply icon
import { Label } from "@/components/ui/label"; // Added Label


const botCommandsFormSchema = z.object({
  tokenId: z.string().min(1, "Please select a bot token."),
  commandsJson: z.string().refine((val) => {
    if (!val.trim()) return true; // Allow empty to clear commands via setMyCommands with empty array
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) return false;
      return parsed.every(cmd => 
        typeof cmd === 'object' && 
        cmd !== null &&
        typeof cmd.command === 'string' && 
        cmd.command.length > 0 && cmd.command.length <= 32 &&
        /^[a-z0-9_]+$/.test(cmd.command) && // Telegram command format
        typeof cmd.description === 'string' &&
        cmd.description.length > 0 && cmd.description.length <= 256
      );
    } catch (e) {
      return false;
    }
  }, {
    message: "Invalid JSON format or command structure. Commands must be 1-32 chars (a-z, 0-9, _). Descriptions 1-256 chars.",
  }),
});

type BotCommandsFormValues = z.infer<typeof botCommandsFormSchema>;

const defaultCommandsExample = JSON.stringify([
  { command: "start", description: "Start interacting with the bot" },
  { command: "help", description: "Show help message" }
], null, 2);

export default function BotSettingsPage() {
  const { tokens, isLoading: isLoadingTokens, updateToken } = useStoredTokens(); // Added updateToken
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCommands, setCurrentCommands] = useState<BotCommand[] | null>(null);
  const [selectedTokenForDisplay, setSelectedTokenForDisplay] = useState<string>("");
  const [botSearchTerm, setBotSearchTerm] = useState(''); // New state for bot search
  const [selectedBotDetails, setSelectedBotDetails] = useState<StoredToken | null>(null); // New state for selected bot details

  const filteredTokens = tokens.filter(token => {
    const searchTermLower = botSearchTerm.toLowerCase();
    return (
      token.id.toLowerCase().includes(searchTermLower) ||
      (token.botInfo?.username && token.botInfo.username.toLowerCase().includes(searchTermLower)) ||
      (token.botInfo?.first_name && token.botInfo.first_name.toLowerCase().includes(searchTermLower)) ||
      (token.token && token.token.toLowerCase().includes(searchTermLower))
    );
  });

  const form = useForm<BotCommandsFormValues>({
    resolver: zodResolver(botCommandsFormSchema),
    defaultValues: {
      tokenId: "",
      commandsJson: "",
    },
  });

  const handleFetchCommands = async (tokenId?: string) => {
    const tokenToUseId = tokenId || form.getValues("tokenId");
    if (!tokenToUseId) {
      toast({ title: "Token Error", description: "Please select a bot token first.", variant: "destructive" });
      return;
    }
    const token = tokens.find(t => t.id === tokenToUseId)?.token;
    if (!token) {
      toast({ title: "Token Error", description: "Selected bot token not found.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setSelectedTokenForDisplay(tokenToUseId); // For display card header
    const result = await getMyCommandsAction(token);
    setIsProcessing(false);

    if (result.success && result.data) {
      setCurrentCommands(result.data);
      form.setValue("commandsJson", result.data.length > 0 ? JSON.stringify(result.data, null, 2) : "");
      toast({ title: "Commands Fetched", description: `Current commands for ${tokens.find(t=>t.id === tokenToUseId)?.botInfo?.username || 'bot'} loaded.` });
      // Fetch and update bot info when commands are fetched for a selected bot
      const currentToken = tokens.find(t => t.id === tokenToUseId);
      if (currentToken && !currentToken.botInfo) { // Fetch if botInfo is missing
        fetchAndStoreBotInfo(currentToken.token, currentToken.id);
      }
      setSelectedBotDetails(currentToken || null);
    } else {
      setCurrentCommands(null);
      form.setValue("commandsJson", "");
      toast({ title: "Failed to Fetch Commands", description: result.error, variant: "destructive" });
    }
  };
  
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "tokenId" && value.tokenId) {
        handleFetchCommands(value.tokenId);
        const currentTokenDetails = tokens.find(t => t.id === value.tokenId);
        setSelectedBotDetails(currentTokenDetails || null);
        if (currentTokenDetails && !currentTokenDetails.botInfo) {
            fetchAndStoreBotInfo(currentTokenDetails.token, currentTokenDetails.id);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, tokens]);

  // Function to fetch and store bot info
  const fetchAndStoreBotInfo = async (token: string, tokenId: string) => {
    const botInfoResult = await getBotInfoAction(token);
    if (botInfoResult.success && botInfoResult.data) {
      updateToken(tokenId, { botInfo: botInfoResult.data });
      // If this is the currently selected bot for display, update its details
      if (selectedTokenForDisplay === tokenId) {
        const updatedToken = tokens.find(t => t.id === tokenId);
        setSelectedBotDetails(updatedToken || null);
      }
    } else {
      console.warn(`Failed to fetch bot info for token ID ${tokenId}: ${botInfoResult.error}`);
    }
  };


  async function onSubmit(data: BotCommandsFormValues) {
    setIsProcessing(true);
    const tokenToUse = tokens.find(t => t.id === data.tokenId)?.token;
    if (!tokenToUse) {
      toast({ title: "Token Error", description: "Selected bot token not found.", variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    let commandsToSet: BotCommand[] = [];
    if (data.commandsJson.trim() !== "") {
        try {
            commandsToSet = JSON.parse(data.commandsJson);
        } catch (e) {
            toast({ title: "Invalid JSON", description: "Commands JSON is malformed.", variant: "destructive" });
            setIsProcessing(false);
            return;
        }
    }
    

    const result = await setMyCommandsAction(tokenToUse, commandsToSet);
    setIsProcessing(false);

    if (result.success) {
      toast({ title: "Commands Updated", description: "Bot commands have been set successfully." });
      await handleFetchCommands(data.tokenId); // Refresh current commands
    } else {
      toast({ title: "Failed to Set Commands", description: result.error, variant: "destructive" });
    }
  }

  const handleDeleteAllCommands = async () => {
    const tokenId = form.getValues("tokenId");
    if (!tokenId) {
      toast({ title: "Token Error", description: "Please select a bot token first.", variant: "destructive" });
      return;
    }
    const tokenToUse = tokens.find(t => t.id === tokenId)?.token;
    if (!tokenToUse) {
      toast({ title: "Token Error", description: "Selected bot token not found.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const result = await deleteMyCommandsAction(tokenToUse);
    setIsProcessing(false);

    if (result.success) {
      toast({ title: "Commands Deleted", description: "All bot commands have been successfully deleted." });
      setCurrentCommands([]);
      form.setValue("commandsJson", "");
    } else {
      toast({ title: "Failed to Delete Commands", description: result.error, variant: "destructive" });
    }
  };
  
  const botUsernameForDisplay = selectedBotDetails?.botInfo?.username || tokens.find(t => t.id === selectedTokenForDisplay)?.botInfo?.username;
  const botFirstNameForDisplay = selectedBotDetails?.botInfo?.first_name; // Corrected: firstName to first_name
  const botIdForDisplay = selectedBotDetails?.id;


  return (
    <ScrollArea className="h-full p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center">
              <Settings className="mr-2 h-6 w-6" /> Bot Command Settings
            </h1>
            <p className="text-muted-foreground">
              Manage commands for your Telegram bots. Select a bot, view, set, or delete its commands.
            </p>
          </div>
          {selectedBotDetails && (
             <Button variant="outline" size="sm" onClick={() => handleFetchCommands(selectedBotDetails.id)} disabled={isProcessing || isLoadingTokens}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                Refresh Commands & Info
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Bot & Configure Commands</CardTitle>
            <CardDescription>
              Choose a bot to manage its command list. You can view existing commands, update them, or delete all commands.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bot-search">Search Bot (ID, Username, Name, Token)</Label>
              <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="bot-search"
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
                      <FormLabel>Bot Token</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          // setSelectedTokenForDisplay(value); // This is handled by useEffect now
                          // const tokenDetails = tokens.find(t => t.id === value);
                          // setSelectedBotDetails(tokenDetails || null);
                          // if (tokenDetails && !tokenDetails.botInfo) {
                          //   fetchAndStoreBotInfo(tokenDetails.token, tokenDetails.id);
                          // }
                        }}
                        defaultValue={field.value}
                        disabled={isLoadingTokens || tokens.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingTokens ? "Loading bots..." : (tokens.length === 0 ? "No bots found. Add tokens first." : "Select a bot")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingTokens ? (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          ) : filteredTokens.length > 0 ? (
                            filteredTokens.map((token) => (
                              <SelectItem key={token.id} value={token.id}>
                                {token.botInfo?.username ? `${token.botInfo.username} (${token.botInfo.first_name || 'N/A'})` : `Bot ID: ${token.id.substring(0, 8)}...`} {/* Corrected: firstName to first_name */}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-bots" disabled>
                              {botSearchTerm ? "No bots match your search." : (tokens.length === 0 ? "No bots found. Add tokens first." : "No bots available.")}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the bot you want to configure.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedBotDetails && (
                  <Card className="mt-4 bg-secondary/50">
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-lg flex items-center">
                        <InfoIcon className="mr-2 h-5 w-5 text-primary" />
                        Bot Details: {selectedBotDetails.botInfo?.username || "(Username not fetched yet)"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1 pb-4">
                      <p><strong>Username:</strong> {selectedBotDetails.botInfo?.username || "N/A"}</p>
                      <p><strong>First Name:</strong> {selectedBotDetails.botInfo?.first_name || "N/A"}</p> {/* Corrected: firstName to first_name */}
                      <p><strong>ID:</strong> {selectedBotDetails.botInfo?.id || "N/A"}</p>
                      <p><strong>Token ID (internal):</strong> {selectedBotDetails.id}</p>
                      <p><strong>Can Join Groups:</strong> {selectedBotDetails.botInfo?.can_join_groups ? 'Yes' : 'No'}</p> {/* Corrected: canJoinGroups to can_join_groups */}
                      <p><strong>Can Read All Group Messages:</strong> {selectedBotDetails.botInfo?.can_read_all_group_messages ? 'Yes' : 'No'}</p> {/* Corrected: canReadAllGroupMessages to can_read_all_group_messages */}
                      <p><strong>Supports Inline Queries:</strong> {selectedBotDetails.botInfo?.supports_inline_queries ? 'Yes' : 'No'}</p> {/* Corrected: supportsInlineQueries to supports_inline_queries */}
                    </CardContent>
                  </Card>
                )}

                <FormField
                  control={form.control}
                  name="commandsJson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commands (JSON format)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={defaultCommandsExample}
                          className="min-h-[150px] font-mono text-xs" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Enter commands as a JSON array. Example: [{"{\"command\":\"help\",\"description\":\"Get help\"}"}].
                        Max 100 commands. Command: 1-32 chars (a-z, 0-9, _). Description: 1-256 chars.
                        An empty array or empty input will clear commands.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button type="submit" disabled={isProcessing || !form.getValues("tokenId")} className="w-full">
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Settings className="mr-2 h-4 w-4" />
                    Set Commands
                  </Button>
                   <Button type="button" variant="destructive" onClick={handleDeleteAllCommands} disabled={isProcessing || !form.getValues("tokenId")} className="w-full">
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All Commands
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {selectedTokenForDisplay && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ListChecks className="mr-2 h-6 w-6" />
                Current Commands for {botUsernameForDisplay || `Bot ID: ${selectedTokenForDisplay.substring(0,8)}...`}
              </CardTitle>
              <CardDescription>
                These are the commands currently set for the selected bot.
                {botFirstNameForDisplay && ` (Name: ${botFirstNameForDisplay})`}
                {botIdForDisplay && ` (Bot User ID: ${botIdForDisplay})`}
              </CardDescription>
            </CardHeader>
            {currentCommands && (
              <CardContent>
                  <ScrollArea className="h-[200px] p-1 border rounded-md">
                      <ul className="space-y-1 p-2">
                      {currentCommands.map(cmd => (
                          <li key={cmd.command} className="text-sm flex items-center">
                              <Badge variant="secondary" className="mr-2">/{cmd.command}</Badge> 
                              <span className="text-muted-foreground">{cmd.description}</span>
                          </li>
                      ))}
                      </ul>
                  </ScrollArea>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
