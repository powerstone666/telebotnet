"use server";
import type { ApiResult } from "@/lib/types";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

interface FileDownloadResult {
    fileName?: string;
    mimeType?: string;
    data: ArrayBuffer;
}

export async function downloadFileAction(token: string, fileId: string): Promise<ApiResult<FileDownloadResult>> {
    try {
        // 1. Get file path
        const getFileResponse = await fetch(`${TELEGRAM_API_BASE}${token}/getFile?file_id=${fileId}`);
        const getFileData = await getFileResponse.json();

        if (!getFileData.ok || !getFileData.result.file_path) {
            return { success: false, error: getFileData.description || "Could not get file path." };
        }
        const filePath = getFileData.result.file_path;
        const fileName = getFileData.result.file_path.split('/').pop();


        // 2. Download the file content
        const fileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
        const fileResponse = await fetch(fileUrl);

        if (!fileResponse.ok) {
            return { success: false, error: `Failed to download file content (status: ${fileResponse.status})` };
        }

        const fileDataBuffer = await fileResponse.arrayBuffer();
        const mimeType = fileResponse.headers.get('content-type') || undefined;

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
