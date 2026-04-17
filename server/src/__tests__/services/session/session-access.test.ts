// ─── Session Access Control Tests ────────────────────────────────────────────
// Unit tests for canViewSession() — enforces read-access gate on session detail.

import { jest } from '@jest/globals';

const mockQuery = jest.fn<any>();
jest.mock('../../../db', () => ({ query: mockQuery }));

describe('canViewSession', () => {
  beforeEach(() => mockQuery.mockReset());

  it('grants access to admin regardless of pod membership', async () => {
    const { canViewSession } = await import('../../../services/session/session-access');
    const result = await canViewSession('admin-id', 'sess-1', 'admin');
    expect(result).toBe(true);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('grants access to super_admin', async () => {
    const { canViewSession } = await import('../../../services/session/session-access');
    const result = await canViewSession('sa-id', 'sess-1', 'super_admin');
    expect(result).toBe(true);
  });

  it('grants access to the session host', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ host_user_id: 'me', pod_id: 'pod-1', pod_visibility: 'invite_only' }],
    });
    const { canViewSession } = await import('../../../services/session/session-access');
    const result = await canViewSession('me', 'sess-1', 'member');
    expect(result).toBe(true);
  });

  it('grants access to a registered participant', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ host_user_id: 'other', pod_id: 'pod-1', pod_visibility: 'invite_only' }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'registered' }] });
    const { canViewSession } = await import('../../../services/session/session-access');
    const result = await canViewSession('me', 'sess-1', 'member');
    expect(result).toBe(true);
  });

  it('denies access to a removed participant', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ host_user_id: 'other', pod_id: 'pod-1', pod_visibility: 'invite_only' }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'removed' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // no pod membership
    const { canViewSession } = await import('../../../services/session/session-access');
    const result = await canViewSession('me', 'sess-1', 'member');
    expect(result).toBe(false);
  });

  it('grants access to pod members of invite_only pods', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ host_user_id: 'other', pod_id: 'pod-1', pod_visibility: 'invite_only' }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // not registered
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'member' }] }); // pod member
    const { canViewSession } = await import('../../../services/session/session-access');
    const result = await canViewSession('me', 'sess-1', 'member');
    expect(result).toBe(true);
  });

  it('grants access to any authenticated user for public pod', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ host_user_id: 'other', pod_id: 'pod-1', pod_visibility: 'public' }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // not registered
    mockQuery.mockResolvedValueOnce({ rows: [] }); // not pod member
    const { canViewSession } = await import('../../../services/session/session-access');
    const result = await canViewSession('me', 'sess-1', 'member');
    expect(result).toBe(true);
  });

  it('denies access to non-member of private pod', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ host_user_id: 'other', pod_id: 'pod-1', pod_visibility: 'private' }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { canViewSession } = await import('../../../services/session/session-access');
    const result = await canViewSession('me', 'sess-1', 'member');
    expect(result).toBe(false);
  });

  it('returns false for a non-existent session', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { canViewSession } = await import('../../../services/session/session-access');
    const result = await canViewSession('me', 'missing', 'member');
    expect(result).toBe(false);
  });
});
