// Types for user and authentication
import { DurableObjectNamespace } from './cloudflare';

export interface User {
  id: string;
  username: string;
  password: string; // This should be a hashed password, not plaintext
  createdAt: string;
}

export interface JwtPayload {
  sub: string; // User ID
  username: string;
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  userId?: string; // Added userId field to the JWT payload for auth checks
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
  };
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// Extend the existing Env interface
export interface Env {
  DATA_STORE: DurableObjectNamespace;
  JWT_SECRET: string;
}

// Add ExecutionContext interface for Cloudflare Workers
export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// Game Tables Related Types
export interface GameTable {
  id: string;
  name: string;
  createdAt: string;
  creatorId: string;
  players: Player[];
}

export interface Player {
  id: string;
  username: string;
  points: number;
  joinedAt: string;
}

export interface TransferRequest {
  amount: number;
  toPlayerId: string;
}

export interface TransferHistory {
  id: string;
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  amount: number;
  timestamp: string;
  tableId: string;
}

// Point transfer related types
export interface PointTransfer {
  id: string;
  tableId: string;
  fromPlayerId: string;
  fromPlayerUsername: string;
  toPlayerId: string;
  toPlayerUsername: string;
  amount: number;
  timestamp: string;
}

// Inventory related types
export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  value: number;
  createdAt: string;
}