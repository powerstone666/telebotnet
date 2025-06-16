"use server";

import type { ApiResult, BotInfo, StoredToken, WebhookInfo } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

// This is a placeholder. In a real app, this would be dynamically determined
// or configured via environment variables.
const CURRENT_APP_WEBHOOK_URL = process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL ? `${process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL}/api/webhook` : "https://example.com/api/webhook";


export async function getBotInfoAction(token: string): Promise<ApiResult<BotInfo>> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getMe`);
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.description || `Telegram API error: ${response.status}` };
    }
    const data = await response.json();
    if (data.ok && data.result) {
      return { success: true, data: data.result as BotInfo };
    }
    return { success: false, error: "Failed to parse bot info." };
  } catch (error) {
    console.error("getBotInfoAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}

export async function checkWebhookAction(token: string): Promise<ApiResult<{ webhookInfo: WebhookInfo | null, isCurrentWebhook: boolean }>> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getWebhookInfo`);
    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.description || `Telegram API error: ${response.status}` };
    }
    const data = await response.json();
    if (data.ok) {
      const webhookInfo = data.result as WebhookInfo;
      const isCurrentWebhook = webhookInfo.url === CURRENT_APP_WEBHOOK_URL;
      return { success: true, data: { webhookInfo: webhookInfo.url ? webhookInfo : null, isCurrentWebhook } };
    }
    return { success: false, error: "Failed to parse webhook info." };
  } catch (error) {
    console.error("checkWebhookAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}
