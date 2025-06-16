
"use server";

import type { ApiResult, BotInfo, StoredToken, WebhookInfo } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

// Determine the application's base URL for constructing the webhook URL
let appBaseUrl: string;

if (process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL) {
  appBaseUrl = process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL;
} else if (process.env.APP_URL) { // Commonly provided by hosting environments like Firebase App Hosting
  appBaseUrl = process.env.APP_URL;
} else if (process.env.NODE_ENV === 'development') {
  // Default for local development based on package.json script (dev port 9002)
  // Ensure this matches your local dev setup if you change the port
  appBaseUrl = 'http://localhost:9002';
} else {
  // Fallback if no specific URL can be determined in a non-development environment.
  // It's crucial to set either NEXT_PUBLIC_WEBHOOK_BASE_URL or ensure APP_URL is available in your production environment.
  appBaseUrl = 'https://[CONFIGURE_YOUR_APP_URL_IN_ENV]'; // Placeholder indicating configuration is needed
}

const CURRENT_APP_WEBHOOK_URL = `${appBaseUrl}/api/webhook`;


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
      // Ensure comparison is consistent, e.g. by removing trailing slashes if they might appear inconsistently.
      // For now, assuming URLs are clean.
      const isCurrentWebhook = webhookInfo.url === CURRENT_APP_WEBHOOK_URL;
      return { success: true, data: { webhookInfo: webhookInfo.url ? webhookInfo : null, isCurrentWebhook } };
    }
    return { success: false, error: "Failed to parse webhook info." };
  } catch (error) {
    console.error("checkWebhookAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}
