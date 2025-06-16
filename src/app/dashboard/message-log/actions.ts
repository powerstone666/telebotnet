
"use server";
import type { ApiResult, TelegramMessage } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

interface FileDownloadResult {
    fileName?: string;
    mimeType?: string;
    data: ArrayBuffer; 
}

export async function downloadFileAction(token: string, fileId: string): Promise<ApiResult<FileDownloadResult>> {
    try {
        const getFileResponse = await fetch(`${TELEGRAM_API_BASE}${token}/getFile?file_id=${fileId}`);
        const getFileData = await getFileResponse.json();

        if (!getFileData.ok || !getFileData.result.file_path) {
            return { success: false, error: getFileData.description || "Could not get file path from Telegram." };
        }
        const filePath = getFileData.result.file_path;
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1) || "downloaded_file";

        const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
        const fileResponse = await fetch(fileUrl);

        if (!fileResponse.ok) {
            return { success: false, error: `Failed to download file content (status: ${fileResponse.status})` };
        }

        const fileDataBuffer = await fileResponse.arrayBuffer(); 
        const mimeType = fileResponse.headers.get('content-type') || 'application/octet-stream'; 

        return { 
            success: true, 
            data: {
                fileName: fileName,
                mimeType: mimeType,
                data: fileDataBuffer,
            }
        };

    } catch (error) {
        console.error("downloadFileAction error:", error);
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred downloading file." };
    }
}


export async function editMessageTextAction(
    token: string,
    chatId: string | number,
    messageId: number,
    text: string,
    parseMode?: 'MarkdownV2' | 'HTML' | 'Markdown'
): Promise<ApiResult<TelegramMessage | boolean>> {
  try {
    const body: any = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
    };
    if (parseMode) {
      body.parse_mode = parseMode;
    }

    const response = await fetch(`${TELEGRAM_API_BASE}${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result as (TelegramMessage | boolean) };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("editMessageTextAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred editing message." };
  }
}

export async function deleteMessageAction(
    token: string,
    chatId: string | number,
    messageId: number
): Promise<ApiResult<boolean>> {
  try {
    const body = {
      chat_id: chatId,
      message_id: messageId,
    };

    const response = await fetch(`${TELEGRAM_API_BASE}${token}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    if (data.ok) {
      return { success: true, data: data.result as boolean };
    }
    return { success: false, error: data.description || `Telegram API error: ${response.status}` };
  } catch (error) {
    console.error("deleteMessageAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred deleting message." };
  }
}
