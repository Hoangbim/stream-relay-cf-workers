export const apiDocumentation = {
    openapi: "3.0.0",
    info: {
        title: "Point Tracking System API",
        description: "API for managing users, game tables, player points, and inventory items",
        version: "1.0.0"
    },
    servers: [
        {
            url: "https://localhost:8787/api",
            description: "Production API server"
        }
    ],
    tags: [
        {
            name: "Authentication",
            description: "User registration and login"
        },
        {
            name: "Tables",
            description: "Game table management"
        },
        {
            name: "Players",
            description: "Player management within tables"
        },
        {
            name: "Points",
            description: "Point transfers between players"
        },
        {
            name: "Items",
            description: "Inventory item management"
        }
    ],
    paths: {
        "/auth/register": {
            post: {
                tags: ["Authentication"],
                summary: "Register a new user",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    username: {
                                        type: "string",
                                        description: "Username for the new user"
                                    },
                                    password: {
                                        type: "string",
                                        description: "Password for the new user"
                                    }
                                },
                                required: ["username", "password"]
                            }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "User successfully registered",
                        content: {
                            "application/json": {
                                example: {
                                    id: "123e4567-e89b-12d3-a456-426614174000",
                                    username: "exampleUser",
                                    createdAt: "2025-04-20T12:00:00.000Z"
                                }
                            }
                        }
                    },
                    "400": {
                        description: "Bad request - missing required fields",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Username and password are required"
                                }
                            }
                        }
                    },
                    "409": {
                        description: "Conflict - username already exists",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Username already exists"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/auth/login": {
            post: {
                tags: ["Authentication"],
                summary: "Login with username and password",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    username: {
                                        type: "string",
                                        description: "User's username"
                                    },
                                    password: {
                                        type: "string",
                                        description: "User's password"
                                    }
                                },
                                required: ["username", "password"]
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Login successful",
                        content: {
                            "application/json": {
                                example: {
                                    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                    user: {
                                        id: "123e4567-e89b-12d3-a456-426614174000",
                                        username: "exampleUser"
                                    }
                                }
                            }
                        }
                    },
                    "400": {
                        description: "Bad request - missing required fields",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Username and password are required"
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Unauthorized - invalid credentials",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Invalid username or password"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/tables": {
            post: {
                tags: ["Tables"],
                summary: "Create a new game table",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    tableName: {
                                        type: "string",
                                        description: "Name of the game table"
                                    }
                                },
                                required: ["tableName"]
                            }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Table created successfully",
                        content: {
                            "application/json": {
                                example: {
                                    id: "123e4567-e89b-12d3-a456-426614174000",
                                    name: "Poker Night",
                                    createdAt: "2025-04-20T12:00:00.000Z",
                                    creatorId: "user-123",
                                    players: [
                                        {
                                            id: "user-123",
                                            username: "creator",
                                            points: 0,
                                            joinedAt: "2025-04-20T12:00:00.000Z"
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    "400": {
                        description: "Bad request - missing required fields",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Table name is required"
                                }
                            }
                        }
                    }
                }
            },
            get: {
                tags: ["Tables"],
                summary: "Get all game tables",
                responses: {
                    "200": {
                        description: "List of all game tables",
                        content: {
                            "application/json": {
                                example: [
                                    {
                                        id: "123e4567-e89b-12d3-a456-426614174000",
                                        name: "Poker Night",
                                        createdAt: "2025-04-20T12:00:00.000Z",
                                        creatorId: "user-123",
                                        players: [
                                            {
                                                id: "user-123",
                                                username: "creator",
                                                points: 0,
                                                joinedAt: "2025-04-20T12:00:00.000Z"
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        "/tables/{tableId}": {
            get: {
                tags: ["Tables"],
                summary: "Get a specific game table",
                parameters: [
                    {
                        name: "tableId",
                        in: "path",
                        required: true,
                        description: "ID of the game table",
                        schema: {
                            type: "string"
                        }
                    }
                ],
                responses: {
                    "200": {
                        description: "Game table details",
                        content: {
                            "application/json": {
                                example: {
                                    id: "123e4567-e89b-12d3-a456-426614174000",
                                    name: "Poker Night",
                                    createdAt: "2025-04-20T12:00:00.000Z",
                                    creatorId: "user-123",
                                    players: [
                                        {
                                            id: "user-123",
                                            username: "creator",
                                            points: 100,
                                            joinedAt: "2025-04-20T12:00:00.000Z"
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    "404": {
                        description: "Table not found",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Table not found"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/tables/{tableId}/players/{username}": {
            post: {
                tags: ["Players"],
                summary: "Add a player to a table",
                parameters: [
                    {
                        name: "tableId",
                        in: "path",
                        required: true,
                        description: "ID of the game table",
                        schema: {
                            type: "string"
                        }
                    },
                    {
                        name: "username",
                        in: "path",
                        required: true,
                        description: "Username of the player to add",
                        schema: {
                            type: "string"
                        }
                    }
                ],
                responses: {
                    "201": {
                        description: "Player added to table",
                        content: {
                            "application/json": {
                                example: {
                                    id: "user-123",
                                    username: "player1",
                                    points: 0,
                                    joinedAt: "2025-04-20T12:00:00.000Z"
                                }
                            }
                        }
                    },
                    "404": {
                        description: "Table or user not found",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Table not found"
                                }
                            }
                        }
                    },
                    "409": {
                        description: "Player already in table",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Player already in table"
                                }
                            }
                        }
                    }
                }
            },
            get: {
                tags: ["Players"],
                summary: "Get player information within a table",
                parameters: [
                    {
                        name: "tableId",
                        in: "path",
                        required: true,
                        description: "ID of the game table",
                        schema: {
                            type: "string"
                        }
                    },
                    {
                        name: "username",
                        in: "path",
                        required: true,
                        description: "Username of the player",
                        schema: {
                            type: "string"
                        }
                    }
                ],
                responses: {
                    "200": {
                        description: "Player information",
                        content: {
                            "application/json": {
                                example: {
                                    id: "user-123",
                                    username: "player1",
                                    points: 100,
                                    joinedAt: "2025-04-20T12:00:00.000Z"
                                }
                            }
                        }
                    },
                    "404": {
                        description: "Table or player not found",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Player not found in table"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/tables/{tableId}/players/{username}/transfer": {
            post: {
                tags: ["Points"],
                summary: "Transfer points from one player to another",
                parameters: [
                    {
                        name: "tableId",
                        in: "path",
                        required: true,
                        description: "ID of the game table",
                        schema: {
                            type: "string"
                        }
                    },
                    {
                        name: "username",
                        in: "path",
                        required: true,
                        description: "Username of the player sending points",
                        schema: {
                            type: "string"
                        }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    toPlayerId: {
                                        type: "string",
                                        description: "Username or ID of the recipient player"
                                    },
                                    amount: {
                                        type: "number",
                                        description: "Amount of points to transfer"
                                    }
                                },
                                required: ["toPlayerId", "amount"]
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Points transferred successfully",
                        content: {
                            "application/json": {
                                example: {
                                    id: "transfer-123",
                                    tableId: "table-123",
                                    fromPlayerId: "user-123",
                                    fromPlayerUsername: "sender",
                                    toPlayerId: "user-456",
                                    toPlayerUsername: "receiver",
                                    amount: 50,
                                    timestamp: "2025-04-20T12:00:00.000Z"
                                }
                            }
                        }
                    },
                    "400": {
                        description: "Bad request - invalid amount or recipient",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Valid recipient and amount are required"
                                }
                            }
                        }
                    },
                    "404": {
                        description: "Table or player not found",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Recipient not found in table"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/tables/{tableId}/history": {
            get: {
                tags: ["Points"],
                summary: "Get point transfer history for a table",
                parameters: [
                    {
                        name: "tableId",
                        in: "path",
                        required: true,
                        description: "ID of the game table",
                        schema: {
                            type: "string"
                        }
                    }
                ],
                responses: {
                    "200": {
                        description: "Transfer history for the table",
                        content: {
                            "application/json": {
                                example: [
                                    {
                                        id: "transfer-123",
                                        tableId: "table-123",
                                        fromPlayerId: "user-123",
                                        fromPlayerUsername: "sender",
                                        toPlayerId: "user-456",
                                        toPlayerUsername: "receiver",
                                        amount: 50,
                                        timestamp: "2025-04-20T12:00:00.000Z"
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        "/players/{username}/history": {
            get: {
                tags: ["Players"],
                summary: "Get history of tables a player has joined",
                parameters: [
                    {
                        name: "username",
                        in: "path",
                        required: true,
                        description: "Username of the player",
                        schema: {
                            type: "string"
                        }
                    }
                ],
                responses: {
                    "200": {
                        description: "List of tables the player has joined with timestamps",
                        content: {
                            "application/json": {
                                example: [
                                    {
                                        tableId: "table-123",
                                        tableName: "Poker Night",
                                        joinedAt: "2025-04-20T12:00:00.000Z",
                                        currentPoints: 150,
                                        createdAt: "2025-04-18T10:00:00.000Z",
                                        creatorId: "user-456",
                                        isCreator: false
                                    },
                                    {
                                        tableId: "table-456",
                                        tableName: "Blackjack Table",
                                        joinedAt: "2025-04-19T14:30:00.000Z",
                                        currentPoints: 75,
                                        createdAt: "2025-04-19T14:00:00.000Z",
                                        creatorId: "user-123",
                                        isCreator: true
                                    }
                                ]
                            }
                        }
                    },
                    "404": {
                        description: "User not found",
                        content: {
                            "application/json": {
                                example: {
                                    error: "User not found"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/players/{username}/results": {
            get: {
                tags: ["Players"],
                summary: "Get player's gameplay results (point transfers summary)",
                parameters: [
                    {
                        name: "username",
                        in: "path",
                        required: true,
                        description: "Username of the player",
                        schema: {
                            type: "string"
                        }
                    },
                    {
                        name: "startDate",
                        in: "query",
                        required: false,
                        description: "Start date for filtering transfers (ISO format)",
                        schema: {
                            type: "string",
                            format: "date-time"
                        }
                    },
                    {
                        name: "endDate",
                        in: "query",
                        required: false,
                        description: "End date for filtering transfers (ISO format)",
                        schema: {
                            type: "string",
                            format: "date-time"
                        }
                    }
                ],
                responses: {
                    "200": {
                        description: "Summary of player gameplay results",
                        content: {
                            "application/json": {
                                example: {
                                    username: "player1",
                                    userId: "user-123",
                                    totalPoints: 75,
                                    transferCount: 5,
                                    timeRange: {
                                        start: "2025-04-01T00:00:00.000Z",
                                        end: "2025-04-21T23:59:59.999Z"
                                    },
                                    transfers: [
                                        {
                                            id: "transfer-123",
                                            tableId: "table-123",
                                            fromPlayerId: "user-456",
                                            fromPlayerUsername: "player2",
                                            toPlayerId: "user-123",
                                            toPlayerUsername: "player1",
                                            amount: 50,
                                            timestamp: "2025-04-15T12:00:00.000Z"
                                        },
                                        {
                                            id: "transfer-124",
                                            tableId: "table-123",
                                            fromPlayerId: "user-123",
                                            fromPlayerUsername: "player1",
                                            toPlayerId: "user-789",
                                            toPlayerUsername: "player3",
                                            amount: 25,
                                            timestamp: "2025-04-16T14:30:00.000Z"
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    "404": {
                        description: "User not found",
                        content: {
                            "application/json": {
                                example: {
                                    error: "User not found"
                                }
                            }
                        }
                    }
                }
            }
        },
        "/items": {
            post: {
                tags: ["Items"],
                summary: "Create a new inventory item",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    name: {
                                        type: "string",
                                        description: "Name of the item"
                                    },
                                    description: {
                                        type: "string",
                                        description: "Description of the item"
                                    },
                                    value: {
                                        type: "number",
                                        description: "Value of the item"
                                    }
                                },
                                required: ["name", "value"]
                            }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Item created successfully",
                        content: {
                            "application/json": {
                                example: {
                                    id: "item-123",
                                    name: "Gold Coin",
                                    description: "A shiny gold coin",
                                    value: 100,
                                    createdAt: "2025-04-20T12:00:00.000Z"
                                }
                            }
                        }
                    },
                    "400": {
                        description: "Bad request - missing required fields",
                        content: {
                            "application/json": {
                                example: {
                                    error: "Name and valid value are required"
                                }
                            }
                        }
                    }
                }
            },
            get: {
                tags: ["Items"],
                summary: "Get all inventory items",
                responses: {
                    "200": {
                        description: "List of all inventory items",
                        content: {
                            "application/json": {
                                example: [
                                    {
                                        id: "item-123",
                                        name: "Gold Coin",
                                        description: "A shiny gold coin",
                                        value: 100,
                                        createdAt: "2025-04-20T12:00:00.000Z"
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT"
            }
        }
    }
};
// HTML template for documentation page
export const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Point Tracking System API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui.css" />
    <style>
        body {
            margin: 0;
            padding: 0;
        }
        .swagger-ui .topbar {
            background-color: #0078d7;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            window.ui = SwaggerUIBundle({
                spec: SWAGGER_SPEC,
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout",
                docExpansion: "list",
                defaultModelsExpandDepth: -1
            });
        };
    </script>
</body>
</html>
`;
