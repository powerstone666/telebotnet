"use server";

import type { ApiResult } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

export async function setWebhookAction(token: string, webhookUrl: string): Promise<ApiResult> {
  try {
    if (!webhookUrl.startsWith("https://")) {
      return { success: false, error: "Webhook URL must use HTTPS." };
    }
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });
    
    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("setWebhookAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred setting webhook." };
  }
}

export async function deleteWebhookAction(token: string): Promise<ApiResult> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: false }), // or true, depending on desired behavior
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result };
    }
    // Telegram might return an error if webhook is already not set. Consider this a success for deletion.
    // Example: `Bad Request: webhook is already deleted` or similar.
    // This needs checking Telegram's exact error messages. For now, a general check.
    if (response.status === 400 && data.description && data.description.toLowerCase().includes("webhook is already deleted")) {
        return { success: true, data: { message: "Webhook was already not set."} };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("deleteWebhookAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred deleting webhook." };
  }
}
