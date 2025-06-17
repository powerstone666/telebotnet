import type { NextRequest, NextResponse } from 'next/server';
import type { TelegramUpdate, TelegramMessage } from '@/lib/types';
import { broadcastMessage } from '@/lib/sse-hub';

// This is a very basic implementation.
// In a real app, you'd want to:
// 1. Verify the request is from Telegram (e.g., using a secret token in the webhook URL).
// 2. Process different update types robustly.
// 3. Potentially offload processing to a queue for scalability.
// 4. Store messages in a more persistent DB or use a proper message queue for cross-tab communication.

export async function POST(request: NextRequest) {
  try {
    const update = (await request.json()) as TelegramUpdate;
    const urlParts = request.nextUrl.pathname.split('/');
    const tokenId = urlParts[urlParts.length - 1]; // Assuming URL is /api/webhook/[tokenId]

    if (!tokenId || tokenId === 'webhook') {
        console.error('Error processing webhook: Token ID not found in URL path.', request.nextUrl.pathname);
        return new Response(JSON.stringify({ success: false, error: 'Token ID missing from webhook URL' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let messageToStore: TelegramMessage | undefined = undefined;

    if (update.message) {
      messageToStore = update.message;
    } else if (update.edited_message) {
      messageToStore = update.edited_message;
    } else if (update.channel_post) {
      messageToStore = update.channel_post;
    } else if (update.edited_channel_post) {
      messageToStore = update.edited_channel_post;
    }

    if (messageToStore) {
      // Attach the tokenId to the message
      (messageToStore as TelegramMessage).sourceTokenId = tokenId;

      console.log(`Received webhook update for token ID: ${tokenId}, preparing to broadcast.`);
      
      // Broadcast the new message to all connected SSE clients
      broadcastMessage({
        type: 'NEW_MESSAGE',
        payload: {
          tokenId: tokenId,
          message: messageToStore,
        }
      });
      console.log(`Broadcast initiated for message from token ID: ${tokenId}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Update received and broadcast initiated" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to process update' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Telegram may send a GET request to verify the endpoint.
export async function GET(request: NextRequest) {
    const urlParts = request.nextUrl.pathname.split('/');
    const tokenId = urlParts[urlParts.length - 1]; // Assuming URL is /api/webhook/[tokenId]

    if (!tokenId || tokenId === 'webhook') {
        // This could be a general ping to /api/webhook, or an invalid one
        // For now, let's assume a general ping is okay, but log if no tokenId
        console.log("GET request to webhook endpoint without specific token ID.");
    }

    return new Response(JSON.stringify({ success: true, message: `Webhook endpoint for token ${tokenId || 'general'} is active.` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
