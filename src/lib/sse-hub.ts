// lib/sse-hub.ts
// IMPORTANT: This is a simplified in-memory hub. In a distributed serverless environment (like Vercel),
// this hub's state (the 'clients' Map) will NOT be shared across different serverless function instances
// or across different scaled instances of the same function. This means a message broadcast might only
// reach clients connected to the specific instance that handled the broadcast call.
// For robust multi-instance SSE, a dedicated pub/sub system (e.g., Redis, Vercel KV + polling, or a third-party service) is needed.

interface Client {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
}

const clients = new Map<string, Client>();
const encoder = new TextEncoder();

export function addClient(id: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  clients.set(id, { id, controller });
  console.log(`SSE Client added: ${id}, total clients: ${clients.size}`);

  // Send a connection confirmation event (optional)
  try {
    // Corrected string literal with double backslashes for newlines
    controller.enqueue(encoder.encode("event: connection_established\ndata: Connected\n\n"));
  } catch (e) {
    console.error("Error sending connection established event to client", id, e);
    removeClient(id); // Remove if initial write fails
  }
}

export function removeClient(id: string) {
  const client = clients.get(id);
  if (client) {
    try {
      // No direct way to close from controller here if already detached,
      // but browser closing connection will trigger cleanup.
    } catch (e) {
      // Ignore errors on cleanup
    }
    clients.delete(id);
    console.log(`SSE Client removed: ${id}, total clients: ${clients.size}`);
  }
}

export function broadcastMessage(message: any) {
  if (clients.size === 0) {
    // console.log("SSE Broadcast: No clients connected.");
    return;
  }
  // Corrected string literal with double backslashes for newlines
  const formattedMessage = `data: ${JSON.stringify(message)}\n\n`;
  const payload = encoder.encode(formattedMessage);

  // console.log(`SSE Broadcast: Sending to ${clients.size} clients: ${formattedMessage.substring(0, 100)}...`);
  for (const [id, client] of clients.entries()) {
    try {
      client.controller.enqueue(payload);
    } catch (error) {
      console.error(`Error writing to client ${id}:`, error);
      // If enqueue fails, it often means the client has disconnected.
      // The stream's cancellation (on client disconnect) should handle removal.
    }
  }
}

// Periodically send a keep-alive comment to prevent connection timeouts
// This is important for serverless environments with execution limits or proxy timeouts.
setInterval(() => {
  if (clients.size > 0) {
    // Corrected string literal with double backslashes for newlines
    const keepAlivePayload = encoder.encode(": keepalive\n\n");
    // console.log(`SSE: Sending keep-alive to ${clients.size} clients.`);
    for (const [id, client] of clients.entries()) {
      try {
        client.controller.enqueue(keepAlivePayload);
      } catch (error) {
        // console.warn(`SSE: Error sending keep-alive to client ${id}, possibly disconnected.`, error);
        // Client might have disconnected, removal will be handled by stream cancellation.
      }
    }
  }
}, 20000); // Every 20 seconds

