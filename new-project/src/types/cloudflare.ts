// This file contains type definitions for Cloudflare Workers

export interface CloudflareWebSocket extends WebSocket {
  accept(): void;
}

export interface WebSocketPair {
  0: WebSocket;
  1: CloudflareWebSocket;
}

export interface DurableObjectId {
  toString(): string;
  equals(other: DurableObjectId): boolean;
  name?: string;
}

export interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  idFromString(id: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

export interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

export interface DurableObjectState {
  id: DurableObjectId;
  storage: DurableObjectStorage;
  waitUntil(promise: Promise<any>): void;
}

export interface DurableObjectStorage {
  get(key: string): Promise<any | undefined>;
  get(keys: string[]): Promise<Map<string, any>>;
  put<T>(key: string, value: T): Promise<void>;
  put<T>(entries: Map<string, T> | Record<string, T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  delete(keys: string[]): Promise<number>;
  list(options?: { prefix?: string, limit?: number, cursor?: string, reverse?: boolean }): Promise<{ keys: string[], values: any[], cursor?: string }>;
  deleteAll(): Promise<void>;
  transaction<T>(closure: (txn: DurableObjectTransaction) => Promise<T>): Promise<T>;
}

export interface DurableObjectTransaction {
  get(key: string): Promise<any | undefined>;
  get(keys: string[]): Promise<Map<string, any>>;
  put<T>(key: string, value: T): Promise<void>;
  put<T>(entries: Map<string, T> | Record<string, T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  delete(keys: string[]): Promise<number>;
  list(options?: { prefix?: string, limit?: number, cursor?: string, reverse?: boolean }): Promise<{ keys: string[], values: any[], cursor?: string }>;
  rollback(): void;
}

// Extend the standard ResponseInit interface to include Cloudflare-specific properties
export interface CloudflareResponseInit extends ResponseInit {
  webSocket?: WebSocket;
}

declare global {
  // Add these interfaces to the global scope
  interface WebSocketPair {
    0: WebSocket;
    1: CloudflareWebSocket;
  }
  
  var crypto: Crypto;
  
  var WebSocketPair: {
    new(): WebSocketPair;
  };
}