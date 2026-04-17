// Tests for Task 14 — bulk manual breakout room handlers.
//
// Covers:
//   - Handler exports
//   - Migration 039 shape
//   - Socket registration in orchestration.service
//   - Non-host guard rejects
//   - Core behaviors with mocked dependencies

const mockQuery = jest.fn();
jest.mock('../../../db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: jest.fn(),
  __esModule: true,
}));

jest.mock('../../../config/logger', () => ({
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  __esModule: true,
}));

const mockGetSessionById = jest.fn();
const mockUpdateParticipantStatus = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../services/session/session.service', () => ({
  getSessionById: (...args: unknown[]) => mockGetSessionById(...args),
  updateParticipantStatus: (...args: unknown[]) => mockUpdateParticipantStatus(...args),
  __esModule: true,
}));

const mockCreateMatchRoom = jest.fn().mockResolvedValue(undefined);
const mockMatchRoomId = jest.fn((sid: string, rn: number, slug: string) => `${sid}-r${rn}-${slug}`);
const mockIssueJoinToken = jest.fn().mockResolvedValue({ token: 'tok', url: 'wss://test' });
const mockGetVideoProvider = jest.fn(() => ({ closeRoom: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../../services/video/video.service', () => ({
  createMatchRoom: (...args: unknown[]) => mockCreateMatchRoom(...args),
  matchRoomId: (...args: unknown[]) => mockMatchRoomId(...(args as [string, number, string])),
  issueJoinToken: (...args: unknown[]) => mockIssueJoinToken(...args),
  getVideoProvider: () => mockGetVideoProvider(),
  __esModule: true,
}));

jest.mock('../../../config', () => ({
  config: { livekit: { host: 'wss://test-livekit' } },
  __esModule: true,
}));

