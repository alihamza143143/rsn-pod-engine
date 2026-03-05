// ─── Mock Video Provider ─────────────────────────────────────────────────────
// Drop-in replacement for LiveKitProvider when no LiveKit credentials are
// available. Used for local development and testing. All operations succeed
// and log to console rather than calling an external service.

import { RoomType, VideoRoom, VideoToken, VideoParticipant } from '@rsn/shared';
import { IVideoProvider } from './video.interface';
import logger from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';

interface MockRoom {
  roomId: string;
  type: RoomType;
  sessionId: string;
  participants: Map<string, { displayName: string; joinedAt: Date }>;
  createdAt: Date;
}

export class MockVideoProvider implements IVideoProvider {
  private rooms = new Map<string, MockRoom>();

  async createRoom(roomId: string, type: RoomType, sessionId: string): Promise<VideoRoom> {
    const room: MockRoom = {
      roomId,
      type,
      sessionId,
      participants: new Map(),
      createdAt: new Date(),
    };
    this.rooms.set(roomId, room);
    logger.info({ roomId, type, sessionId }, '[MockVideo] Room created');

    return {
      roomId,
      type,
      sessionId,
      participantCount: 0,
      createdAt: room.createdAt,
    };
  }

  async closeRoom(roomId: string): Promise<void> {
    if (!this.rooms.has(roomId)) {
      logger.warn({ roomId }, '[MockVideo] Room already closed or never existed');
      return;
    }
    this.rooms.delete(roomId);
    logger.info({ roomId }, '[MockVideo] Room closed');
  }

  async issueJoinToken(userId: string, roomId: string, displayName: string): Promise<VideoToken> {
    // Track participant in mock room
    const room = this.rooms.get(roomId);
    if (room) {
      room.participants.set(userId, { displayName, joinedAt: new Date() });
    }

    const token = `mock-token-${uuidv4()}`;
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    logger.debug({ userId, roomId, displayName }, '[MockVideo] Join token issued');

    return { token, roomId, userId, expiresAt };
  }

  async moveParticipant(userId: string, fromRoomId: string, toRoomId: string): Promise<void> {
    const fromRoom = this.rooms.get(fromRoomId);
    if (fromRoom) {
      fromRoom.participants.delete(userId);
    }

    const toRoom = this.rooms.get(toRoomId);
    if (toRoom) {
      toRoom.participants.set(userId, { displayName: userId, joinedAt: new Date() });
    }

    logger.info({ userId, fromRoomId, toRoomId }, '[MockVideo] Participant moved');
  }

  async listParticipants(roomId: string): Promise<VideoParticipant[]> {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.participants.entries()).map(([userId, info]) => ({
      userId,
      roomId,
      joinedAt: info.joinedAt,
      isConnected: true,
    }));
  }

  async roomExists(roomId: string): Promise<boolean> {
    return this.rooms.has(roomId);
  }
}
