/**
 * Chat room implementation using Durable Objects
 */
export class ChatRoom {
  private sessions: { webSocket: any; id: string; username: string }[] = [];
  private state: any;
  private env: any;
  private storage: any;
  private roomId: string;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
    this.storage = state.storage;
    // Extract the room ID from the state ID
    this.roomId = state.id.name || 'default';
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade requests
    if (request.headers.get("Upgrade") === "websocket") {
      // Create a new WebSocketPair
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      // Accept the WebSocket connection
      server.accept();

      // Generate a unique ID for this connection
      const sessionId = crypto.randomUUID();
      // Default username is "Guest" + first 6 chars of the ID
      const defaultUsername = `Guest-${sessionId.substring(0, 6)}`;

      // Store the WebSocket connection
      const session = { webSocket: server, id: sessionId, username: defaultUsername };
      this.sessions.push(session);

      // Send room information to the user
      server.send(JSON.stringify({
        type: "roomInfo",
        roomId: this.roomId
      }));

      // Send a welcome message
      server.send(JSON.stringify({ 
        type: "system", 
        message: `Welcome to room "${this.roomId}"! You are connected with username: ${defaultUsername}. There are ${this.sessions.length} users online.` 
      }));

      // Send user list to the new user
      const userList = this.sessions.map(s => ({ id: s.id, username: s.username }));
      server.send(JSON.stringify({
        type: "userList",
        users: userList
      }));

      // Send message history to the new user
      const messageHistory = await this.storage.get("messages") || [];
      if (messageHistory.length > 0) {
        server.send(JSON.stringify({
          type: "messageHistory",
          messages: messageHistory.slice(-50) // Only send the last 50 messages
        }));
      }

      // Broadcast to all users that someone joined
      this.broadcast({
        type: "system",
        message: `${defaultUsername} joined the chat. There are now ${this.sessions.length} users online.`
      }, sessionId);

      // Set up event handlers for this WebSocket
      server.addEventListener("message", async (event: any) => {
        try {
          const data = JSON.parse(event.data as string);
          
          // Handle set username command
          if (data.type === "setUsername") {
            const newUsername = data.username.trim();
            
            // Validate username
            if (newUsername.length < 3 || newUsername.length > 20) {
              server.send(JSON.stringify({
                type: "error",
                message: "Username must be between 3 and 20 characters"
              }));
              return;
            }
            
            // Check if username is already taken
            const isUsernameTaken = this.sessions.some(s => 
              s.id !== sessionId && s.username.toLowerCase() === newUsername.toLowerCase()
            );
            
            if (isUsernameTaken) {
              server.send(JSON.stringify({
                type: "error",
                message: "This username is already taken"
              }));
              return;
            }
            
            // Store the old username for announcing the change
            const oldUsername = session.username;
            
            // Update the username
            session.username = newUsername;
            
            // Send confirmation to the user
            server.send(JSON.stringify({
              type: "usernameChanged",
              username: newUsername
            }));
            
            // Broadcast the username change
            this.broadcast({
              type: "system",
              message: `${oldUsername} is now known as ${newUsername}`
            });
            
            // Update the user list for all users
            const updatedUserList = this.sessions.map(s => ({ id: s.id, username: s.username }));
            this.broadcastToAll({
              type: "userList",
              users: updatedUserList
            });
            
            return;
          }
          
          // Handle regular chat message
          if (data.type === "message" || data.text) {
            const messageText = data.text || data.message;
            
            if (!messageText || messageText.trim() === "") {
              return; // Ignore empty messages
            }
            
            // Store message in Durable Object storage for history
            const timestamp = new Date().toISOString();
            const messageWithMetadata = {
              from: session.id,
              username: session.username,
              text: messageText,
              timestamp
            };

            // Get existing messages, append new one, and save
            const messages = (await this.storage.get("messages")) || [];
            messages.push(messageWithMetadata);
            
            // Limit message history to most recent 200 messages
            const trimmedMessages = messages.length > 200 ? messages.slice(-200) : messages;
            await this.storage.put("messages", trimmedMessages);

            // Broadcast the message to all clients
            this.broadcast({
              type: "message",
              from: session.id,
              username: session.username,
              text: messageText,
              timestamp
            });
          }
        } catch (error) {
          // If the message isn't valid JSON or has some other issue, just ignore it
          server.send(JSON.stringify({ 
            type: "error", 
            message: "Invalid message format" 
          }));
        }
      });

      server.addEventListener("close", () => {
        // Remove the WebSocket from the sessions list
        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        
        // Broadcast that a user has left
        this.broadcast({
          type: "system",
          message: `${session.username} left the chat. There are now ${this.sessions.length} users online.`
        });
        
        // Update the user list for all remaining users
        const updatedUserList = this.sessions.map(s => ({ id: s.id, username: s.username }));
        this.broadcastToAll({
          type: "userList",
          users: updatedUserList
        });
      });

      server.addEventListener("error", () => {
        // Handle any errors
        this.sessions = this.sessions.filter(s => s.id !== sessionId);
      });

      // Return the client end of the WebSocket to the client
      return new Response(null, { 
        status: 101, 
        // @ts-ignore - WebSocket is a Cloudflare-specific extension
        webSocket: client 
      });
    }

    // Add an endpoint to list active rooms
    if (url.pathname === "/active-rooms" && request.method === "GET") {
      // This endpoint should be implemented in the main worker, not here
      return new Response("This endpoint should be accessed from the main worker", { status: 400 });
    }

    // Handle HTTP requests
    if (url.pathname === "/messages" && request.method === "GET") {
      // Return message history
      const messages = await this.storage.get("messages") || [];
      return new Response(JSON.stringify(messages), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }

  // Helper method to broadcast a message to all clients except the sender
  private broadcast(message: any, excludeId: string = "") {
    const messageStr = JSON.stringify(message);
    
    for (const session of this.sessions) {
      // Skip the sender if specified
      if (session.id === excludeId) continue;
      
      try {
        session.webSocket.send(messageStr);
      } catch (error) {
        // If there's an error sending to this client, remove it from the sessions
        this.sessions = this.sessions.filter(s => s.id !== session.id);
      }
    }
  }
  
  // Helper method to broadcast a message to all clients including the sender
  private broadcastToAll(message: any) {
    const messageStr = JSON.stringify(message);
    
    for (const session of this.sessions) {
      try {
        session.webSocket.send(messageStr);
      } catch (error) {
        // If there's an error sending to this client, remove it from the sessions
        this.sessions = this.sessions.filter(s => s.id !== session.id);
      }
    }
  }
}