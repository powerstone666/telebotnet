
"use server";

import type { ApiResult, BotCommand } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

export async function getMyCommandsAction(token: string): Promise<ApiResult<BotCommand[]>> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/getMyCommands`);
    const data = await response.json();

    if (data.ok) {
      return { success: true, data: data.result as BotCommand[] };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("getMyCommandsAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred fetching commands." };
  }
}

export async function setMyCommandsAction(token: string, commands: BotCommand[]): Promise<ApiResult<boolean>> {
  try {
    if (!Array.isArray(commands) || !commands.every(cmd => 
        typeof cmd.command === 'string' && cmd.command.length > 0 && cmd.command.length <= 32 && /^[a-z0-9_]+$/.test(cmd.command) &&
        typeof cmd.description === 'string' && cmd.description.length > 0 && cmd.description.length <= 256
    )) {
      if (commands.length > 0) { 
        return { success: false, error: "Invalid command structure or content." };
      }
    }
    if (commands.length > 100) {
        return { success: false, error: "A maximum of 100 commands can be set."};
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands }), 
    });
    
    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result as boolean };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("setMyCommandsAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred setting commands." };
  }
}

export async function deleteMyCommandsAction(token: string): Promise<ApiResult<boolean>> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}${token}/deleteMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result as boolean };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("deleteMyCommandsAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred deleting commands." };
  }
}
