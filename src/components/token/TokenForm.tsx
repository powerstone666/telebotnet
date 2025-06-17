"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { StoredToken } from "@/lib/types";
import { getBotInfoAction, checkWebhookAction } from "@/app/dashboard/token-management/actions";
import { Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";

const tokenFormSchema = z.object({
  token: z.string().min(20, { message: "Token must be at least 20 characters." })
    .regex(/^\d+:[a-zA-Z0-9_-]+$/, { message: "Invalid Telegram token format." }),
});

type TokenFormValues = z.infer<typeof tokenFormSchema>;

interface TokenFormProps {
  onTokenAdded: (token: StoredToken) => void;
  existingTokens: StoredToken[];
}

export function TokenForm({ onTokenAdded, existingTokens }: TokenFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: { token: "" },
  });

  async function onSubmit(data: TokenFormValues) {
    setIsSubmitting(true);
    if (existingTokens.some(t => t.token === data.token)) {
      toast({
        title: "Token Exists",
        description: "This token is already in your list.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const botInfoResult = await getBotInfoAction(data.token);

    if (!botInfoResult.success || !botInfoResult.data) {
      toast({
        title: "Error Fetching Bot Info",
        description: botInfoResult.error || "Could not validate token with Telegram.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const webhookCheckResult = await checkWebhookAction(data.token);
    let webhookStatus: StoredToken['webhookStatus'] = 'unknown';
    let isCurrentWebhook = false;

    if (webhookCheckResult.success && webhookCheckResult.data) {
        webhookStatus = webhookCheckResult.data.webhookInfo ? 'set' : 'unset';
        isCurrentWebhook = webhookCheckResult.data.isCurrentWebhook;
    } else {
        webhookStatus = 'failed'; // Failed to check webhook
    }


    const newToken: StoredToken = {
      id: botInfoResult.data.id.toString(), // Use bot ID as unique ID for the token entry
      token: data.token,
      botInfo: botInfoResult.data,
      webhookStatus: webhookStatus,
      isCurrentWebhook: isCurrentWebhook,
      lastActivity: new Date().toISOString(),
    };
    
    onTokenAdded(newToken);

    toast({
      title: "Token Added",
      description: `Bot "${botInfoResult.data.username}" added successfully.`,
    });
    
    form.reset();
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-lg shadow">
        <FormField
          control={form.control}
          name="token"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="token-input" className="text-base font-medium">New Telegram Bot Token</FormLabel>
              <FormControl>
                <Input id="token-input" placeholder="Enter your Telegram bot token (e.g., 123456:ABC-DEF)" {...field} className="text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="mr-2 h-4 w-4" />
          )}
          Add Token
        </Button>
      </form>
    </Form>
  );
}
