"use client";

import { useState } from 'react';
import { useStoredTokens } from '@/lib/localStorage';
import { useToast } from '@/hooks/use-toast';
import { downloadFileAction } from '../message-log/actions'; // Assuming actions.ts is one level up then in message-log
import { saveAs } from 'file-saver';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DownloadCloud } from 'lucide-react';

export default function DownloadFilePage() {
  const { tokens } = useStoredTokens();
  const { toast } = useToast();
  const [manualFileId, setManualFileId] = useState("");
  const [manualFileTokenId, setManualFileTokenId] = useState("");
  const [isDownloadingManualFile, setIsDownloadingManualFile] = useState(false);

  const handleManualDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFileId || !manualFileTokenId) {
      toast({ title: "Missing Information", description: "Please provide a File ID and select a Bot.", variant: "destructive" });
      return;
    }
    const tokenData = tokens.find(t => t.id === manualFileTokenId);
    if (!tokenData || !tokenData.token) {
      toast({ title: "Token Error", description: "Selected bot token not found or invalid.", variant: "destructive" });
      return;
    }

    setIsDownloadingManualFile(true);
    toast({ title: "Downloading...", description: `Preparing file ${manualFileId} for download.` });

    try {
      const result = await downloadFileAction(tokenData.token, manualFileId);
      if (result.success && result.data) {
        const blob = new Blob([result.data.data], { type: result.data.mimeType || 'application/octet-stream' });
        saveAs(blob, result.data.fileName || manualFileId.replace(/[^a-zA-Z0-9._-]/g, '_') || "downloaded_file");
        toast({ title: "Download Complete", description: `${result.data.fileName || manualFileId} downloaded.` });
      } else {
        toast({ title: "Download Failed", description: result.error || "Could not download file.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Download Error", description: "An unexpected error occurred during download.", variant: "destructive" });
      console.error("Manual file download error:", error);
    } finally {
      setIsDownloadingManualFile(false);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline font-bold tracking-tight flex items-center">
            <DownloadCloud className="mr-3 h-8 w-8" />
            Download File by ID
          </h1>
          <p className="text-muted-foreground mt-1.5">
            If you have a File ID from Telegram, you can download it directly here using one of your registered bots.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enter File Details</CardTitle>
          <CardDescription>
            Provide the Telegram File ID and select which bot should be used to fetch the file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualDownloadSubmit} className="space-y-6">
            <div>
              <Label htmlFor="manual-file-id" className="text-sm font-medium">File ID</Label>
              <Input
                id="manual-file-id"
                type="text"
                placeholder="Enter Telegram File ID (e.g., AgAD...)"
                value={manualFileId}
                onChange={(e) => setManualFileId(e.target.value)}
                disabled={isDownloadingManualFile}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="manual-file-token" className="text-sm font-medium">Bot Token</Label>
              <Select
                value={manualFileTokenId}
                onValueChange={setManualFileTokenId}
                disabled={isDownloadingManualFile || tokens.length === 0}
              >
                <SelectTrigger id="manual-file-token" className="mt-1">
                  <SelectValue placeholder={tokens.length === 0 ? "No bots available" : "Select bot to use for download"} />
                </SelectTrigger>
                <SelectContent>
                  {tokens.map(token => (
                    <SelectItem key={token.id} value={token.id}>
                      {token.botInfo?.username || token.botInfo?.first_name || `Bot ID: ${token.id.substring(0, 8)}...`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tokens.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  No bots found. Please add a bot token in Token Management first.
                </p>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={isDownloadingManualFile || !manualFileId || !manualFileTokenId || tokens.length === 0} 
              className="w-full sm:w-auto"
            >
              {isDownloadingManualFile ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DownloadCloud className="mr-2 h-4 w-4" />
              )}
              Download File
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
