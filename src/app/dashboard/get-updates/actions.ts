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
      const updates: TelegramUpdate[] = data.result.map((update: any) => {
        let userId: number | undefined;
        let chatId: number | undefined;
        let isGroupMessage = false;

        if (update.message) {
          userId = update.message.from?.id;
          chatId = update.message.chat?.id;
          isGroupMessage = update.message.chat?.type === 'group' || update.message.chat?.type === 'supergroup';
        } else if (update.edited_message) {
          userId = update.edited_message.from?.id;
          chatId = update.edited_message.chat?.id;
          isGroupMessage = update.edited_message.chat?.type === 'group' || update.edited_message.chat?.type === 'supergroup';
        } else if (update.channel_post) {
          chatId = update.channel_post.chat?.id;
          isGroupMessage = update.channel_post.chat?.type === 'channel'; 
        } else if (update.edited_channel_post) {
          chatId = update.edited_channel_post.chat?.id;
          isGroupMessage = update.edited_channel_post.chat?.type === 'channel';
        } else if (update.callback_query) {
          userId = update.callback_query.from?.id;
          chatId = update.callback_query.message?.chat?.id;
          isGroupMessage = update.callback_query.message?.chat?.type === 'group' || update.callback_query.message?.chat?.type === 'supergroup';
        }
        // Add other update types as needed (inline_query, chosen_inline_result, etc.)

        return {
          ...update,
          userId,
          chatId,
          isGroupMessage,
        };
      });
      return { success: true, data: updates };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("getUpdatesAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred fetching updates." };
  }
}
