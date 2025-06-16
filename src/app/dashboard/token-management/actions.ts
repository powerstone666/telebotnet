
"use server";

import type { ApiResult, BotInfo, StoredToken, WebhookInfo } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

// Determine the application's base URL for constructing the webhook URL
function getCurrentAppWebhookUrl(): string {
  let appBaseUrl: string;

  if (process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL) {
    appBaseUrl = process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL;
  } else if (process.env.APP_URL) { // Commonly provided by hosting environments like Firebase App Hosting
    appBaseUrl = process.env.APP_URL;
  } else if (process.env.NODE_ENV === 'development') {
    // Default for local development. Ensure this matches your local dev setup.
    // Check if running in Gitpod or similar environment that sets a public URL
    if (process.env.GITPOD_WORKSPACE_URL) {
        const gitpodUrl = new URL(process.env.GITPOD_WORKSPACE_URL);
        appBaseUrl = `https://${process.env.PORT || '9002'}-${gitpodUrl.hostname}`;
    } else {
        appBaseUrl = `http://localhost:${process.env.PORT || '9002'}`;
    }
  } else {
    // Fallback if no specific URL can be determined in a non-development environment.
    // It's crucial to set either NEXT_PUBLIC_WEBHOOK_BASE_URL or ensure APP_URL is available.
    console.warn("Warning: Webhook base URL could not be determined. Falling back to placeholder. Please set NEXT_PUBLIC_WEBHOOK_BASE_URL or ensure APP_URL is available in your environment.");
    appBaseUrl = 'https://[CONFIGURE_YOUR_APP_URL_IN_ENV]'; // Placeholder indicating configuration is needed
  }
  // Ensure it ends with /api/webhook
  const cleanBaseUrl = appBaseUrl.endsWith('/') ? appBaseUrl.slice(0, -1) : appBaseUrl;
  return `${cleanBaseUrl}/api/webhook`;
}


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
      const currentAppWebhook = getCurrentAppWebhookUrl();
      
      // Normalize URLs for comparison (e.g., remove trailing slashes if they might appear inconsistently)
      const normalizeUrl = (url: string | undefined) => url ? url.replace(/\/$/, "") : "";
      
      const isCurrentWebhook = normalizeUrl(webhookInfo.url) === normalizeUrl(currentAppWebhook);
      
      return { success: true, data: { webhookInfo: webhookInfo.url ? webhookInfo : null, isCurrentWebhook } };
    }
    return { success: false, error: "Failed to parse webhook info." };
  } catch (error) {
    console.error("checkWebhookAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}
