// ─── Connected-Users Invite Search Tests ─────────────────────────────────────
import { jest } from '@jest/globals';

const mockQuery = jest.fn<any>();
jest.mock('../../../db', () => ({ query: mockQuery }));

describe('searchConnectedUsers', () => {
  beforeEach(() => mockQuery.mockReset());

  it('returns only users with encounter_history rows shared with the requester', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'u1', display_name: 'Alice', email: 'a@e.com', company: null, job_title: null, industry: null, avatar_url: null },
      ],
    });
    const { searchConnectedUsers } = await import('../../../services/invite/connected-users');
    const result = await searchConnectedUsers('me-id', 'ali', 20);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('u1');
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('encounter_history');
    expect(sql).toContain('user_a_id');
    expect(sql).toContain('user_b_id');
    expect(params).toEqual(['me-id', '%ali%', 20]);
  });

  it('returns empty list when requester has no encounter history', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { searchConnectedUsers } = await import('../../../services/invite/connected-users');
    const result = await searchConnectedUsers('me-id', 'xyz', 20);
    expect(result).toEqual([]);
  });

  it('excludes the requester themselves', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { searchConnectedUsers } = await import('../../../services/invite/connected-users');
    await searchConnectedUsers('me-id', 'bob', 20);
    const [sql] = mockQuery.mock.calls[0] as [string];
    expect(sql).toContain('u.id != $1');
  });

  it('trims and lowercases search term for ILIKE match', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { searchConnectedUsers } = await import('../../../services/invite/connected-users');
    await searchConnectedUsers('me-id', '  ALICE  ', 10);
    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params[1]).toBe('%alice%');
    expect(params[2]).toBe(10);
  });
});
