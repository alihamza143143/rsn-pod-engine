// ─── Pod Access Control Tests ────────────────────────────────────────────────
// Unit tests for canViewPod() — enforces read-access gate on pod detail.

import { jest } from '@jest/globals';

const mockQuery = jest.fn<any>();
jest.mock('../../../db', () => ({ query: mockQuery }));

describe('canViewPod', () => {
  beforeEach(() => mockQuery.mockReset());

  it('grants access to admin regardless of visibility', async () => {
    const { canViewPod } = await import('../../../services/pods/pod-access');
    const result = await canViewPod('admin-id', 'pod-1', 'admin');
    expect(result).toBe(true);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('grants access to super_admin', async () => {
    const { canViewPod } = await import('../../../services/pods/pod-access');
    const result = await canViewPod('sa-id', 'pod-1', 'super_admin');
    expect(result).toBe(true);
  });

  it('grants access to pod members regardless of visibility', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ visibility: 'private' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'member' }] });
    const { canViewPod } = await import('../../../services/pods/pod-access');
    const result = await canViewPod('me', 'pod-1', 'member');
    expect(result).toBe(true);
  });

  it('grants access to non-member for public pods', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ visibility: 'public' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { canViewPod } = await import('../../../services/pods/pod-access');
    const result = await canViewPod('me', 'pod-1', 'member');
    expect(result).toBe(true);
  });

  it('grants access to non-member for public_with_approval pods', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ visibility: 'public_with_approval' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { canViewPod } = await import('../../../services/pods/pod-access');
    const result = await canViewPod('me', 'pod-1', 'member');
    expect(result).toBe(true);
  });

  it('grants access to non-member for request_to_join pods', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ visibility: 'request_to_join' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { canViewPod } = await import('../../../services/pods/pod-access');
    const result = await canViewPod('me', 'pod-1', 'member');
    expect(result).toBe(true);
  });

  it('grants access to non-member for invite_only pods (visible but join-gated)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ visibility: 'invite_only' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { canViewPod } = await import('../../../services/pods/pod-access');
    const result = await canViewPod('me', 'pod-1', 'member');
    expect(result).toBe(true);
  });

  it('denies access to non-member for private pods', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ visibility: 'private' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { canViewPod } = await import('../../../services/pods/pod-access');
    const result = await canViewPod('me', 'pod-1', 'member');
    expect(result).toBe(false);
  });

  it('returns false for non-existent pod', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const { canViewPod } = await import('../../../services/pods/pod-access');
    const result = await canViewPod('me', 'missing', 'member');
    expect(result).toBe(false);
  });
});
