"use server";

import type { ApiResult, TelegramUpdate } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

export async function getUpdatesAction(token: string, offset?: number): Promise<ApiResult<TelegramUpdate[]>> {
  try {
    const params = new URLSearchParams();
    if (offset) {
      params.append('offset', offset.toString());
    }
    params.append('limit', '100'); // Max limit
    params.append('timeout', '10'); // 10 second long polling

    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getUpdates?${params.toString()}`);
    
    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result as TelegramUpdate[] };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("getUpdatesAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred fetching updates." };
  }
}
