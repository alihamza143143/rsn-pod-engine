// ─── Session State Module ───────────────────────────────────────────────────
// Extracted from orchestration.service.ts — shared state, types, guards,
// and helpers that every orchestration sub-module depends on.

import { Socket } from 'socket.io';
import logger from '../../../config/logger';
import { query } from '../../../db';
import { SessionStatus, SessionConfig } from '@rsn/shared';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ActiveSession {
  sessionId: string;
  hostUserId: string;
  config: SessionConfig;
  currentRound: number;
  status: SessionStatus;
  timer: NodeJS.Timeout | null;
  timerSyncInterval: NodeJS.Timeout | null; // Track 5-second timer sync interval for cleanup
  timerEndsAt: Date | null;
  isPaused: boolean;
  pausedTimeRemaining: number | null;
  presenceMap: Map<string, { lastHeartbeat: Date; socketId: string; reconnectedAt?: Date }>;
  pendingRoundNumber: number | null;  // Round number for pre-generated matches awaiting host confirmation
  manuallyLeftRound: Set<string>;     // Users who clicked "Leave Conversation" — skip in reconnect/reassignment
}

export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  message: string;
  timestamp: string;
  scope: 'lobby' | 'room';
  isHost: boolean;
  roomId?: string; // breakout room ID for room-scope messages
  reactions: Record<string, string[]>; // emoji → userIds
}

// ─── State Stores ───────────────────────────────────────────────────────────

export const activeSessions = new Map<string, ActiveSession>();

/** Track disconnect timeouts so they can be cancelled on reconnect */
export const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

/** Per-session operation lock — prevents concurrent host actions on same session */
export const sessionLocks = new Map<string, Promise<void>>();

export const MAX_CHAT_MESSAGES = 50;
export const chatMessages = new Map<string, ChatMessage[]>(); // sessionId -> messages

// ─── Session Guard ──────────────────────────────────────────────────────────

/** Serialise operations on the same session to prevent race conditions */
export async function withSessionGuard<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  // Wait for any pending operation on this session to finish
  while (sessionLocks.has(sessionId)) {
    await sessionLocks.get(sessionId);
  }
  let resolve: () => void;
  const lock = new Promise<void>(r => { resolve = r; });
  sessionLocks.set(sessionId, lock);
  try {
    return await fn();
  } finally {
    sessionLocks.delete(sessionId);
    resolve!();
  }
}

// ─── Session State Persistence ──────────────────────────────────────────────

export async function persistSessionState(sessionId: string, activeSession: ActiveSession): Promise<void> {
  try {
    const state = {
      status: activeSession.status,
      currentRound: activeSession.currentRound,
      hostUserId: activeSession.hostUserId,
      isPaused: activeSession.isPaused,
      timerEndsAt: activeSession.timerEndsAt?.toISOString() || null,
      pausedTimeRemaining: activeSession.pausedTimeRemaining || null,
    };
    await query(
      `UPDATE sessions SET active_state = $1, active_state_updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(state), sessionId]
    );
  } catch (err) {
    logger.warn({ err, sessionId }, 'Failed to persist session state — non-fatal');
  }
}

export async function clearPersistedState(sessionId: string): Promise<void> {
  try {
    await query(`UPDATE sessions SET active_state = NULL, active_state_updated_at = NULL WHERE id = $1`, [sessionId]);
  } catch { /* non-fatal */ }
}

// ─── Socket Room Helpers ────────────────────────────────────────────────────

export function sessionRoom(sessionId: string): string {
  return `session:${sessionId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function getUserIdFromSocket(socket: Socket): string | null {
  return (socket.data as any)?.userId || null;
}

// ─── Chat Helpers ───────────────────────────────────────────────────────────

/** Get chat messages for a session (returns empty array if none) */
export function getSessionChat(sessionId: string): ChatMessage[] {
  return chatMessages.get(sessionId) || [];
}

/** Add a chat message to a session, enforcing the max message limit */
export function addSessionChat(sessionId: string, message: ChatMessage): void {
  let messages = chatMessages.get(sessionId);
  if (!messages) {
    messages = [];
    chatMessages.set(sessionId, messages);
  }
  messages.push(message);
  // Trim oldest messages when over limit
  if (messages.length > MAX_CHAT_MESSAGES) {
    messages.splice(0, messages.length - MAX_CHAT_MESSAGES);
  }
}

/** Remove all chat messages for a session */
export function cleanupChatMessages(sessionId: string): void {
  chatMessages.delete(sessionId);
}

// ─── Health / Diagnostics ───────────────────────────────────────────────────

/** Number of active sessions currently tracked in memory */
export function getActiveSessionCount(): number {
  return activeSessions.size;
}
