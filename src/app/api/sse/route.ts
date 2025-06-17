// app/api/sse/route.ts
import { NextRequest } from 'next/server';
import { addClient, removeClient } from '@/lib/sse-hub';

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId') || crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      addClient(clientId, controller);
    },
    cancel() {
      removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      // Optional: CORS headers if your client is on a different domain
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// POST endpoint for internal use by other server actions/routes to trigger broadcasts
// This is a way for other parts of your backend to send messages to connected SSE clients.
// In a real app, you might protect this endpoint.
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    if (!message) {
      return new Response(JSON.stringify({ success: false, error: "Message is required" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // The sse-hub.ts broadcastMessage will handle sending to all connected clients.
    // We are not directly calling it here, but this endpoint could be used by other server-side logic
    // to trigger an event that then calls broadcastMessage.
    // For direct broadcasting from another server action, you'd import and call broadcastMessage from sse-hub.
    // This POST handler is more of an example of how you *could* trigger events if not calling directly.
    // For now, let's assume direct import and call of broadcastMessage from where needed (e.g., webhook handler).
    
    // Example: If you wanted this endpoint to directly cause a broadcast (not typical for SSE trigger)
    // import { broadcastMessage as internalBroadcast } from '@/lib/sse-hub';
    // internalBroadcast(message);

    return new Response(JSON.stringify({ success: true, message: "Broadcast trigger acknowledged (actual broadcast depends on sse-hub implementation)" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in SSE POST handler:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to process broadcast trigger' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
