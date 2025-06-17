
"use server";

import type { ApiResult, TelegramMessage } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

export async function sendMessageAction(
  token: string,
  chatId: string,
  text: string,
  // TODO: Add other parameters like parse_mode, reply_markup etc. as needed
): Promise<ApiResult<TelegramMessage>> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chat_id: chatId, text: text }),
    });
    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result as TelegramMessage };
    } else {
      return { success: false, error: data.description || `Telegram API error: ${response.status}` };
    }
  } catch (error) {
    console.error("sendMessageAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}

export async function editMessageTextAction(
  token: string,
  chatId: number | string, // Can be number or string like @channelusername
  messageId: number,
  text: string,
  // TODO: Add other parameters like parse_mode, reply_markup etc. as needed
): Promise<ApiResult<TelegramMessage | boolean>> { // Returns true or the edited message
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/editMessageText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: text }),
    });
    const data = await response.json();
    if (data.ok) {
      // data.result can be true or the edited message object
      return { success: true, data: data.result }; 
    } else {
      return { success: false, error: data.description || `Telegram API error: ${response.status}` };
    }
  } catch (error) {
    console.error("editMessageTextAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}

export async function deleteMessageAction(
  token: string,
  chatId: number | string,
  messageId: number
): Promise<ApiResult<boolean>> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/deleteMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
    const data = await response.json();
    if (data.ok && data.result === true) {
      return { success: true, data: true };
    } else {
      return { success: false, error: data.description || `Telegram API error: ${response.status}` };
    }
  } catch (error) {
    console.error("deleteMessageAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}
