// T0-3 — session-state-snapshot helper
//
// Single source of truth for the "what's the current state of this session?"
// payload, reused by both the new GET /api/sessions/:id/state REST endpoint
// AND the existing session:state socket emit. Tests pin the contract so
// neither path can silently drift from the other.

const mockQuery = jest.fn();
jest.mock('../../../db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  __esModule: true,
}));

jest.mock('../../../config/logger', () => ({
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  __esModule: true,
}));

const mockGetSessionById = jest.fn();
jest.mock('../../../services/session/session.service', () => ({
  getSessionById: (...args: unknown[]) => mockGetSessionById(...args),
  __esModule: true,
}));

import { activeSessions } from '../../../services/orchestration/state/session-state';

const SESSION_ID = '00000000-0000-0000-0000-000000000abc';

import { buildSessionStateSnapshot } from '../../../services/session/session-state-snapshot.service';

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    podId: 'pod-1',
    title: 'Test Session',
    status: 'lobby_open',
    currentRound: 0,
    hostUserId: 'host-1',
    config: {
      numberOfRounds: 5,
      timerVisibility: 'last_10s',
    },
    ...overrides,
  };
}

function makeIo(connectedUsers: Array<{ userId: string; displayName: string }>) {
  return {
    in: () => ({
      fetchSockets: async () => connectedUsers.map(u => ({ data: u })),
    }),
  } as any;
}

