import type { NextRequest } from 'next/server'; // NextResponse removed as not explicitly used for returning Response objects directly
import type { TelegramUpdate, TelegramMessage } from '@/lib/types';
import { broadcastMessage } from '@/lib/sse-hub';

// This is a very basic implementation.
// In a real app, you'd want to:
// 1. Verify the request is from Telegram (e.g., using a secret token in the webhook URL).
// 2. Process different update types robustly.
// 3. Potentially offload processing to a queue for scalability.
// 4. Store messages in a more persistent DB or use a proper message queue for cross-tab communication.

export async function POST(request: NextRequest, { params }: { params: { tokenId: string } }) {
  try {
    const rawUpdate = (await request.json()) as any; // Keep as any initially for flexibility
    const tokenId = params.tokenId;

    if (!tokenId) {
        console.error('Error processing webhook: Token ID not found in params.', params);
        return new Response(JSON.stringify({ success: false, error: 'Token ID missing from webhook URL parameters' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let relevantMessage: TelegramMessage | undefined = undefined;
    let updateType: string | undefined = undefined;

    // Determine the actual message object and its type from the update
    if (rawUpdate.message) {
      relevantMessage = rawUpdate.message as TelegramMessage;
      updateType = 'message';
    } else if (rawUpdate.edited_message) {
      relevantMessage = rawUpdate.edited_message as TelegramMessage;
      updateType = 'edited_message';
    } else if (rawUpdate.channel_post) {
      relevantMessage = rawUpdate.channel_post as TelegramMessage;
      updateType = 'channel_post';
    } else if (rawUpdate.edited_channel_post) {
      relevantMessage = rawUpdate.edited_channel_post as TelegramMessage;
      updateType = 'edited_channel_post';
    }
    // Add other update types as needed (e.g., callback_query, inline_query)

    const processedUpdate: TelegramUpdate = { ...rawUpdate }; // Create a mutable copy

    if (relevantMessage) {
      // 1. Attach sourceTokenId
      relevantMessage.sourceTokenId = tokenId;

      // 2. Extract and attach userId
      if (relevantMessage.from && relevantMessage.from.id) {
        relevantMessage.userId = relevantMessage.from.id;
        processedUpdate.userId = relevantMessage.from.id; // Also add to top-level update for convenience
      } else if (relevantMessage.chat && relevantMessage.chat.type === 'channel' && relevantMessage.sender_chat && relevantMessage.sender_chat.id) {
        // For channel posts, the 'from' might be missing, use sender_chat.id as chatId, userId might be less relevant or represent the channel itself
        relevantMessage.userId = relevantMessage.sender_chat.id; // Or handle as a special channel ID
        processedUpdate.userId = relevantMessage.sender_chat.id;
      }

      // 3. Extract and attach chatId and isGroupMessage
      if (relevantMessage.chat && relevantMessage.chat.id) {
        relevantMessage.chatId = relevantMessage.chat.id;
        processedUpdate.chatId = relevantMessage.chat.id; // Also add to top-level update
        if (relevantMessage.chat.type === 'group' || relevantMessage.chat.type === 'supergroup') {
          relevantMessage.isGroupMessage = true;
          processedUpdate.isGroupMessage = true; // Also add to top-level update
        } else {
          relevantMessage.isGroupMessage = false;
          processedUpdate.isGroupMessage = false;
        }
      }

      // Ensure the modified message is part of the processedUpdate
      if (updateType) {
        (processedUpdate as any)[updateType] = relevantMessage;
      }

      console.log(`Received webhook update for token ID: ${tokenId}, UserID: ${relevantMessage.userId}, ChatID: ${relevantMessage.chatId}, Group: ${relevantMessage.isGroupMessage}`);
      
      broadcastMessage({
        type: 'NEW_MESSAGE', // Or a more generic 'NEW_UPDATE' if handling more than just messages
        payload: {
          tokenId: tokenId,
          update: processedUpdate, // Send the whole processed update
          // message: relevantMessage, // Deprecated: send the whole update for more context
        }
      });
      console.log(`Broadcast initiated for update from token ID: ${tokenId}`);
    } else {
      // Handle other types of updates that don't have a direct 'message' structure if necessary
      console.log(`Received non-message update for token ID: ${tokenId}`, rawUpdate);
      // Optionally broadcast these too if your SSE clients expect them
      broadcastMessage({
        type: 'GENERIC_UPDATE', // Example type
        payload: {
          tokenId: tokenId,
          update: processedUpdate, // Send the raw update or a processed version
        }
      });
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
export async function GET(request: NextRequest, { params }: { params: { tokenId: string } }) {
    const tokenId = params.tokenId;

    if (!tokenId) {
        console.log("GET request to webhook endpoint without specific token ID in params.");
    }

    return new Response(JSON.stringify({ success: true, message: `Webhook endpoint for token ${tokenId || 'general'} is active.` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
