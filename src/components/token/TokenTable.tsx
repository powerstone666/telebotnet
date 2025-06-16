
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
import { Trash2, RefreshCw, Zap, ZapOff, AlertTriangle, HelpCircle, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO } from 'date-fns';
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

const WebhookStatusIndicator: React.FC<{ status: StoredToken['webhookStatus'], isCurrent: boolean | undefined }> = ({ status, isCurrent }) => {
  switch (status) {
    case 'set':
      return isCurrent ? 
        <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Set (Active)</Badge> :
        <Badge variant="secondary"><Zap className="mr-1 h-3 w-3" />Set (Other)</Badge>;
    case 'unset':
      return <Badge variant="outline"><ZapOff className="mr-1 h-3 w-3" />Unset</Badge>;
    case 'failed':
      return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Failed</Badge>;
    case 'checking':
      return <Badge variant="outline">Checking...</Badge>;
    default:
      return <Badge variant="outline"><HelpCircle className="mr-1 h-3 w-3" />Unknown</Badge>;
  }
};

const FormattedLastActivityCell: React.FC<{ isoDateString?: string }> = ({ isoDateString }) => {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    if (isoDateString) {
      try {
        setFormattedDate(format(parseISO(isoDateString), 'PP pp'));
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
    <TooltipProvider>
      <div className="mt-6 rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Bot Username</TableHead>
              <TableHead className="font-semibold">Token (Masked)</TableHead>
              <TableHead className="font-semibold">Webhook Status</TableHead>
              <TableHead className="font-semibold">Last Activity</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.map((token) => (
              <TableRow key={token.id}>
                <TableCell className="font-medium">{token.botInfo?.username || 'N/A'}</TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">{maskToken(token.token)}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{token.token}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <WebhookStatusIndicator status={token.webhookStatus} isCurrent={token.isCurrentWebhook} />
                </TableCell>
                <TableCell>
                  <FormattedLastActivityCell isoDateString={token.lastActivity} />
                </TableCell>
                <TableCell className="text-right space-x-2">
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
                    <TooltipContent>
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
                    <TooltipContent>
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
