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

  // Filter tokens for the select dropdown
  const filteredTokensForSelect = tokens.filter(token => {
    const botUsername = token.botInfo?.username?.toLowerCase() || '';
    const tokenId = token.id.toLowerCase();
    const search = botSearchTerm.toLowerCase();
    return botUsername.includes(search) || tokenId.includes(search);
  });

  if (isLoadingTokens) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Loading tokens...</p></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Bot Settings</h1>
        <p className="text-muted-foreground">
          Manage your bot's commands and other settings provided by Telegram.
        </p>
      </div>

      {/* Bot Info Card */}
      {selectedBotDetails && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <InfoIcon className="h-5 w-5 mr-2 text-blue-500" /> Bot Information: {selectedBotDetails.botInfo?.username || selectedBotDetails.id}
            </CardTitle>
            <CardDescription>Details for the currently selected bot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Bot Name:</strong> {selectedBotDetails.botInfo?.first_name || 'N/A'}</p>
            <p><strong>Username:</strong> @{selectedBotDetails.botInfo?.username || 'N/A'}</p>
            <p><strong>Bot ID:</strong> {selectedBotDetails.botInfo?.id || 'N/A'}</p>
            <p><strong>Can Join Groups:</strong> {selectedBotDetails.botInfo?.can_join_groups ? 'Yes' : 'No'}</p>
            <p><strong>Can Read All Group Messages:</strong> {selectedBotDetails.botInfo?.can_read_all_group_messages ? 'Yes' : 'No'}</p>
            <p><strong>Supports Inline Queries:</strong> {selectedBotDetails.botInfo?.supports_inline_queries ? 'Yes' : 'No'}</p>
            <p><strong>Token ID (Internal):</strong> {selectedBotDetails.id}</p>
            {selectedBotDetails.webhookStatus && (
                <p><strong>Webhook Status:</strong> <Badge variant={selectedBotDetails.webhookStatus === 'set' ? 'default' : selectedBotDetails.webhookStatus === 'unset' ? 'outline' : 'destructive'}>{selectedBotDetails.webhookStatus}</Badge></p>
            )}
            {selectedBotDetails.lastWebhookSetAttempt && (
                <p><strong>Last Webhook Activity:</strong> {new Date(selectedBotDetails.lastWebhookSetAttempt).toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Manage Bot Commands</CardTitle>
          <CardDescription>View, set, or delete the list of commands your bot offers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="tokenId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Bot</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        const tokenDetails = tokens.find(t => t.id === value);
                        setSelectedBotDetails(tokenDetails || null);
                        if (tokenDetails && !tokenDetails.botInfo) { // Fetch if botInfo is missing
                            fetchAndStoreBotInfo(tokenDetails.token, tokenDetails.id);
                        }
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a bot token..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="p-2">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                              type="search"
                              placeholder="Search bots..."
                              value={botSearchTerm}
                              onChange={(e) => {
                                e.stopPropagation(); // Prevent select from closing
                                setBotSearchTerm(e.target.value);
                              }}
                              className="pl-8 w-full mb-1"
                            />
                          </div>
                        </div>
                        {isLoadingTokens ? (
                          <SelectItem value="loading" disabled>Loading tokens...</SelectItem>
                        ) : filteredTokensForSelect.length === 0 ? (
                          <SelectItem value="notfound" disabled>No bots found matching "{botSearchTerm}".</SelectItem>
                        ) : (
                          <ScrollArea className="h-[200px]">
                          {filteredTokensForSelect.map(token => (
                            <SelectItem key={token.id} value={token.id}>
                              {token.botInfo?.username || token.id}
                            </SelectItem>
                          ))}
                          </ScrollArea>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

      {selectedTokenForDisplay && currentCommands !== null && (
        <Card className="mt-6 max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                <span>Current Commands for {botUsernameForDisplay || "Selected Bot"}</span>
                 <Button variant="ghost" size="sm" onClick={() => handleFetchCommands(selectedTokenForDisplay)} disabled={isProcessing}>
                    <RefreshCw className={`mr-1 h-4 w-4 ${isProcessing && form.getValues("tokenId") === selectedTokenForDisplay ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
                </CardTitle>
                <CardDescription>
                {currentCommands.length > 0 ? `This bot has ${currentCommands.length} command(s) registered.` : "This bot currently has no commands registered."}
                </CardDescription>
            </CardHeader>
            {currentCommands.length > 0 && (
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
  );
}
