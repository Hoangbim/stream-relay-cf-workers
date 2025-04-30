var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { comparePassword, generateToken, hashPassword, verifyToken } from '../utils/auth';
import { apiDocumentation, htmlTemplate } from '../docs/api-docs';
// Define allowed origins for CORS
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://biabip.bandia.vn',
    'https://bip.bandia.vn'
    // Removed wildcard for better security
];
// Helper function to handle CORS headers
function getCorsHeaders(request) {
    // Get the origin from the request
    const origin = request.headers.get('Origin') || '';
    // Check if the origin is in our allowed list
    const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
    const corsOrigin = isAllowedOrigin ? origin : '';
    // Log it for debugging
    console.log(`Request origin: ${origin}, Allowed: ${isAllowedOrigin}`);
    return {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Origin, Accept, Referer, User-Agent',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin' // Important for caching with varying origins
    };
}
export class DataStore {
    constructor(state, env) {
        this.storage = state.storage;
        this.env = env;
    }
    // Handle HTTP requests
    async fetch(request) {
        const url = new URL(request.url);
        const path = url.pathname;
        // Debug - log the request details
        console.log(`Received ${request.method} request to ${path}`);
        // Handle OPTIONS requests for CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: getCorsHeaders(request)
            });
        }
        try {
            // Documentation route
            if (path === '/docs' && request.method === 'GET') {
                return this.handleDocs();
            }
            // Auth routes
            if (path === '/auth/register') {
                return this.handleRegister(request);
            }
            else if (path === '/auth/login') {
                return this.handleLogin(request);
            }
            // Table management
            else if (path === '/tables' && request.method === 'POST') {
                return this.handleCreateTable(request);
            }
            else if ((path === '/tables' || path === '/tables/') && request.method === 'GET') {
                return this.handleGetAllTables();
            }
            else if (path.match(/^\/tables\/[^\/]+\/?$/) && request.method === 'GET') {
                const tableId = path.split('/')[2];
                return this.handleGetTable(tableId);
            }
            // Player management within a table
            else if (path.match(/^\/tables\/[^\/]+\/players\/[^\/]+\/?$/) && request.method === 'POST') {
                const parts = path.split('/');
                const tableId = parts[2];
                const username = parts[4];
                return this.handleAddPlayerToTable(tableId, username);
            }
            else if (path.match(/^\/tables\/[^\/]+\/players\/[^\/]+\/?$/) && request.method === 'GET') {
                const parts = path.split('/');
                const tableId = parts[2];
                const username = parts[4];
                return this.handleGetPlayerInfo(tableId, username);
            }
            // Point transfers
            else if (path.match(/^\/tables\/[^\/]+\/players\/[^\/]+\/transfer\/?$/) && request.method === 'POST') {
                const parts = path.split('/');
                const tableId = parts[2];
                const fromUsername = parts[4];
                return this.handleTransferPoints(request, tableId, fromUsername);
            }
            else if (path.match(/^\/tables\/[^\/]+\/history\/?$/) && request.method === 'GET') {
                const tableId = path.split('/')[2];
                return this.handleGetTransferHistory(tableId);
            }
            // Player history
            else if (path.match(/^\/players\/[^\/]+\/history\/?$/) && request.method === 'GET') {
                const username = path.split('/')[2];
                return this.handlePlayerHistory(username, request);
            }
            // Player gameplay results
            else if (path.match(/^\/players\/[^\/]+\/results\/?$/) && request.method === 'GET') {
                const username = path.split('/')[2];
                return this.handlePlayerResults(username, request);
            }
            // Item management
            else if ((path === '/items' || path === '/items/') && request.method === 'POST') {
                return this.handleCreateItem(request);
            }
            else if ((path === '/items' || path === '/items/') && request.method === 'GET') {
                return this.handleGetAllItems();
            }
            // Route not found
            else {
                console.log(`Route not found: ${path}`);
                return new Response(JSON.stringify({ error: 'Not Found' }), {
                    status: 404,
                    headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(request))
                });
            }
        }
        catch (error) {
            console.error('Error processing request:', error);
            return new Response(JSON.stringify({
                error: `Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }), {
                status: 500,
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(request))
            });
        }
    }
    // User Registration
    async handleRegister(request) {
        try {
            const data = await request.json();
            // Validate required fields
            if (!data.username || !data.password) {
                return this.errorResponse('Username and password are required', 400, request);
            }
            // Get users or initialize empty array
            let users = await this.storage.get('users') || [];
            // Check if username exists
            if (users.some((u) => u.username === data.username)) {
                return this.errorResponse('Username already exists', 409, request);
            }
            // Create new user
            const hashedPassword = await hashPassword(data.password);
            const newUser = {
                id: crypto.randomUUID(),
                username: data.username,
                password: hashedPassword,
                createdAt: new Date().toISOString()
            };
            // Add to users array and store
            users.push(newUser);
            await this.storage.put('users', users);
            // Return user without password
            const { password } = newUser, userWithoutPassword = __rest(newUser, ["password"]);
            return new Response(JSON.stringify(userWithoutPassword), {
                status: 201,
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(request))
            });
        }
        catch (error) {
            return this.errorResponse('Error registering user', 500, request);
        }
    }
    // User Login
    async handleLogin(request) {
        try {
            const data = await request.json();
            // Validate required fields
            if (!data.username || !data.password) {
                return this.errorResponse('Username and password are required', 400, request);
            }
            // Get users
            const users = await this.storage.get('users') || [];
            // Find user
            const user = users.find((u) => u.username === data.username);
            if (!user) {
                return this.errorResponse('Invalid username or password', 401, request);
            }
            // Verify password (in a real app, you'd use bcrypt or similar)
            // Simple implementation for now
            const isValid = await comparePassword(data.password, user.password);
            if (!isValid) {
                return this.errorResponse('Invalid username or password', 401, request);
            }
            // Generate token with all required parameters
            const token = await generateToken(user.id, user.username, this.env.JWT_SECRET || 'your-secret-key');
            // Return user and token
            const response = {
                token,
                user: {
                    id: user.id,
                    username: user.username
                }
            };
            return new Response(JSON.stringify(response), {
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(request))
            });
        }
        catch (error) {
            return this.errorResponse('Error logging in', 500, request);
        }
    }
    // Create a new game table
    async handleCreateTable(request) {
        try {
            // Authenticate request
            const auth = await this.authenticateRequest(request);
            if (!auth.isAuthenticated) {
                return this.errorResponse(auth.error || 'Unauthorized', 401, request);
            }
            // Get data from request
            const data = await request.json();
            if (!data.tableName) {
                return this.errorResponse('Table name is required', 400, request);
            }
            // Use authenticated user as creator
            const creatorId = auth.userId || crypto.randomUUID(); // Ensure creatorId is always a string
            const users = await this.storage.get('users') || [];
            const creator = users.find((u) => u.id === creatorId);
            const creatorUsername = creator ? creator.username : 'unknown';
            // Create new table
            const newTable = {
                id: crypto.randomUUID(),
                name: data.tableName,
                createdAt: new Date().toISOString(),
                creatorId: creatorId,
                players: [
                    {
                        id: creatorId,
                        username: creatorUsername,
                        points: 0,
                        joinedAt: new Date().toISOString()
                    }
                ]
            };
            // Get tables or initialize
            let tables = await this.storage.get('tables') || [];
            tables.push(newTable);
            // Store updated tables
            await this.storage.put('tables', tables);
            return new Response(JSON.stringify(newTable), {
                status: 201,
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(request))
            });
        }
        catch (error) {
            return this.errorResponse('Error creating table', 500, request);
        }
    }
    // Get all tables - fixed to not require request parameter
    async handleGetAllTables() {
        try {
            const tables = await this.storage.get('tables') || [];
            return new Response(JSON.stringify(tables), {
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(new Request('')) // Pass a dummy request for CORS headers
                )
            });
        }
        catch (error) {
            return this.errorResponse('Error getting tables', 500, new Request(''));
        }
    }
    // Get a specific table
    async handleGetTable(tableId) {
        try {
            const tables = await this.storage.get('tables') || [];
            const table = tables.find((t) => t.id === tableId);
            if (!table) {
                return this.errorResponse('Table not found', 404, new Request(''));
            }
            return new Response(JSON.stringify(table), {
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(new Request('')) // Pass a dummy request for CORS headers
                )
            });
        }
        catch (error) {
            return this.errorResponse('Error getting table', 500, new Request(''));
        }
    }
    // Add a player to a table
    async handleAddPlayerToTable(tableId, username) {
        try {
            // Get tables
            let tables = await this.storage.get('tables') || [];
            const tableIndex = tables.findIndex((t) => t.id === tableId);
            if (tableIndex === -1) {
                return this.errorResponse('Table not found', 404, new Request(''));
            }
            // Get users
            const users = await this.storage.get('users') || [];
            const user = users.find((u) => u.username === username);
            if (!user) {
                return this.errorResponse('User not found', 404, new Request(''));
            }
            // Check if player already in table
            if (tables[tableIndex].players.some((p) => p.username === username)) {
                return this.errorResponse('Player already in table', 409, new Request(''));
            }
            // Add player to table
            const newPlayer = {
                id: user.id,
                username: user.username,
                points: 0,
                joinedAt: new Date().toISOString()
            };
            tables[tableIndex].players.push(newPlayer);
            // Store updated tables
            await this.storage.put('tables', tables);
            return new Response(JSON.stringify(newPlayer), {
                status: 201,
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(new Request('')) // Pass a dummy request for CORS headers
                )
            });
        }
        catch (error) {
            return this.errorResponse('Error adding player to table', 500, new Request(''));
        }
    }
    // Get player information within a table
    async handleGetPlayerInfo(tableId, username) {
        try {
            const tables = await this.storage.get('tables') || [];
            const table = tables.find((t) => t.id === tableId);
            if (!table) {
                return this.errorResponse('Table not found', 404, new Request(''));
            }
            const player = table.players.find((p) => p.username === username);
            if (!player) {
                return this.errorResponse('Player not found in table', 404, new Request(''));
            }
            return new Response(JSON.stringify(player), {
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(new Request('')) // Pass a dummy request for CORS headers
                )
            });
        }
        catch (error) {
            return this.errorResponse('Error getting player info', 500, new Request(''));
        }
    }
    // Transfer points between players
    async handleTransferPoints(request, tableId, fromUsername) {
        try {
            const data = await request.json();
            if (!data.toPlayerId || !data.amount || isNaN(data.amount) || data.amount <= 0) {
                return this.errorResponse('Valid recipient and amount are required', 400, request);
            }
            // Get tables
            let tables = await this.storage.get('tables') || [];
            const tableIndex = tables.findIndex((t) => t.id === tableId);
            if (tableIndex === -1) {
                return this.errorResponse('Table not found', 404, request);
            }
            const table = tables[tableIndex];
            // Find players
            const fromPlayerIndex = table.players.findIndex((p) => p.username === fromUsername);
            const toPlayerIndex = table.players.findIndex((p) => p.username === data.toPlayerId || p.id === data.toPlayerId);
            if (fromPlayerIndex === -1) {
                return this.errorResponse('Sender not found in table', 404, request);
            }
            if (toPlayerIndex === -1) {
                return this.errorResponse('Recipient not found in table', 404, request);
            }
            // Create transfer record
            const transfer = {
                id: crypto.randomUUID(),
                tableId,
                fromPlayerId: table.players[fromPlayerIndex].id,
                fromPlayerUsername: table.players[fromPlayerIndex].username,
                toPlayerId: table.players[toPlayerIndex].id,
                toPlayerUsername: table.players[toPlayerIndex].username,
                amount: data.amount,
                timestamp: new Date().toISOString()
            };
            // Update player points
            tables[tableIndex].players[fromPlayerIndex].points -= data.amount;
            tables[tableIndex].players[toPlayerIndex].points += data.amount;
            // Store updated tables
            await this.storage.put('tables', tables);
            // Store transfer history
            let transfers = await this.storage.get('transfers') || [];
            transfers.push(transfer);
            await this.storage.put('transfers', transfers);
            return new Response(JSON.stringify(transfer), {
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(request))
            });
        }
        catch (error) {
            return this.errorResponse('Error transferring points', 500, request);
        }
    }
    // Get transfer history for a table
    async handleGetTransferHistory(tableId) {
        try {
            const transfers = await this.storage.get('transfers') || [];
            const tableTransfers = transfers.filter((t) => t.tableId === tableId);
            return new Response(JSON.stringify(tableTransfers), {
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(new Request('')) // Pass a dummy request for CORS headers
                )
            });
        }
        catch (error) {
            return this.errorResponse('Error getting transfer history', 500, new Request(''));
        }
    }
    // Get player's history of all tables joined
    async handlePlayerHistory(username, request) {
        try {
            // First find the user
            const users = await this.storage.get('users') || [];
            const user = users.find((u) => u.username === username);
            if (!user) {
                return this.errorResponse('User not found', 404, request);
            }
            const userId = user.id;
            // Get all tables
            const tables = await this.storage.get('tables') || [];
            // Find tables the player has joined
            const playerTables = tables.filter((table) => {
                return table.players.some((player) => player.id === userId);
            });
            // Format the response data to include only relevant information
            const tableHistory = playerTables.map((table) => {
                const playerInfo = table.players.find((player) => player.id === userId);
                return {
                    tableId: table.id,
                    tableName: table.name,
                    joinedAt: playerInfo === null || playerInfo === void 0 ? void 0 : playerInfo.joinedAt,
                    currentPoints: playerInfo === null || playerInfo === void 0 ? void 0 : playerInfo.points,
                    createdAt: table.createdAt,
                    creatorId: table.creatorId,
                    isCreator: table.creatorId === userId
                };
            });
            return new Response(JSON.stringify(tableHistory), {
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(request))
            });
        }
        catch (error) {
            return this.errorResponse('Error retrieving player history', 500, request);
        }
    }
    // Get player's gameplay results - summary of transfers in a given time range
    async handlePlayerResults(username, request) {
        try {
            // Parse query parameters
            const url = new URL(request.url);
            const startDate = url.searchParams.get('startDate');
            const endDate = url.searchParams.get('endDate');
            // Find the user
            const users = await this.storage.get('users') || [];
            const user = users.find((u) => u.username === username);
            if (!user) {
                return this.errorResponse('User not found', 404, request);
            }
            const userId = user.id;
            // Get all transfers
            const transfers = await this.storage.get('transfers') || [];
            // Filter transfers by user ID and date range if provided
            let userTransfers = transfers.filter((transfer) => transfer.fromPlayerId === userId || transfer.toPlayerId === userId);
            // Apply date filters if provided
            if (startDate) {
                userTransfers = userTransfers.filter((transfer) => new Date(transfer.timestamp) >= new Date(startDate));
            }
            if (endDate) {
                userTransfers = userTransfers.filter((transfer) => new Date(transfer.timestamp) <= new Date(endDate));
            }
            // Calculate the total value (sum of outgoing and incoming transfers)
            let totalPoints = 0;
            userTransfers.forEach((transfer) => {
                if (transfer.fromPlayerId === userId) {
                    totalPoints -= transfer.amount; // Outgoing transfers are negative
                }
                if (transfer.toPlayerId === userId) {
                    totalPoints += transfer.amount; // Incoming transfers are positive
                }
            });
            // Create summary response
            const summary = {
                username,
                userId,
                totalPoints,
                transferCount: userTransfers.length,
                timeRange: {
                    start: startDate || 'beginning',
                    end: endDate || 'now'
                },
                transfers: userTransfers
            };
            return new Response(JSON.stringify(summary), {
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(request))
            });
        }
        catch (error) {
            return this.errorResponse('Error retrieving player results', 500, request);
        }
    }
    // Create a new item
    async handleCreateItem(request) {
        try {
            // Authenticate request
            const auth = await this.authenticateRequest(request);
            if (!auth.isAuthenticated) {
                return this.errorResponse(auth.error || 'Unauthorized', 401, request);
            }
            const data = await request.json();
            if (!data.name || !data.value || isNaN(data.value)) {
                return this.errorResponse('Name and valid value are required', 400, request);
            }
            const newItem = {
                id: crypto.randomUUID(),
                name: data.name,
                description: data.description || '',
                value: data.value,
                createdAt: new Date().toISOString()
            };
            // Store item
            let items = await this.storage.get('items') || [];
            items.push(newItem);
            await this.storage.put('items', items);
            return new Response(JSON.stringify(newItem), {
                status: 201,
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(request))
            });
        }
        catch (error) {
            return this.errorResponse('Error creating item', 500, request);
        }
    }
    // Get all items
    async handleGetAllItems() {
        try {
            const items = await this.storage.get('items') || [];
            return new Response(JSON.stringify(items), {
                headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(new Request('')) // Pass a dummy request for CORS headers
                )
            });
        }
        catch (error) {
            return this.errorResponse('Error getting items', 500, new Request(''));
        }
    }
    // Handle API documentation
    handleDocs() {
        // Create HTML with the API spec embedded
        const htmlWithSpec = htmlTemplate.replace('SWAGGER_SPEC', JSON.stringify(apiDocumentation));
        return new Response(htmlWithSpec, {
            headers: Object.assign({ 'Content-Type': 'text/html' }, getCorsHeaders(new Request('')) // Pass a dummy request for CORS headers
            )
        });
    }
    // Helper function to generate error responses
    errorResponse(message, status, request) {
        return new Response(JSON.stringify({ error: message }), {
            status,
            headers: Object.assign({ 'Content-Type': 'application/json' }, getCorsHeaders(request))
        });
    }
    // Helper to authenticate requests
    async authenticateRequest(request) {
        // Get authorization header
        const authHeader = request.headers.get('Authorization');
        // Check if auth header exists and has correct format
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { isAuthenticated: false, error: 'Missing or invalid authorization header' };
        }
        // Extract token
        const token = authHeader.replace('Bearer ', '');
        // Verify token
        const decoded = await verifyToken(token, this.env.JWT_SECRET || 'your-secret-key');
        if (!decoded) {
            return { isAuthenticated: false, error: 'Invalid token' };
        }
        return { isAuthenticated: true, userId: decoded.sub };
    }
}
