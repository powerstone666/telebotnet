import type { NextRequest } from 'next/server';

const TELEGRAM_API_BASE_URL = "https://api.telegram.org/bot";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const fileId = searchParams.get('file_id');

  if (!token || !fileId) {
    return new Response(JSON.stringify({ error: "Missing token or file_id query parameter." }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Step 1: Get the file path from Telegram API
    const getFileUrl = `${TELEGRAM_API_BASE_URL}${token}/getFile?file_id=${fileId}`;
    const fileInfoResponse = await fetch(getFileUrl);

    if (!fileInfoResponse.ok) {
      const errorData = await fileInfoResponse.json();
      return new Response(JSON.stringify({ error: `Telegram API error (getFile): ${errorData.description || fileInfoResponse.statusText}` }), {
        status: fileInfoResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const fileInfo = await fileInfoResponse.json();
    if (!fileInfo.ok || !fileInfo.result.file_path) {
      return new Response(JSON.stringify({ error: "Failed to retrieve file path from Telegram." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const filePath = fileInfo.result.file_path;
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);

    // Step 2: Fetch the actual file from Telegram
    const actualFileUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    const actualFileResponse = await fetch(actualFileUrl);

    if (!actualFileResponse.ok) {
      return new Response(JSON.stringify({ error: `Failed to download file content (status: ${actualFileResponse.status})` }), {
        status: actualFileResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Stream the file back to the client
    const fileStream = actualFileResponse.body;
    const contentType = actualFileResponse.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = `attachment; filename="${fileName}"`;

    return new Response(fileStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        // 'Content-Length': actualFileResponse.headers.get('content-length') || '', // Optional
      },
    });

  } catch (error) {
    console.error("Error in /api/downloadFile:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(JSON.stringify({ error: `Server error: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
