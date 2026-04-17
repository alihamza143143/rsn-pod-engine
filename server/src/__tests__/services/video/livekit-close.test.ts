import { jest } from '@jest/globals';

const mockDeleteRoom = jest.fn<() => Promise<void>>();
const mockCreateRoom = jest.fn<(opts: any) => Promise<any>>();

jest.mock('livekit-server-sdk', () => ({
  RoomServiceClient: jest.fn().mockImplementation(() => ({
    deleteRoom: mockDeleteRoom,
    createRoom: mockCreateRoom,
  })),
  AccessToken: jest.fn(),
}));

jest.mock('../../../config', () => {
  const cfg = {
    livekit: { host: 'wss://test.livekit.cloud', apiKey: 'test', apiSecret: 'test' },
  };
  return {
    __esModule: true,
    default: cfg,
    config: cfg,
  };
});

describe('LiveKitProvider.closeRoom', () => {
  let provider: any;
  let logger: any;

  beforeEach(async () => {
    jest.resetModules();
    mockDeleteRoom.mockReset();
    mockCreateRoom.mockReset();

    logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    jest.doMock('../../../config/logger', () => ({ __esModule: true, default: logger }));

    const mod = await import('../../../services/video/livekit.provider');
    provider = new mod.LiveKitProvider();
  });

  it('treats "requested room does not exist" as already-deleted (debug, no throw)', async () => {
    const err: any = new Error('requested room does not exist');
    err.code = 5;
    mockDeleteRoom.mockRejectedValueOnce(err);

    await expect(provider.closeRoom('match-abc-r1-xyz')).resolves.toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'match-abc-r1-xyz' }),
      expect.stringContaining('already deleted')
    );
  });

  it('treats "not found" (legacy string) as already-deleted', async () => {
    mockDeleteRoom.mockRejectedValueOnce(new Error('room not found'));
    await expect(provider.closeRoom('test-room')).resolves.toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('still throws on real errors (e.g. permission denied)', async () => {
    mockDeleteRoom.mockRejectedValueOnce(new Error('permission denied'));
    await expect(provider.closeRoom('test-room')).rejects.toThrow('permission denied');
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('LiveKitProvider.createRoom emptyTimeout', () => {
  let provider: any;

  beforeEach(async () => {
    jest.resetModules();
    mockDeleteRoom.mockReset();
    mockCreateRoom.mockReset();
    mockCreateRoom.mockResolvedValue({ name: 'r', sid: 's', emptyTimeout: 300, maxParticipants: 50 });
    jest.doMock('../../../config/logger', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

    const mod = await import('../../../services/video/livekit.provider');
    provider = new mod.LiveKitProvider();
  });

  it('pins emptyTimeout to 300 seconds on createRoom (default)', async () => {
    const { RoomType } = await import('../../../services/video/video.interface');
    await provider.createRoom('test-room-id', RoomType.ONE_TO_ONE, 'session-abc');
    expect(mockCreateRoom).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'test-room-id', emptyTimeout: 300 })
    );
  });

  it('respects explicit emptyTimeoutSeconds override', async () => {
    const { RoomType } = await import('../../../services/video/video.interface');
    await provider.createRoom('test-room-id', RoomType.ONE_TO_ONE, 'session-abc', 120);
    expect(mockCreateRoom).toHaveBeenCalledWith(
      expect.objectContaining({ emptyTimeout: 120 })
    );
  });
});

describe('video.service wrappers default emptyTimeout', () => {
  beforeEach(() => {
    jest.resetModules();
    mockDeleteRoom.mockReset();
    mockCreateRoom.mockReset();
    mockCreateRoom.mockResolvedValue({ name: 'r', sid: 's', emptyTimeout: 3600, maxParticipants: 500 });
    jest.doMock('../../../config/logger', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
  });

  it('createLobbyRoom defaults emptyTimeout to 3600 seconds (60 min)', async () => {
    const { createLobbyRoom, setVideoProvider } = await import('../../../services/video/video.service');
    const { LiveKitProvider } = await import('../../../services/video/livekit.provider');
    setVideoProvider(new LiveKitProvider());
    await createLobbyRoom('sess-abc');
    expect(mockCreateRoom).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'lobby-sess-abc', emptyTimeout: 3600 })
    );
  });

  it('createMatchRoom defaults emptyTimeout to 300 seconds (5 min)', async () => {
    mockCreateRoom.mockResolvedValue({ name: 'r', sid: 's', emptyTimeout: 300, maxParticipants: 2 });
    const { createMatchRoom, setVideoProvider } = await import('../../../services/video/video.service');
    const { LiveKitProvider } = await import('../../../services/video/livekit.provider');
    setVideoProvider(new LiveKitProvider());
    await createMatchRoom('sess-abc', 1, 'xyz');
    expect(mockCreateRoom).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'match-sess-abc-r1-xyz', emptyTimeout: 300 })
    );
  });

  it('createLobbyRoom respects explicit override', async () => {
    const { createLobbyRoom, setVideoProvider } = await import('../../../services/video/video.service');
    const { LiveKitProvider } = await import('../../../services/video/livekit.provider');
    setVideoProvider(new LiveKitProvider());
    await createLobbyRoom('sess-abc', 1800);
    expect(mockCreateRoom).toHaveBeenCalledWith(
      expect.objectContaining({ emptyTimeout: 1800 })
    );
  });
});
