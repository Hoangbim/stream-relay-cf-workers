import { ChatRoom } from './durable_objects/ChatRoom';
import { StreamRelay } from './durable_objects/StreamRelay';
export { ChatRoom, StreamRelay };
// Keep track of known room IDs
const KNOWN_ROOMS = new Set(['default', 'general', 'random', 'support']);
// Keep track of known stream IDs
const KNOWN_STREAMS = new Set(['test_stream', 'test_stream_audio', 'main']);
// Main worker entry point
const worker = {
    async fetch(request, env) {
        const url = new URL(request.url);
        // Route requests to the chat room WebSocket endpoint
        if (url.pathname.startsWith('/chat/')) {
            // Get chat room name from the URL
            const roomId = url.pathname.substring('/chat/'.length) || 'default';
            // Create a Durable Object ID based on the room name
            const id = env.CHAT_ROOM.idFromName(roomId);
            // Get stub for the Durable Object
            const stub = env.CHAT_ROOM.get(id);
            // Forward the request to the Durable Object
            return stub.fetch(request);
        }
        // Route requests to the stream relay WebSocket endpoint
        if (url.pathname.startsWith('/stream/')) {
            // Get stream ID from the URL
            const streamId = url.pathname.substring('/stream/'.length);
            if (!streamId) {
                return new Response("Stream ID is required", { status: 400 });
            }
            // Create a Durable Object ID based on the stream ID
            const id = env.STREAM_RELAY.idFromName(`stream:${streamId}`);
            // Get stub for the Durable Object
            const stub = env.STREAM_RELAY.get(id);
            // Forward the request to the Durable Object
            return stub.fetch(request);
        }
        // List available streams
        if (url.pathname === '/api/streams' && request.method === 'GET') {
            return new Response(JSON.stringify([...KNOWN_STREAMS]), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // API endpoint to create a new stream
        if (url.pathname === '/api/streams' && request.method === 'POST') {
            try {
                const { streamId } = await request.json();
                // Validate stream ID
                if (!streamId || typeof streamId !== 'string' || streamId.trim() === '') {
                    return new Response(JSON.stringify({ error: 'Invalid stream ID' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                const sanitizedStreamId = streamId.trim().replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
                // Add to known streams
                KNOWN_STREAMS.add(sanitizedStreamId);
                return new Response(JSON.stringify({ streamId: sanitizedStreamId }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            catch (error) {
                return new Response(JSON.stringify({ error: 'Invalid request body' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        // API endpoint to list active rooms
        if (url.pathname === '/api/rooms' && request.method === 'GET') {
            // For a real app, we'd store rooms in Durable Objects or KV
            // For this demo, we're using a predefined list
            return new Response(JSON.stringify([...KNOWN_ROOMS]), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // API endpoint to create a new room
        if (url.pathname === '/api/rooms' && request.method === 'POST') {
            try {
                const { roomId } = await request.json();
                // Validate room ID
                if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
                    return new Response(JSON.stringify({ error: 'Invalid room ID' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                const sanitizedRoomId = roomId.trim().replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
                // Add to known rooms (in a real app, we'd store this in KV or DO)
                KNOWN_ROOMS.add(sanitizedRoomId);
                return new Response(JSON.stringify({ roomId: sanitizedRoomId }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            catch (error) {
                return new Response(JSON.stringify({ error: 'Invalid request body' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        // Route to a specific room's UI
        if (url.pathname.startsWith('/room/')) {
            const roomId = url.pathname.substring('/room/'.length) || 'default';
            // Render the chat room UI with the room ID
            return this.renderChatUI(roomId);
        }
        // Route to a specific stream's UI
        if (url.pathname.startsWith('/view/')) {
            const streamId = url.pathname.substring('/view/'.length);
            if (!streamId) {
                return new Response("Stream ID is required", { status: 400 });
            }
            // Render the stream viewer UI with the stream ID
            return this.renderStreamUI(streamId);
        }
        // Handle different request methods for non-chat endpoints
        if (request.method === 'GET') {
            // Serve home page listing all chat rooms and streams
            if (url.pathname === '/' || url.pathname === '') {
                return this.renderHomePage();
            }
            return new Response('Not Found', { status: 404 });
        }
        else if (request.method === 'POST') {
            const requestBody = await request.json();
            return new Response(JSON.stringify({ received: requestBody }), { status: 200 });
        }
        else {
            return new Response('Method Not Allowed', { status: 405 });
        }
    },
    // Render the home page with links to rooms and streams
    renderHomePage() {
        const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>WebSocket Chat & Streaming</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2 { color: #333; }
        .container { display: flex; gap: 20px; }
        .section { flex: 1; padding: 15px; background-color: #f5f5f5; border-radius: 5px; }
        .item-list { margin: 20px 0; }
        .list-item { 
          padding: 15px; 
          margin-bottom: 10px; 
          background-color: #fff; 
          border-radius: 5px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .list-item:hover { background-color: #f9f9f9; }
        .item-name { font-weight: bold; font-size: 1.2em; }
        .create-form {
          margin-top: 20px;
          padding: 15px;
          background-color: #eef8ff;
          border-radius: 5px;
        }
        input, button {
          padding: 8px 12px;
          margin-right: 10px;
        }
        button {
          background-color: #4CAF50;
          color: white;
          border: none;
          cursor: pointer;
          border-radius: 4px;
        }
        button:hover { background-color: #45a049; }
        .join-btn { background-color: #2196F3; }
        .join-btn:hover { background-color: #0b7dda; }
        .error { color: #cc0000; margin-top: 10px; }
      </style>
    </head>
    <body>
      <h1>WebSocket Chat & Streaming</h1>
      
      <div class="container">
        <div class="section">
          <h2>Chat Rooms</h2>
          
          <div class="create-form">
            <h3>Create a New Room</h3>
            <div>
              <input type="text" id="new-room-input" placeholder="Enter room name...">
              <button id="create-room-btn">Create Room</button>
              <div id="create-room-error" class="error"></div>
            </div>
          </div>
          
          <h3>Available Rooms</h3>
          <div id="room-list" class="item-list">
            <div class="list-item">
              <div>Loading rooms...</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>Live Streams</h2>
          
          <div class="create-form">
            <h3>Create a New Stream</h3>
            <div>
              <input type="text" id="new-stream-input" placeholder="Enter stream ID...">
              <button id="create-stream-btn">Create Stream</button>
              <div id="create-stream-error" class="error"></div>
            </div>
          </div>
          
          <h3>Available Streams</h3>
          <div id="stream-list" class="item-list">
            <div class="list-item">
              <div>Loading streams...</div>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        // Fetch all available rooms
        async function loadRooms() {
          try {
            const response = await fetch('/api/rooms');
            const rooms = await response.json();
            
            const roomListEl = document.getElementById('room-list');
            
            if (rooms.length === 0) {
              roomListEl.innerHTML = '<div class="list-item">No rooms available. Create one!</div>';
              return;
            }
            
            roomListEl.innerHTML = '';
            
            rooms.forEach(roomId => {
              const roomItem = document.createElement('div');
              roomItem.className = 'list-item';
              
              const roomInfo = document.createElement('div');
              roomInfo.className = 'item-name';
              roomInfo.textContent = roomId;
              
              const joinButton = document.createElement('button');
              joinButton.className = 'join-btn';
              joinButton.textContent = 'Join Room';
              joinButton.onclick = () => joinRoom(roomId);
              
              roomItem.appendChild(roomInfo);
              roomItem.appendChild(joinButton);
              roomListEl.appendChild(roomItem);
            });
          } catch (error) {
            console.error('Error loading rooms:', error);
            document.getElementById('room-list').innerHTML = 
              '<div class="list-item">Error loading rooms. Please try again.</div>';
          }
        }
        
        // Fetch all available streams
        async function loadStreams() {
          try {
            const response = await fetch('/api/streams');
            const streams = await response.json();
            
            const streamListEl = document.getElementById('stream-list');
            
            if (streams.length === 0) {
              streamListEl.innerHTML = '<div class="list-item">No streams available. Create one!</div>';
              return;
            }
            
            streamListEl.innerHTML = '';
            
            streams.forEach(streamId => {
              const streamItem = document.createElement('div');
              streamItem.className = 'list-item';
              
              const streamInfo = document.createElement('div');
              streamInfo.className = 'item-name';
              streamInfo.textContent = streamId;
              
              const viewButton = document.createElement('button');
              viewButton.className = 'join-btn';
              viewButton.textContent = 'View Stream';
              viewButton.onclick = () => viewStream(streamId);
              
              streamItem.appendChild(streamInfo);
              streamItem.appendChild(viewButton);
              streamListEl.appendChild(streamItem);
            });
          } catch (error) {
            console.error('Error loading streams:', error);
            document.getElementById('stream-list').innerHTML = 
              '<div class="list-item">Error loading streams. Please try again.</div>';
          }
        }
        
        // Join a specific room
        function joinRoom(roomId) {
          window.location.href = \`/room/\${roomId}\`;
        }
        
        // View a specific stream
        function viewStream(streamId) {
          window.location.href = \`/view/\${streamId}\`;
        }
        
        // Create a new room
        async function createRoom() {
          const roomIdInput = document.getElementById('new-room-input');
          const roomId = roomIdInput.value.trim();
          const errorEl = document.getElementById('create-room-error');
          
          if (!roomId) {
            errorEl.textContent = 'Please enter a room name';
            return;
          }
          
          if (!/^[a-zA-Z0-9_-]+$/.test(roomId)) {
            errorEl.textContent = 'Room name can only contain letters, numbers, underscores and hyphens';
            return;
          }
          
          try {
            const response = await fetch('/api/rooms', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ roomId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
              // Redirect to the new room
              window.location.href = \`/room/\${data.roomId}\`;
            } else {
              errorEl.textContent = data.error || 'Failed to create room';
            }
          } catch (error) {
            console.error('Error creating room:', error);
            errorEl.textContent = 'An error occurred. Please try again.';
          }
        }
        
        // Create a new stream
        async function createStream() {
          const streamIdInput = document.getElementById('new-stream-input');
          const streamId = streamIdInput.value.trim();
          const errorEl = document.getElementById('create-stream-error');
          
          if (!streamId) {
            errorEl.textContent = 'Please enter a stream ID';
            return;
          }
          
          if (!/^[a-zA-Z0-9_-]+$/.test(streamId)) {
            errorEl.textContent = 'Stream ID can only contain letters, numbers, underscores and hyphens';
            return;
          }
          
          try {
            const response = await fetch('/api/streams', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ streamId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
              // Redirect to the new stream
              window.location.href = \`/view/\${data.streamId}\`;
            } else {
              errorEl.textContent = data.error || 'Failed to create stream';
            }
          } catch (error) {
            console.error('Error creating stream:', error);
            errorEl.textContent = 'An error occurred. Please try again.';
          }
        }
        
        // Set up event listeners
        document.getElementById('create-room-btn').addEventListener('click', createRoom);
        document.getElementById('new-room-input').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') createRoom();
        });
        
        document.getElementById('create-stream-btn').addEventListener('click', createStream);
        document.getElementById('new-stream-input').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') createStream();
        });
        
        // Load data when page loads
        loadRooms();
        loadStreams();
      </script>
    </body>
    </html>
    `;
        return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
        });
    },
    // Render the stream viewer UI
    renderStreamUI(streamId) {
        const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Stream: ${streamId}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; }
        .stream-container { 
          width: 100%; 
          max-width: 960px; 
          aspect-ratio: 16 / 9;
          margin: 20px auto; 
          background: #000; 
          position: relative;
        }
        video { 
          width: 100%; 
          height: 100%; 
          display: block; 
        }
        .info-panel {
          margin: 20px 0;
          padding: 15px;
          background: #f5f5f5;
          border-radius: 5px;
        }
        .status-indicator {
          display: inline-block;
          width: 12px;
          height: 12px;
          background: #ccc;
          border-radius: 50%;
          margin-right: 8px;
        }
        .status-live {
          background: #ff0000;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        .back-btn {
          display: inline-block;
          padding: 8px 16px;
          background: #f0f0f0;
          color: #333;
          text-decoration: none;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        .back-btn:hover {
          background: #e0e0e0;
        }
        .status-message {
          font-style: italic;
          color: #666;
        }
        .log-container {
          margin-top: 20px;
          max-height: 150px;
          overflow-y: auto;
          border: 1px solid #ddd;
          padding: 10px;
          background: #f9f9f9;
          font-family: monospace;
          font-size: 12px;
        }
        .log-entry {
          margin-bottom: 5px;
          border-bottom: 1px solid #eee;
          padding-bottom: 3px;
        }
        .log-timestamp {
          color: #999;
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <a href="/" class="back-btn">← Back to Home</a>
      <h1>Stream: ${streamId}</h1>
      
      <div class="info-panel">
        <div>
          <span id="status-indicator" class="status-indicator"></span>
          <span id="status-text">Connecting...</span>
        </div>
        <div id="connection-info" class="status-message"></div>
        
        <div class="log-container" id="status-log">
          <!-- Status messages will be added here -->
        </div>
      </div>
      
      <div class="stream-container">
        <video id="videoPlayer" autoplay muted playsinline></video>
      </div>
      
      <script>
        const video = document.getElementById('videoPlayer');
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const connectionInfo = document.getElementById('connection-info');
        const statusLog = document.getElementById('status-log');
        
        // WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(\`\${protocol}//\${window.location.host}/stream/${streamId}\`);
        
        // Set up media source
        const mediaSource = new MediaSource();
        video.src = URL.createObjectURL(mediaSource);
        
        mediaSource.addEventListener('sourceopen', () => {
          statusText.textContent = 'MediaSource opened, waiting for video data...';
          
          // Create source buffer when we receive codec info
          ws.addEventListener('message', function(event) {
            try {
              // Check if the message is a status message (JSON)
              if (typeof event.data === 'string') {
                try {
                  const statusData = JSON.parse(event.data);
                  if (statusData.type === 'status') {
                    addStatusLogEntry(statusData.message, new Date(statusData.timestamp));
                    connectionInfo.textContent = statusData.message;
                    
                    if (statusData.isConnectedToSFU) {
                      statusText.textContent = 'Connected to SFU';
                    } else {
                      statusText.textContent = 'Waiting for SFU connection';
                      statusIndicator.classList.remove('status-live');
                    }
                    return;
                  }
                } catch (jsonError) {
                  // Not JSON data, treat as binary
                  console.log('Non-JSON message received');
                }
              }
              
              // Handle binary data (codec info or video chunks)
              const data = event.data;
              
              if (!mediaSource.sourceBuffers.length) {
                // Create a source buffer and set up the rest of the pipeline
                setupSourceBuffer(data);
              } else {
                // Append subsequent video chunks
                appendToSourceBuffer(data);
              }
            } catch (e) {
              console.error('Error processing message:', e);
              statusText.textContent = 'Error processing data';
              connectionInfo.textContent = e.message;
              addStatusLogEntry('Error: ' + e.message);
            }
          });
        });
        
        let sourceBuffer;
        let queue = [];
        let isUpdating = false;
        
        function setupSourceBuffer(codecData) {
          try {
            // Create source buffer with codec information
            sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="hvc1"');
            sourceBuffer.mode = 'segments';
            
            sourceBuffer.addEventListener('updateend', () => {
              isUpdating = false;
              
              // Process any queued data
              if (queue.length > 0 && !mediaSource.readyState !== 'closed') {
                const nextData = queue.shift();
                appendToSourceBuffer(nextData);
              }
              
              // If we've successfully started playing, update the status
              if (video.readyState >= 3) {  // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
                statusIndicator.classList.add('status-live');
                statusText.textContent = 'Live';
                connectionInfo.textContent = 'Connected to stream';
                addStatusLogEntry('Video playback started');
              }
            });
            
            // Append the initial codec data
            appendToSourceBuffer(codecData);
            addStatusLogEntry('Received codec information');
            
          } catch (e) {
            console.error('Error setting up source buffer:', e);
            statusText.textContent = 'Error setting up video decoder';
            connectionInfo.textContent = e.message;
            addStatusLogEntry('Error setting up decoder: ' + e.message);
          }
        }
        
        function appendToSourceBuffer(data) {
          if (!sourceBuffer) {
            console.error('Source buffer not initialized');
            return;
          }
          
          if (isUpdating || queue.length > 0) {
            // If we're already updating or have a queue, add to queue
            queue.push(data);
            return;
          }
          
          try {
            // Process the data
            isUpdating = true;
            
            // Convert the data to an ArrayBuffer if it's not already
            if (data instanceof Blob) {
              const reader = new FileReader();
              reader.onload = function() {
                sourceBuffer.appendBuffer(reader.result);
              };
              reader.readAsArrayBuffer(data);
            } else {
              sourceBuffer.appendBuffer(data);
            }
          } catch (e) {
            isUpdating = false;
            console.error('Error appending to source buffer:', e);
            addStatusLogEntry('Buffer error: ' + e.message);
            
            if (e.name === 'QuotaExceededError') {
              // Remove some data from buffer to make room
              const removeStart = 0;
              const removeEnd = sourceBuffer.buffered.end(0) / 2;
              sourceBuffer.remove(removeStart, removeEnd);
            }
          }
        }
        
        function addStatusLogEntry(message, timestamp = new Date()) {
          const entry = document.createElement('div');
          entry.className = 'log-entry';
          
          const time = document.createElement('span');
          time.className = 'log-timestamp';
          time.textContent = formatTime(timestamp);
          
          entry.appendChild(time);
          entry.appendChild(document.createTextNode(message));
          
          statusLog.appendChild(entry);
          
          // Auto-scroll to bottom
          statusLog.scrollTop = statusLog.scrollHeight;
          
          // Limit the number of log entries (keep most recent 50)
          while (statusLog.children.length > 50) {
            statusLog.removeChild(statusLog.firstChild);
          }
        }
        
        function formatTime(date) {
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        }
        
        // WebSocket event handlers
        ws.onopen = () => {
          statusText.textContent = 'Connected, waiting for stream...';
          connectionInfo.textContent = 'WebSocket connection established';
          addStatusLogEntry('WebSocket connection established');
        };
        
        ws.onclose = () => {
          statusIndicator.classList.remove('status-live');
          statusText.textContent = 'Disconnected';
          connectionInfo.textContent = 'WebSocket connection closed';
          addStatusLogEntry('WebSocket connection closed');
        };
        
        ws.onerror = (error) => {
          statusIndicator.classList.remove('status-live');
          statusText.textContent = 'Error';
          connectionInfo.textContent = 'WebSocket error occurred';
          addStatusLogEntry('WebSocket error occurred');
          console.error('WebSocket error:', error);
        };
      </script>
    </body>
    </html>
    `;
        return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
        });
    },
    // Render the chat UI for a specific room
    renderChatUI(roomId) {
        const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Room: ${roomId} - WebSocket Chat</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
        .container { display: flex; gap: 20px; }
        .chat-container { flex: 3; }
        .sidebar { flex: 1; background: #f5f5f5; padding: 15px; border-radius: 5px; }
        
        #messages { height: 400px; overflow-y: scroll; border: 1px solid #ccc; margin-bottom: 10px; padding: 10px; }
        #message-form { display: flex; }
        #message-input { flex-grow: 1; margin-right: 10px; padding: 8px; }
        
        .system-message { color: #888; font-style: italic; padding: 4px 0; }
        .user-message { margin-bottom: 8px; padding: 4px 0; }
        .username { font-weight: bold; color: #0066cc; }
        
        .user-list { margin-bottom: 20px; }
        .user-list h3 { margin-top: 0; }
        
        .username-container { margin-bottom: 20px; }
        #username-form { display: flex; flex-direction: column; gap: 10px; }
        
        .error-message { color: #cc0000; font-style: italic; }
        .timestamp { color: #888; font-size: 0.8em; margin-left: 10px; }
        
        .message-history-divider {
          text-align: center;
          border-bottom: 1px solid #ccc;
          line-height: 0.1em;
          margin: 15px 0;
        }
        
        .message-history-divider span {
          background: #fff;
          padding: 0 10px;
          color: #888;
          font-style: italic;
          font-size: 0.9em;
        }
        
        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .room-name {
          font-size: 1.4em;
          font-weight: bold;
          color: #333;
        }
        
        .back-to-rooms {
          background-color: #f0f0f0;
          color: #333;
          text-decoration: none;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 0.9em;
        }
        
        .back-to-rooms:hover {
          background-color: #e0e0e0;
        }
      </style>
    </head>
    <body>
      <div class="room-header">
        <div class="room-name">Room: ${roomId}</div>
        <a href="/" class="back-to-rooms">← Back to Room List</a>
      </div>
      
      <div class="container">
        <div class="chat-container">
          <div id="messages"></div>
          <form id="message-form">
            <input type="text" id="message-input" placeholder="Type a message..." autocomplete="off">
            <button type="submit">Send</button>
          </form>
        </div>
        
        <div class="sidebar">
          <div class="username-container">
            <h3>Your Profile</h3>
            <form id="username-form">
              <input type="text" id="username-input" placeholder="Set your username" autocomplete="off">
              <button type="submit">Update Username</button>
            </form>
            <div id="current-username"></div>
          </div>
          
          <div class="user-list">
            <h3>Users in Room</h3>
            <div id="users-online"></div>
          </div>
        </div>
      </div>

      <script>
        const messagesDiv = document.getElementById('messages');
        const messageForm = document.getElementById('message-form');
        const messageInput = document.getElementById('message-input');
        const usernameForm = document.getElementById('username-form');
        const usernameInput = document.getElementById('username-input');
        const currentUsernameDiv = document.getElementById('current-username');
        const usersOnlineDiv = document.getElementById('users-online');
        
        let currentUsername = '';
        let users = [];
        let hasShownHistory = false;
        let currentRoomId = '${roomId}';
        
        // Connect to WebSocket for this specific room
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(\`\${protocol}//\${window.location.host}/chat/\${currentRoomId}\`);
        
        ws.onopen = () => {
          addSystemMessage('Connected to chat room');
        };
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'system') {
            addSystemMessage(data.message);
          } 
          else if (data.type === 'message') {
            addUserMessage(data.username, data.text, new Date(data.timestamp));
          } 
          else if (data.type === 'error') {
            addErrorMessage(data.message);
          }
          else if (data.type === 'userList') {
            updateUserList(data.users);
          }
          else if (data.type === 'usernameChanged') {
            currentUsername = data.username;
            currentUsernameDiv.textContent = 'Your username: ' + currentUsername;
          }
          else if (data.type === 'roomInfo') {
            // Update room information if needed
            document.title = \`Room: \${data.roomId} - WebSocket Chat\`;
          }
          else if (data.type === 'messageHistory' && !hasShownHistory) {
            hasShownHistory = true;
            if (data.messages && data.messages.length > 0) {
              // Add a divider to show where history begins
              const divider = document.createElement('div');
              divider.className = 'message-history-divider';
              divider.innerHTML = '<span>Previous messages</span>';
              messagesDiv.appendChild(divider);
              
              // Add each message from history
              data.messages.forEach(msg => {
                if (msg.username) {
                  addUserMessage(msg.username, msg.text, new Date(msg.timestamp), true);
                } else if (msg.from) {
                  // Handle older message format that might not have username
                  addUserMessage('User-' + msg.from.substring(0, 6), msg.text, new Date(msg.timestamp), true);
                }
              });
              
              // Add a divider to show where new messages start
              const endDivider = document.createElement('div');
              endDivider.className = 'message-history-divider';
              endDivider.innerHTML = '<span>New messages</span>';
              messagesDiv.appendChild(endDivider);
              
              // Scroll to the end of history
              messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
          }
        };
        
        ws.onclose = () => {
          addSystemMessage('Disconnected from the chat server');
        };
        
        // Handle sending messages
        messageForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const text = messageInput.value.trim();
          
          if (text) {
            ws.send(JSON.stringify({ text }));
            messageInput.value = '';
          }
        });
        
        // Handle username updates
        usernameForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const username = usernameInput.value.trim();
          
          if (username && username.length >= 3) {
            ws.send(JSON.stringify({ 
              type: 'setUsername', 
              username 
            }));
            usernameInput.value = '';
          } else {
            addErrorMessage('Username must be at least 3 characters');
          }
        });
        
        function addSystemMessage(message) {
          const div = document.createElement('div');
          div.textContent = message;
          div.className = 'system-message';
          messagesDiv.appendChild(div);
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        function addUserMessage(username, message, timestamp, isHistory = false) {
          const div = document.createElement('div');
          div.className = 'user-message';
          
          const usernameSpan = document.createElement('span');
          usernameSpan.className = 'username';
          usernameSpan.textContent = username + ': ';
          
          const messageText = document.createTextNode(message);
          
          const timeSpan = document.createElement('span');
          timeSpan.className = 'timestamp';
          timeSpan.textContent = formatTime(timestamp);
          
          div.appendChild(usernameSpan);
          div.appendChild(messageText);
          div.appendChild(timeSpan);
          
          messagesDiv.appendChild(div);
          
          // Only auto-scroll for new messages, not for history
          if (!isHistory) {
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
          }
        }
        
        function addErrorMessage(message) {
          const div = document.createElement('div');
          div.textContent = 'Error: ' + message;
          div.className = 'error-message';
          messagesDiv.appendChild(div);
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        function updateUserList(userList) {
          users = userList;
          usersOnlineDiv.innerHTML = '';
          
          userList.forEach(user => {
            const div = document.createElement('div');
            div.textContent = user.username;
            usersOnlineDiv.appendChild(div);
          });
        }
        
        function formatTime(date) {
          return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      </script>
    </body>
    </html>
    `;
        return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
        });
    }
};
export default worker;