describe('Task 14 — bulk manual breakout handlers', () => {
  describe('migration 039 — timer_visibility column', () => {
    it('migration file exists and adds timer_visibility column with CHECK constraint', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const sql = fs.readFileSync(
        path.join(__dirname, '../../../db/migrations/039_breakout_timer_visibility.sql'),
        'utf8',
      );
      expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS timer_visibility/);
      expect(sql).toMatch(/DEFAULT 'visible'/);
      expect(sql).toMatch(/CHECK \(timer_visibility IN \('visible', 'hidden'\)\)/);
    });
  });

  describe('handler exports', () => {
    it('exports all 4 bulk handlers', async () => {
      const mod: any = await import('../../../services/orchestration/handlers/breakout-bulk');
      expect(typeof mod.handleHostCreateBreakoutBulk).toBe('function');
      expect(typeof mod.handleHostExtendBreakoutAll).toBe('function');
      expect(typeof mod.handleHostEndBreakoutAll).toBe('function');
      expect(typeof mod.handleHostSetBreakoutDurationAll).toBe('function');
      expect(typeof mod.injectBreakoutBulkDeps).toBe('function');
    });
  });

  describe('socket event registration in orchestration.service', () => {
    it('registers all 4 bulk socket events', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.join(__dirname, '../../../services/orchestration/orchestration.service.ts'),
        'utf8',
      );
      expect(content).toMatch(/host:create_breakout_bulk/);
      expect(content).toMatch(/host:extend_breakout_all/);
      expect(content).toMatch(/host:end_breakout_all/);
      expect(content).toMatch(/host:set_breakout_duration_all/);
      // Each event must be registered via wrapHandler (error-guarded)
      expect(content).toMatch(/wrapHandler\('host:create_breakout_bulk'/);
      expect(content).toMatch(/wrapHandler\('host:extend_breakout_all'/);
      expect(content).toMatch(/wrapHandler\('host:end_breakout_all'/);
      expect(content).toMatch(/wrapHandler\('host:set_breakout_duration_all'/);
    });
  });

  describe('functional — non-host guard rejects', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Default: query returns empty rows (no cohosts, no manual rooms)
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    });

    it('handleHostCreateBreakoutBulk rejects non-host with UNAUTHORIZED/FORBIDDEN emit', async () => {
      const mod: any = await import('../../../services/orchestration/handlers/breakout-bulk');
      mockGetSessionById.mockResolvedValue({
        id: 'sess-1', hostUserId: 'real-host',
      });

      const emits: Array<{ event: string; payload: any }> = [];
      const socket: any = {
        data: { userId: 'imposter', role: 'user' },
        emit: (event: string, payload: any) => emits.push({ event, payload }),
      };

      const io: any = {
        to: () => ({ emit: jest.fn() }),
      };

      await mod.handleHostCreateBreakoutBulk(io, socket, {
        sessionId: 'sess-1',
        rooms: [{ participantIds: ['u1'] }],
        sharedDurationSeconds: 300,
        timerVisibility: 'visible',
      });

      // Should emit an error (UNAUTHORIZED or FORBIDDEN from verifyHost)
      const errorEmits = emits.filter(e => e.event === 'error');
      expect(errorEmits.length).toBeGreaterThan(0);
      expect(errorEmits[0].payload.code).toMatch(/UNAUTHORIZED|FORBIDDEN/);

      // No match was created
      expect(mockCreateMatchRoom).not.toHaveBeenCalled();
    });

    it('handleHostExtendBreakoutAll rejects non-host', async () => {
      const mod: any = await import('../../../services/orchestration/handlers/breakout-bulk');
      mockGetSessionById.mockResolvedValue({
        id: 'sess-1', hostUserId: 'real-host',
      });

      const emits: Array<{ event: string; payload: any }> = [];
      const socket: any = {
        data: { userId: 'imposter', role: 'user' },
        emit: (event: string, payload: any) => emits.push({ event, payload }),
      };

      const io: any = { to: () => ({ emit: jest.fn() }) };

      await mod.handleHostExtendBreakoutAll(io, socket, {
        sessionId: 'sess-1', additionalSeconds: 120,
      });

      expect(emits.some(e => e.event === 'error')).toBe(true);
    });

    it('handleHostEndBreakoutAll rejects non-host', async () => {
      const mod: any = await import('../../../services/orchestration/handlers/breakout-bulk');
      mockGetSessionById.mockResolvedValue({
        id: 'sess-1', hostUserId: 'real-host',
      });

      const emits: Array<{ event: string; payload: any }> = [];
      const socket: any = {
        data: { userId: 'imposter', role: 'user' },
        emit: (event: string, payload: any) => emits.push({ event, payload }),
      };

      const io: any = { to: () => ({ emit: jest.fn() }) };

      await mod.handleHostEndBreakoutAll(io, socket, { sessionId: 'sess-1' });

      expect(emits.some(e => e.event === 'error')).toBe(true);
      // No match UPDATE or SELECT for active-manual-rooms fired
      const updateCalls = mockQuery.mock.calls.filter(args =>
        /UPDATE matches|SELECT .* FROM matches/i.test(String(args[0])),
      );
      expect(updateCalls.length).toBe(0);
    });

    it('handleHostSetBreakoutDurationAll rejects non-host', async () => {
      const mod: any = await import('../../../services/orchestration/handlers/breakout-bulk');
      mockGetSessionById.mockResolvedValue({
        id: 'sess-1', hostUserId: 'real-host',
      });

      const emits: Array<{ event: string; payload: any }> = [];
      const socket: any = {
        data: { userId: 'imposter', role: 'user' },
        emit: (event: string, payload: any) => emits.push({ event, payload }),
      };

      const io: any = { to: () => ({ emit: jest.fn() }) };

      await mod.handleHostSetBreakoutDurationAll(io, socket, {
        sessionId: 'sess-1', durationSeconds: 600,
      });

      expect(emits.some(e => e.event === 'error')).toBe(true);
    });
  });

  describe('functional — validation errors', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    });

    it('rejects bulk create with empty rooms array', async () => {
      const mod: any = await import('../../../services/orchestration/handlers/breakout-bulk');
      mockGetSessionById.mockResolvedValue({ id: 'sess-1', hostUserId: 'host-1' });

      const emits: Array<{ event: string; payload: any }> = [];
      const socket: any = {
        data: { userId: 'host-1', role: 'user' },
        emit: (event: string, payload: any) => emits.push({ event, payload }),
      };
      const io: any = { to: () => ({ emit: jest.fn() }) };

      await mod.handleHostCreateBreakoutBulk(io, socket, {
        sessionId: 'sess-1', rooms: [], sharedDurationSeconds: 300,
      });

      const errs = emits.filter(e => e.event === 'error');
      expect(errs.some(e => /required|at least/i.test(e.payload.message))).toBe(true);
    });

    it('rejects bulk create when a participant appears in two rooms', async () => {
      const mod: any = await import('../../../services/orchestration/handlers/breakout-bulk');
      mockGetSessionById.mockResolvedValue({ id: 'sess-1', hostUserId: 'host-1' });

      const emits: Array<{ event: string; payload: any }> = [];
      const socket: any = {
        data: { userId: 'host-1', role: 'user' },
        emit: (event: string, payload: any) => emits.push({ event, payload }),
      };
      const io: any = { to: () => ({ emit: jest.fn() }) };

      await mod.handleHostCreateBreakoutBulk(io, socket, {
        sessionId: 'sess-1',
        rooms: [
          { participantIds: ['u1', 'u2'] },
          { participantIds: ['u2', 'u3'] }, // u2 duplicated
        ],
        sharedDurationSeconds: 300,
      });

      const errs = emits.filter(e => e.event === 'error');
      expect(errs.some(e => /two bulk rooms/i.test(e.payload.message))).toBe(true);
    });
  });

  describe('preservation — Change 4.5 + 4.6 behaviors', () => {
    it('uses timer_visibility column when inserting match (migration 039)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.join(__dirname, '../../../services/orchestration/handlers/breakout-bulk.ts'),
        'utf8',
      );
      expect(content).toMatch(/timer_visibility/);
      // INSERT statement writes timer_visibility
      expect(content).toMatch(/INSERT INTO matches[\s\S]*timer_visibility/);
    });

    it('uses status=completed on bulk end (Change 4.6 semantics)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.join(__dirname, '../../../services/orchestration/handlers/breakout-bulk.ts'),
        'utf8',
      );
      // Bulk end writes completed, never no_show
      expect(content).toMatch(/status\s*=\s*'completed'/);
      expect(content).not.toMatch(/status\s*=\s*'no_show'/);
    });

    it('reuses clearRoomTimers + roomTimers map (Change 4.5 ghost-timer fix)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.join(__dirname, '../../../services/orchestration/handlers/breakout-bulk.ts'),
        'utf8',
      );
      // Shares state + uses clearRoomTimers
      expect(content).toMatch(/clearRoomTimers/);
      expect(content).toMatch(/roomTimers,\s*roomSyncIntervals/);
    });

    it('only targets MANUAL rooms — roomId LIKE %host-%', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.join(__dirname, '../../../services/orchestration/handlers/breakout-bulk.ts'),
        'utf8',
      );
      expect(content).toMatch(/room_id\s+LIKE\s+'%host-%'/);
    });

    it('host-actions still exports roomTimers/roomSyncIntervals/RoomTimerState for bulk module', async () => {
      const mod: any = await import('../../../services/orchestration/handlers/host-actions');
      expect(mod.roomTimers).toBeInstanceOf(Map);
      expect(mod.roomSyncIntervals).toBeInstanceOf(Map);
      expect(typeof mod.clearRoomTimers).toBe('function');
    });
  });

  describe('match:reassigned payload includes timerVisibility', () => {
    it('source emits timerVisibility in match:reassigned payload', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const content = fs.readFileSync(
        path.join(__dirname, '../../../services/orchestration/handlers/breakout-bulk.ts'),
        'utf8',
      );
      // match:reassigned emit must include timerVisibility
      expect(content).toMatch(/match:reassigned[\s\S]{0,800}timerVisibility/);
    });
  });
});