describe('T0-3 — buildSessionStateSnapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    activeSessions.clear();
  });

  it('returns null when session does not exist', async () => {
    mockGetSessionById.mockResolvedValue(null);
    const result = await buildSessionStateSnapshot('nope', null);
    expect(result).toBeNull();
  });

  it('falls back to DB session when activeSessions has no entry', async () => {
    mockGetSessionById.mockResolvedValue(makeSession({ status: 'completed', currentRound: 3 }));
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });           // cohosts
    mockQuery.mockResolvedValueOnce({ rows: [{ c: '8' }], rowCount: 1 }); // registered count

    const snapshot = await buildSessionStateSnapshot(SESSION_ID, null);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.sessionStatus).toBe('completed');
    expect(snapshot!.currentRound).toBe(3);
    // No activeSession overlay → no timer info
    expect(snapshot!.timerEndsAt).toBeNull();
    expect(snapshot!.isPaused).toBe(false);
    expect(snapshot!.pendingRoundNumber).toBeNull();
  });

  it('overlays activeSession state when present (timer + paused + pendingRound)', async () => {
    mockGetSessionById.mockResolvedValue(makeSession({ status: 'lobby_open', currentRound: 1 }));
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [{ c: '5' }], rowCount: 1 });

    const ends = new Date(Date.now() + 60_000);
    activeSessions.set(SESSION_ID, {
      sessionId: SESSION_ID,
      hostUserId: 'host-1',
      status: 'round_active' as any,
      currentRound: 2,
      config: { numberOfRounds: 5 } as any,
      timer: null,
      timerSyncInterval: null,
      timerEndsAt: ends,
      isPaused: false,
      pausedTimeRemaining: null,
      presenceMap: new Map(),
      pendingRoundNumber: 3,
      manuallyLeftRound: new Set(),
    });

    const snapshot = await buildSessionStateSnapshot(SESSION_ID, null);

    // activeSession wins over DB on these fields:
    expect(snapshot!.sessionStatus).toBe('round_active');
    expect(snapshot!.currentRound).toBe(2);
    expect(snapshot!.timerEndsAt).toBe(ends.toISOString());
    expect(snapshot!.pendingRoundNumber).toBe(3);
  });

  it('reports pausedTimeRemainingMs when activeSession is paused', async () => {
    mockGetSessionById.mockResolvedValue(makeSession());
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [{ c: '5' }], rowCount: 1 });

    activeSessions.set(SESSION_ID, {
      sessionId: SESSION_ID,
      hostUserId: 'host-1',
      status: 'round_active' as any,
      currentRound: 1,
      config: { numberOfRounds: 5 } as any,
      timer: null,
      timerSyncInterval: null,
      timerEndsAt: null,
      isPaused: true,
      pausedTimeRemaining: 45_000,
      presenceMap: new Map(),
      pendingRoundNumber: null,
      manuallyLeftRound: new Set(),
    });

    const snapshot = await buildSessionStateSnapshot(SESSION_ID, null);
    expect(snapshot!.isPaused).toBe(true);
    expect(snapshot!.pausedTimeRemainingMs).toBe(45_000);
    expect(snapshot!.timerEndsAt).toBeNull();
  });

  it('counts socket presence from io when provided, sets connected/hostInLobby', async () => {
    mockGetSessionById.mockResolvedValue(makeSession({ hostUserId: 'host-1' }));
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [{ c: '5' }], rowCount: 1 });

    const io = makeIo([
      { userId: 'host-1', displayName: 'Host' },
      { userId: 'user-2', displayName: 'User Two' },
      { userId: 'user-3', displayName: 'User Three' },
    ]);

    const snapshot = await buildSessionStateSnapshot(SESSION_ID, io);

    expect(snapshot!.connectedParticipants).toHaveLength(3);
    expect(snapshot!.connectedParticipants[0].userId).toBe('host-1');
    expect(snapshot!.hostInLobby).toBe(true);
    expect(snapshot!.participantCounts.connected).toBe(3);
    expect(snapshot!.participantCounts.registered).toBe(5);
  });

  it('returns hostInLobby=false when host socket is not in the room', async () => {
    mockGetSessionById.mockResolvedValue(makeSession({ hostUserId: 'host-1' }));
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [{ c: '2' }], rowCount: 1 });

    const io = makeIo([
      { userId: 'user-2', displayName: 'User Two' },
    ]);

    const snapshot = await buildSessionStateSnapshot(SESSION_ID, io);
    expect(snapshot!.hostInLobby).toBe(false);
  });

  it('lists co-hosts from session_cohosts table', async () => {
    mockGetSessionById.mockResolvedValue(makeSession());
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 'cohost-1' }, { user_id: 'cohost-2' }], rowCount: 2 })
      .mockResolvedValueOnce({ rows: [{ c: '5' }], rowCount: 1 });

    const snapshot = await buildSessionStateSnapshot(SESSION_ID, null);
    expect(snapshot!.cohosts).toEqual(['cohost-1', 'cohost-2']);
  });

  it('filters registered count for ghost statuses (removed/left/no_show)', async () => {
    mockGetSessionById.mockResolvedValue(makeSession());
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ c: '4' }], rowCount: 1 });

    await buildSessionStateSnapshot(SESSION_ID, null);

    // The query for registered count must filter out ghost statuses
    const countQuery = mockQuery.mock.calls[1][0] as string;
    expect(countQuery).toMatch(/status\s+NOT\s+IN\s*\(\s*'removed'\s*,\s*'left'\s*,\s*'no_show'\s*\)/i);
  });

  it('reads numberOfRounds from session config (string-encoded fallback)', async () => {
    // Some session rows have config stored as a JSON string instead of jsonb
    mockGetSessionById.mockResolvedValue(makeSession({
      config: JSON.stringify({ numberOfRounds: 7, timerVisibility: 'always' }),
    }));
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [{ c: '5' }], rowCount: 1 });

    const snapshot = await buildSessionStateSnapshot(SESSION_ID, null);
    expect(snapshot!.totalRounds).toBe(7);
    expect(snapshot!.timerVisibility).toBe('always');
  });

  it('connected counts default to 0 when io is null (REST callers always pass io)', async () => {
    mockGetSessionById.mockResolvedValue(makeSession());
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ c: '5' }], rowCount: 1 });

    const snapshot = await buildSessionStateSnapshot(SESSION_ID, null);
    expect(snapshot!.connectedParticipants).toEqual([]);
    expect(snapshot!.participantCounts.connected).toBe(0);
    expect(snapshot!.hostInLobby).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Source-pattern test: GET /api/sessions/:id/state route is wired and gated
// ───────────────────────────────────────────────────────────────────────────

describe('T0-3 wiring — GET /api/sessions/:id/state', () => {
  it('routes/sessions.ts registers the /state endpoint', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../../routes/sessions.ts'),
      'utf8',
    );
    expect(src).toMatch(/router\.get\(\s*['"]\/:id\/state['"]/);
  });

  it('endpoint is gated by authenticate + canViewSession', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../../routes/sessions.ts'),
      'utf8',
    );
    const stateIdx = src.indexOf("'/:id/state'");
    const block = src.slice(stateIdx, stateIdx + 1500);
    expect(block).toMatch(/authenticate/);
    expect(block).toMatch(/canViewSession/);
  });

  it('endpoint reads io from req.app.get and calls buildSessionStateSnapshot', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../../routes/sessions.ts'),
      'utf8',
    );
    const stateIdx = src.indexOf("'/:id/state'");
    const block = src.slice(stateIdx, stateIdx + 1500);
    expect(block).toMatch(/req\.app\.get\(['"]io['"]\)/);
    expect(block).toMatch(/buildSessionStateSnapshot/);
  });

  it('index.ts sets io on the express app via app.set("io", io)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../../../index.ts'),
      'utf8',
    );
    expect(src).toMatch(/app\.set\(['"]io['"]\s*,\s*io\)/);
  });
});
