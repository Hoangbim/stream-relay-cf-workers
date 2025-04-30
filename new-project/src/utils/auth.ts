/**
 * Authentication utilities for handling passwords and JWTs
 */

import { JwtPayload } from '../types/auth';

// Simple password hashing function (in a real app, use bcrypt)
export async function hashPassword(password: string): Promise<string> {
  // For demo purposes, we'll do a simple hash
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Simple password comparison
export async function comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  const hashedPlainPassword = await hashPassword(plainPassword);
  return hashedPlainPassword === hashedPassword;
}

// Generate a JWT token
export async function generateToken(userId: string, username: string, secret: string): Promise<string> {
  // Create the JWT payload
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: userId,
    username: username,
    userId: userId, // Include userId for auth checks
    iat: now,
    exp: now + (60 * 60 * 24) // 24 hour expiration
  };
  
  // Encode the header and payload
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  // Create the signature
  const encoder = new TextEncoder();
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}.${secret}`);
  const signatureBuffer = await crypto.subtle.digest('SHA-256', data);
  const signature = new Uint8Array(signatureBuffer);
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  // Return the complete token
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

// Verify a JWT token
export async function verifyToken(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    // Split the token
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    
    // Verify the signature
    const encoder = new TextEncoder();
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}.${secret}`);
    const signatureBuffer = await crypto.subtle.digest('SHA-256', data);
    const expectedEncodedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    
    if (encodedSignature !== expectedEncodedSignature) {
      return null;
    }
    
    // Decode and parse the payload
    const payload = JSON.parse(atob(encodedPayload)) as JwtPayload;
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Token expired
    }
    
    return payload;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}