
"use server";

import type { ApiResult, TelegramChat, ChatMember } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

export async function getChatAction(token: string, id: string): Promise<ApiResult<TelegramChat>> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: id }),
    });
    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result as TelegramChat };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("getChatAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred fetching chat/user info." };
  }
}

export async function getChatMemberAction(token: string, chatId: string, userId: string): Promise<ApiResult<ChatMember>> {
  try {
    // Ensure userId is a number as Telegram API expects integer for user_id
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
        return { success: false, error: "User ID must be a valid number." };
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, user_id: numericUserId }),
    });
    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result as ChatMember };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("getChatMemberAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred fetching chat member." };
  }
}

export async function getChatAdministratorsAction(token: string, chatId: string): Promise<ApiResult<ChatMember[]>> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getChatAdministrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId }),
    });
    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result as ChatMember[] }; // Result is an Array of ChatMember objects
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("getChatAdministratorsAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred fetching chat administrators." };
  }
}
