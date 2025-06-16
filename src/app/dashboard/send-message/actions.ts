"use server";

import type { ApiResult } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

interface SendMessagePayload {
  token: string;
  chatId: string;
  text: string;
  parseMode?: 'MarkdownV2' | 'HTML' | 'Markdown';
  replyToMessageId?: string;
}

export async function sendMessageAction(payload: SendMessagePayload): Promise<ApiResult> {
  const { token, chatId, text, parseMode, replyToMessageId } = payload;
  try {
    const body: any = {
      chat_id: chatId,
      text: text,
    };
    if (parseMode) {
      body.parse_mode = parseMode;
    }
    if (replyToMessageId) {
      body.reply_to_message_id = parseInt(replyToMessageId, 10);
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("sendMessageAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred sending message." };
  }
}
