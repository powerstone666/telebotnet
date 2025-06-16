
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StoredToken } from "@/lib/types";
import { Trash2, RefreshCw, Zap, ZapOff, AlertTriangle, HelpCircle, CheckCircle2, ExternalLink, CircleSlash } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO, isValid } from 'date-fns';
import { useState, useEffect } from 'react';

interface TokenTableProps {
  tokens: StoredToken[];
  onDeleteToken: (tokenId: string) => void;
  onRefreshInfo: (token: StoredToken) => Promise<void>;
  isLoadingTokenMap: Record<string, boolean>;
}

const maskToken = (token: string) => {
  if (token.length < 10) return token;
  return `${token.substring(0, 6)}...${token.substring(token.length - 4)}`;
};

const WebhookStatusIndicator: React.FC<{ status: StoredToken['webhookStatus'], isCurrent: boolean | undefined, webhookUrl?: string | null }> = ({ status, isCurrent, webhookUrl }) => {
  let tooltipContent = "Webhook status";
  let badgeContent: React.ReactNode;

  switch (status) {
    case 'set':
      if (isCurrent) {
        badgeContent = <><CheckCircle2 className="mr-1 h-3 w-3" />Set (This App)</>;
        tooltipContent = `Webhook is set to this application's endpoint: ${webhookUrl || 'N/A'}`;
      } else {
        badgeContent = <><ExternalLink className="mr-1 h-3 w-3" />Set (External)</>;
        tooltipContent = `Webhook is set to an external URL: ${webhookUrl || 'N/A'}. This app won't receive updates.`;
      }
      return <Tooltip><TooltipTrigger asChild><Badge variant={isCurrent ? "default" : "secondary"} className={isCurrent ? "bg-green-500 hover:bg-green-600" : ""}>{badgeContent}</Badge></TooltipTrigger><TooltipContent><p>{tooltipContent}</p></TooltipContent></Tooltip>;
    case 'unset':
      badgeContent = <><ZapOff className="mr-1 h-3 w-3" />Unset</>;
      tooltipContent = "Webhook is not set for this bot.";
      return <Tooltip><TooltipTrigger asChild><Badge variant="outline">{badgeContent}</Badge></TooltipTrigger><TooltipContent><p>{tooltipContent}</p></TooltipContent></Tooltip>;
    case 'failed':
      badgeContent = <><AlertTriangle className="mr-1 h-3 w-3" />Check Failed</>;
      tooltipContent = "Failed to retrieve webhook information.";
      return <Tooltip><TooltipTrigger asChild><Badge variant="destructive">{badgeContent}</Badge></TooltipTrigger><TooltipContent><p>{tooltipContent}</p></TooltipContent></Tooltip>;
    case 'checking':
      badgeContent = <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Checking...</>;
      tooltipContent = "Currently checking webhook status...";
      return <Badge variant="outline">{badgeContent}</Badge>; // No tooltip needed for loading
    default: // unknown or undefined
      badgeContent = <><HelpCircle className="mr-1 h-3 w-3" />Unknown</>;
      tooltipContent = "Webhook status has not been determined yet. Try refreshing.";
      return <Tooltip><TooltipTrigger asChild><Badge variant="outline">{badgeContent}</Badge></TooltipTrigger><TooltipContent><p>{tooltipContent}</p></TooltipContent></Tooltip>;
  }
};


const FormattedLastActivityCell: React.FC<{ isoDateString?: string }> = ({ isoDateString }) => {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    if (isoDateString) {
      try {
        const date = parseISO(isoDateString);
        if (isValid(date)) {
          setFormattedDate(format(date, 'PP pp'));
        } else {
          setFormattedDate('Invalid date');
        }
      } catch (error) {
        console.error("Error formatting last activity date:", error);
        setFormattedDate('Invalid date');
      }
    } else {
      setFormattedDate('N/A');
    }
  }, [isoDateString]);

  if (formattedDate === null) {
    return <span className="text-muted-foreground">Loading...</span>;
  }
  if (formattedDate === 'N/A' || formattedDate === 'Invalid date') {
     return <span className="text-muted-foreground">{formattedDate}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{formattedDate}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isoDateString ? parseISO(isoDateString).toUTCString() : 'N/A'}</p>
      </TooltipContent>
    </Tooltip>
  );
};


export function TokenTable({ tokens, onDeleteToken, onRefreshInfo, isLoadingTokenMap }: TokenTableProps) {
  if (tokens.length === 0) {
    return <p className="text-muted-foreground mt-4 text-center">No tokens added yet. Add a token to get started.</p>;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mt-6 rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Bot Username</TableHead>
              <TableHead className="font-semibold">Token (Masked)</TableHead>
              <TableHead className="font-semibold">Webhook Status</TableHead>
              <TableHead className="font-semibold">Last Activity/Refresh</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((token) => (
              <TableRow key={token.id} className={token.botInfo === null ? "opacity-70" : ""}>
                <TableCell className="font-medium">
                    {token.botInfo?.username || (token.botInfo === null ? <span className="text-destructive italic">Invalid Token?</span> : 'N/A')}
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help font-mono text-xs">{maskToken(token.token)}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{token.token}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <WebhookStatusIndicator status={token.webhookStatus} isCurrent={token.isCurrentWebhook} webhookUrl={token.botInfo ? (token.botInfo as any).webhook_url : undefined /* Pass actual webhook URL if available */} />
                </TableCell>
                <TableCell>
                  <FormattedLastActivityCell isoDateString={token.lastActivity} />
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRefreshInfo(token)}
                        disabled={isLoadingTokenMap[token.id]}
                        aria-label={`Refresh ${token.botInfo?.username || 'token'}`}
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingTokenMap[token.id] ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Refresh Bot Info & Webhook Status</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteToken(token.id)}
                        className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        aria-label={`Delete ${token.botInfo?.username || 'token'}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Delete Token</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
