import type { NextRequest, NextResponse } from 'next/server';
import type { TelegramUpdate, TelegramMessage } from '@/lib/types';

// This is a very basic implementation.
// In a real app, you'd want to:
// 1. Verify the request is from Telegram (e.g., using a secret token in the webhook URL).
// 2. Process different update types robustly.
// 3. Potentially offload processing to a queue for scalability.
// 4. Store messages in a more persistent DB or use a proper message queue for cross-tab communication.

export async function POST(request: NextRequest) {
  try {
    const update = (await request.json()) as TelegramUpdate;
    const botToken = request.nextUrl.pathname.split('/').pop(); // Assuming token is part of path e.g. /api/webhook/<TOKEN>
                                                               // Or extract from query param or header if set up that way.
                                                               // For now, let's assume it's not directly available here easily without setup.
                                                               // The message will need to be associated with a token ID on client-side.

    let messageToStore: TelegramMessage | undefined = undefined;

    if (update.message) {
      messageToStore = update.message;
    } else if (update.edited_message) {
      messageToStore = update.edited_message; // Or handle edits differently
    } else if (update.channel_post) {
      messageToStore = update.channel_post;
    } else if (update.edited_channel_post) {
      messageToStore = update.edited_channel_post;
    }
    // ... handle other update types

    if (messageToStore) {
      // This mechanism for notifying the client is VERY basic (localStorage event).
      // A production app should use WebSockets, Server-Sent Events, or a robust message queue + client polling.
      // Or BroadcastChannel API if client tabs are open.
      // The key 'telematrix_new_webhook_message' will be listened to by the MessageLogPage.
      // We can't directly use localStorage from server components/routes.
      // This notification part needs a client-side mechanism to pick up or a push from server.
      // For now, this route just logs and returns OK. The client won't get live updates from this directly.
      // The MessageLogPage uses localStorage as a HACK to simulate this.
      // A better approach for local dev might be: client polls an endpoint, or this posts to a temp store client reads.

      // The challenge is communicating this server-side event to an active client tab.
      // This route only acknowledges receipt to Telegram.
      console.log("Received webhook update, message:", messageToStore);

      // TODO: How to link this message back to a specific StoredToken.id?
      // This requires the webhook URL to contain an identifier, or matching based on bot within message (if via_bot is set).
      // For now, we'll rely on client-side to perhaps know which token's webhook this is (if only one is set this way).
      // Or if the webhook URL is unique per token: /api/webhook/[tokenId]
    }


    return new Response(JSON.stringify({ success: true, message: "Update received" }), {
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
    return new Response(JSON.stringify({ success: true, message: "Webhook endpoint is active." }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
