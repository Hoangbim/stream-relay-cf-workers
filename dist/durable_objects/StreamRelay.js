export class StreamRelay {
    constructor(state, env) {
        var _a, _b, _c;
        this.streamId = null;
        this.sfuConnection = null;
        this.clients = new Map();
        // private codecDescription: ArrayBuffer | null = null;
        this.audioCodecDescription = null;
        this.videoCodecDescription = null;
        this.reconnectTimeout = null;
        this.heartbeatInterval = null;
        this.isConnectedToSFU = false;
        this.currentWsUrl = null;
        this.state = state;
        this.env = env;
        // Extract the stream ID from the state ID
        // this.streamId = state.id.name?.split(":")[1] || "test_stream";
        this.streamId = (_b = (_a = state.id.name) === null || _a === void 0 ? void 0 : _a.split(":")[1]) !== null && _b !== void 0 ? _b : null;
        // Use WebSocket protocol instead of HTTP
        // in production, this should be set to the actual SFU server URL in the environment
        this.sfuUrl = (_c = env.SFU_SERVER_URL) !== null && _c !== void 0 ? _c : null;
        this.currentWsUrl = null;
    }
    async fetch(request) {
        var _a;
        const url = new URL(request.url);
        const forwardedHost = (_a = request.headers.get("Origin")) === null || _a === void 0 ? void 0 : _a.replace("http", "ws");
        if (!this.sfuUrl && forwardedHost) {
            this.sfuUrl = forwardedHost;
        }
        if (!this.streamId) {
            const streamId = url.pathname.substring("/stream/".length);
            this.streamId = streamId;
        }
        // Handle WebSocket upgrade requests
        if (request.headers.get("Upgrade") === "websocket") {
            // Create WebSocketPair for the client
            const pair = new WebSocketPair();
            const client = pair[0];
            const server = pair[1];
            // Accept the WebSocket connection
            server.accept();
            // Generate unique client ID
            const clientId = crypto.randomUUID();
            // Store the WebSocket connection
            this.clients.set(clientId, server);
            // Set up event handlers for this WebSocket
            server.addEventListener("close", () => this.handleClientDisconnect(clientId));
            server.addEventListener("error", () => this.handleClientDisconnect(clientId));
            // Send initial connection status
            this.sendStatusToClient(clientId, `Connected to stream relay, state: ${this.state.id},  Waiting for media...`);
            // Connect to SFU if this is our first client
            if (this.clients.size === 1) {
                await this.connectToSFU();
                // Start the heartbeat only when we have the first client
                this.startHeartbeat();
            }
            else if (this.isConnectedToSFU &&
                this.audioCodecDescription &&
                this.videoCodecDescription) {
                // If we already have codec info, send it immediately to the new client
                server.send(this.audioCodecDescription);
                server.send(this.videoCodecDescription);
            }
            // Return the client end of the WebSocket
            return new Response(null, {
                status: 101,
                webSocket: client,
            });
        }
        // Health check endpoint
        if (url.pathname === "/health") {
            return new Response(JSON.stringify({
                status: "ok",
                streamId: this.streamId,
                clientCount: this.clients.size,
                connectedToSFU: this.isConnectedToSFU,
            }), {
                headers: { "Content-Type": "application/json" },
            });
        }
        return new Response("Not Found", { status: 404 });
    }
    async connectToSFU() {
        try {
            // Clear any existing reconnect timeout
            if (this.reconnectTimeout !== null) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
            // Create WebSocket URL with the correct protocol and path
            const wsUrl = `${this.sfuUrl}/consume/${this.streamId}`;
            this.currentWsUrl = wsUrl;
            // Create a direct WebSocket connection to SFU
            this.sfuConnection = new WebSocket(wsUrl);
            this.sfuConnection.binaryType = "arraybuffer";
            // Set up event handlers for the SFU WebSocket connection
            this.sfuConnection.addEventListener("open", () => {
                this.isConnectedToSFU = true;
                this.broadcastStatusToClients(`Connected to SFU server, host: ${this.sfuUrl}`);
            });
            // Handle messages from the SFU
            this.sfuConnection.addEventListener("message", (event) => {
                // The first message contains codec information
                if (!this.audioCodecDescription) {
                    const data = new Uint8Array(event.data);
                    if (data[0] === 1) {
                        this.audioCodecDescription = event.data;
                    }
                    this.broadcastStatusToClients("Received audio codec information from SFU");
                }
                if (!this.videoCodecDescription) {
                    const data = new Uint8Array(event.data);
                    if (data[0] === 0) {
                        this.videoCodecDescription = event.data;
                    }
                }
                // Fan out to all connected clients
                this.fanOutToClients(event.data);
                // Use WebSocket Hibernation API properly for Cloudflare Workers
                // We need to use the extended WebSocket interface for this
                if (this.sfuConnection && "hibernateConnection" in this.sfuConnection) {
                    // @ts-ignore - Cloudflare's specific API
                    this.sfuConnection.hibernateConnection();
                }
            });
            // Handle SFU disconnection
            this.sfuConnection.addEventListener("close", () => {
                console.log("Disconnected from SFU, attempting to reconnect...");
                this.isConnectedToSFU = false;
                this.broadcastStatusToClients("Disconnected from SFU, attempting to reconnect...");
                this.scheduleReconnect();
            });
            this.sfuConnection.addEventListener("error", (err) => {
                console.error("SFU connection error:", err);
                this.isConnectedToSFU = false;
                this.broadcastStatusToClients("Error connecting to SFU");
                this.scheduleReconnect();
            });
        }
        catch (error) {
            console.error("Error connecting to SFU:", error);
            this.isConnectedToSFU = false;
            this.broadcastStatusToClients("Failed to connect to SFU");
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        // Attempt to reconnect after 5 seconds
        if (this.clients.size > 0 && this.reconnectTimeout === null) {
            this.reconnectTimeout = setTimeout(() => this.connectToSFU(), 5000);
        }
    }
    handleClientDisconnect(clientId) {
        // Remove the client
        this.clients.delete(clientId);
        // If no more clients, disconnect from SFU
        if (this.clients.size === 0) {
            if (this.sfuConnection) {
                this.sfuConnection.close();
                this.sfuConnection = null;
            }
            this.isConnectedToSFU = false;
            // Clear any reconnect timeout
            if (this.reconnectTimeout !== null) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
            // Stop the heartbeat when all clients are gone
            if (this.heartbeatInterval !== null) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
        }
    }
    fanOutToClients(data) {
        // Send data to all connected clients
        for (const [clientId, client] of this.clients.entries()) {
            try {
                client.send(data);
            }
            catch (error) {
                this.handleClientDisconnect(clientId);
            }
        }
    }
    // Send a status message to a specific client
    sendStatusToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client) {
            try {
                client.send(JSON.stringify({
                    type: "status",
                    message: message,
                    timestamp: new Date().toISOString(),
                    isConnectedToSFU: this.isConnectedToSFU,
                }));
            }
            catch (error) {
                console.error(`Error sending status to client ${clientId}:`, error);
                this.handleClientDisconnect(clientId);
            }
        }
    }
    // Broadcast a status message to all clients
    broadcastStatusToClients(message) {
        const statusMessage = JSON.stringify({
            type: "status",
            message: message,
            timestamp: new Date().toISOString(),
            isConnectedToSFU: this.isConnectedToSFU,
        });
        for (const [clientId, client] of this.clients.entries()) {
            try {
                client.send(statusMessage);
            }
            catch (error) {
                console.error(`Error broadcasting status to client ${clientId}:`, error);
                this.handleClientDisconnect(clientId);
            }
        }
    }
    // Start a heartbeat to periodically send status updates to clients
    startHeartbeat() {
        // Clear existing heartbeat if any
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval);
        }
        // Send a heartbeat every 3 seconds
        this.heartbeatInterval = setInterval(() => {
            const status = this.isConnectedToSFU
                ? "Connected to SFU, waiting for stream data..."
                : `Not connected to SFU: ${this.currentWsUrl}, attempting to connect...`;
            this.broadcastStatusToClients(status);
        }, 3000);
    }
}
