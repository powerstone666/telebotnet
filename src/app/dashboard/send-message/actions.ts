
"use server";

import type { ApiResult, TelegramMessage } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

interface SendMessagePayload {
  token: string;
  chatId: string;
  text: string;
  parseMode?: 'MarkdownV2' | 'HTML' | 'Markdown';
  replyToMessageId?: string;
}

export async function sendMessageAction(payload: SendMessagePayload): Promise<ApiResult<TelegramMessage>> {
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
      // Telegram expects message_id to be an integer
      const numericReplyId = parseInt(replyToMessageId, 10);
      if (!isNaN(numericReplyId)) {
        body.reply_to_message_id = numericReplyId;
      }
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result as TelegramMessage };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("sendMessageAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred sending message." };
  }
}

async function sendMediaAction(formData: FormData, endpoint: 'sendPhoto' | 'sendDocument' | 'sendVideo'): Promise<ApiResult<TelegramMessage>> {
  const token = formData.get('token') as string;
  
  if (!token) {
    return { success: false, error: "Bot token is missing." };
  }

  const telegramFormData = new FormData();
  const mediaType = endpoint.substring(4).toLowerCase(); // photo, document, video

  for (const [key, value] of formData.entries()) {
    if (key !== 'token') { 
      if (key === mediaType && value instanceof File) {
         telegramFormData.append(mediaType, value, value.name);
      } else if (value !== null && value !== undefined) {
        if (key === 'replyToMessageId') {
            const numericId = parseInt(value as string, 10);
            if(!isNaN(numericId)) telegramFormData.append('reply_parameters', JSON.stringify({message_id: numericId})); // Updated for reply_parameters
        } else if (key === 'parseMode') {
            telegramFormData.append('caption_parse_mode', value as string); // For caption specifically
        } else if (key === 'chatId'){
            telegramFormData.append('chat_id', value as string);
        }
         else {
            telegramFormData.append(key, value as string);
        }
      }
    }
  }
  
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/${endpoint}`, {
      method: 'POST',
      body: telegramFormData, 
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result as TelegramMessage };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error(`${endpoint}Action error:`, error);
    return { success: false, error: error instanceof Error ? error.message : `An unknown error occurred sending ${mediaType}.` };
  }
}

export async function sendPhotoAction(formData: FormData): Promise<ApiResult<TelegramMessage>> {
  return sendMediaAction(formData, 'sendPhoto');
}

export async function sendDocumentAction(formData: FormData): Promise<ApiResult<TelegramMessage>> {
  return sendMediaAction(formData, 'sendDocument');
}

export async function sendVideoAction(formData: FormData): Promise<ApiResult<TelegramMessage>> {
  return sendMediaAction(formData, 'sendVideo');
}
